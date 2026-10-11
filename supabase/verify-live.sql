-- OurLife: checks the live database. Read-only. Every line should say ok = true.
with checks as (
  select 'exists: ' || n as pruefung,
         exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = n) as ok
    from unnest(array['create_space','join_space','remove_member','rotate_pair_code','leave_space',
                      'rate_check','limit_writes','cap_rows','allow_photo_upload','is_space_member']) as n
  union all
  select 'anon cannot run: ' || proname,
         not has_function_privilege('anon', oid, 'execute') as ok
    from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('create_space','join_space','remove_member','rotate_pair_code','leave_space',
                     'rate_check','limit_writes','cap_rows','allow_photo_upload','is_space_member')
  union all
  select 'exactly one version of: ' || proname, count(*) = 1
    from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('create_space','join_space','remove_member','rotate_pair_code','leave_space')
   group by proname
  union all
  select 'signed-in users cannot run rate_check directly',
         coalesce(not has_function_privilege('authenticated', to_regprocedure('public.rate_check(text,integer,integer)'), 'execute'), false)
  union all
  select 'remove_member returns the new code (text)',
         (select pg_get_function_result(oid) = 'text' from pg_proc
           where pronamespace = 'public'::regnamespace and proname = 'remove_member')
  union all
  select 'rate_events cannot be touched by app users',
         coalesce(not has_table_privilege('authenticated', to_regclass('public.rate_events'), 'select')
                  and not has_table_privilege('authenticated', to_regclass('public.rate_events'), 'insert')
                  and not has_table_privilege('anon', to_regclass('public.rate_events'), 'select'), false)
  union all
  select 'anon has no table rights in public',
         not exists (select 1 from information_schema.role_table_grants
                      where table_schema = 'public' and grantee = 'anon')
  union all
  select 'app users cannot truncate / trigger / reference',
         not exists (select 1 from information_schema.role_table_grants
                      where table_schema = 'public' and grantee = 'authenticated'
                        and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')
                        and table_name in ('spaces','space_members','day_items','goals'))
  union all
  select 'changeable columns are only spaces.name, spaces.start_date, space_members.nickname',
         coalesce((select array_agg(table_name || '.' || column_name order by table_name, column_name)
                     from information_schema.column_privileges
                    where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'UPDATE'
                      and table_name in ('spaces','space_members')), '{}')
         = array['space_members.nickname','spaces.name','spaces.start_date']
  union all
  select 'limit and cap triggers exist (4 of 4)',
         (select count(*) from pg_trigger
           where not tgisinternal
             and tgname in ('limit_writes_items','limit_writes_goals','cap_rows_items','cap_rows_goals')) = 4
  union all
  select 'member limit trigger exists',
         exists (select 1 from pg_trigger where tgname = 'cap_members' and not tgisinternal)
  union all
  select 'no way to add / delete members directly (no INSERT / DELETE policy)',
         not exists (select 1 from pg_policies
                      where schemaname = 'public' and tablename in ('space_members','spaces')
                        and cmd in ('INSERT','DELETE','ALL'))
  union all
  select 'photo policies only for signed-in users',
         (select count(*) from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and policyname like 'members %photos'
             and roles = '{authenticated}') = 3
  union all
  select 'no other storage policy for everyone',
         not exists (select 1 from pg_policies
                      where schemaname = 'storage' and tablename = 'objects'
                        and policyname not like 'members %photos')
  union all
  select 'photo bucket: private, 10 MB, jpeg/png/webp/heic/gif',
         exists (select 1 from storage.buckets
                  where id = 'photos' and public = false and file_size_limit = 10485760
                    and allowed_mime_types @> array['image/jpeg','image/png','image/webp','image/heic','image/gif']
                    and cardinality(allowed_mime_types) = 5)
  union all
  select 'space_members linked to users (cascade)',
         exists (select 1 from pg_constraint where conname = 'space_members_user_fk')
  union all
  select 'name / date / nickname checks exist',
         (select count(*) from pg_constraint
           where conname in ('spaces_name_not_blank','spaces_start_date_range','space_members_nickname_clean')) = 3
  union all
  select 'row security on in all tables',
         not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)
)
select ok, pruefung as check_name from checks order by ok, pruefung;
