-- OurLife migration 004: security hardening after the review of 2026-10-11.
--   * rate limiter: normal use is never noticed, abuse is slowed down a lot
--   * size caps per space (items, goals, photos)
--   * remove_member now also makes a new pairing code (a removed person cannot rejoin)
--   * leave_space(): leave on your own; the last person leaving deletes the space
--   * smaller fixes: mutual-removal race, join_space error handling, input checks,
--     narrower table rights, storage policies for signed-in users only
-- Run once in the Supabase SQL editor (after migration 002 and 003). Safe to run twice.

-- ---------------------------------------------------------------- rate limiter
-- Counts calls per key and minute. Only the functions below touch this table.

create table if not exists public.rate_events (
  rate_key  text        not null,
  minute    timestamptz not null,
  hits      integer     not null default 0,
  primary key (rate_key, minute)
);
alter table public.rate_events enable row level security;   -- no policy: nobody can read or write it directly
revoke all on public.rate_events from anon, authenticated;

-- Raises an error when the key was used more than p_per_minute times this minute
-- or more than p_per_hour times in the last 60 minutes.
create or replace function public.rate_check(p_key text, p_per_minute integer, p_per_hour integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  minute_hits integer;
  hour_hits   bigint;
begin
  insert into public.rate_events (rate_key, minute, hits)
    values (p_key, date_trunc('minute', now()), 1)
    on conflict (rate_key, minute) do update set hits = public.rate_events.hits + 1
    returning hits into minute_hits;
  if minute_hits > p_per_minute then
    raise exception 'Too many requests. Please wait a minute and try again.';
  end if;
  select coalesce(sum(hits), 0) into hour_hits from public.rate_events
    where rate_key = p_key and minute > now() - interval '1 hour';
  if hour_hits > p_per_hour then
    raise exception 'Too many requests. Please try again later.';
  end if;
  if random() < 0.02 then   -- tidy up now and then
    delete from public.rate_events where minute < now() - interval '2 hours';
  end if;
end;
$$;
revoke all on function public.rate_check(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------- limits on writing pages and goals
-- Per person: 300 item writes a minute / 3000 an hour, 30 goal writes a minute / 300 an hour.
-- Per space: at most 5000 items and 200 goals.

create or replace function public.limit_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;   -- the SQL editor / maintenance
  end if;
  if tg_table_name = 'day_items' then
    perform public.rate_check('items:' || auth.uid()::text, 300, 3000);
  else
    perform public.rate_check('goals:' || auth.uid()::text, 30, 300);
  end if;
  return new;
end;
$$;

create or replace function public.cap_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'day_items' then
    if (select count(*) from public.day_items where space_id = new.space_id) >= 5000 then
      raise exception 'This space has reached its limit of 5000 items.';
    end if;
  else
    if (select count(*) from public.goals where space_id = new.space_id) >= 200 then
      raise exception 'This space has reached its limit of 200 goals.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.limit_writes() from public, anon, authenticated;
revoke all on function public.cap_rows()     from public, anon, authenticated;

drop trigger if exists limit_writes_items on public.day_items;
create trigger limit_writes_items before insert or update on public.day_items
  for each row execute function public.limit_writes();
drop trigger if exists limit_writes_goals on public.goals;
create trigger limit_writes_goals before insert or update on public.goals
  for each row execute function public.limit_writes();
drop trigger if exists cap_rows_items on public.day_items;
create trigger cap_rows_items before insert on public.day_items
  for each row execute function public.cap_rows();
drop trigger if exists cap_rows_goals on public.goals;
create trigger cap_rows_goals before insert on public.goals
  for each row execute function public.cap_rows();

-- ---------------------------------------------------------------- photos: limits and signed-in users only
-- Per person: 10 uploads a minute / 60 an hour. Per space: at most 400 photos.

create or replace function public.allow_photo_upload(object_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_space uuid := public.photo_space(object_name);
begin
  if target_space is null or not public.is_space_member(target_space) then
    return false;
  end if;
  perform public.rate_check('photo:' || auth.uid()::text, 10, 60);
  if (select count(*) from storage.objects
        where bucket_id = 'photos' and name like target_space::text || '/%') >= 400 then
    raise exception 'This space has reached its limit of 400 photos.';
  end if;
  return true;
end;
$$;
revoke all on function public.allow_photo_upload(text) from public, anon;
grant execute on function public.allow_photo_upload(text) to authenticated;

drop policy if exists "members read photos"   on storage.objects;
drop policy if exists "members add photos"    on storage.objects;
drop policy if exists "members delete photos" on storage.objects;
create policy "members read photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.is_space_member(public.photo_space(name)));
create policy "members add photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.allow_photo_upload(name));
create policy "members delete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_space_member(public.photo_space(name)));

-- ---------------------------------------------------------------- input checks and rights

alter table public.spaces drop constraint if exists spaces_name_not_blank;
alter table public.spaces add constraint spaces_name_not_blank check (length(trim(name)) > 0);
alter table public.spaces drop constraint if exists spaces_start_date_range;
alter table public.spaces add constraint spaces_start_date_range
  check (start_date between date '2000-01-01' and date '2100-01-01');
alter table public.space_members drop constraint if exists space_members_nickname_clean;
alter table public.space_members add constraint space_members_nickname_clean check (nickname !~ '[[:cntrl:]]');

-- A member row disappears together with its (anonymous) user. NOT VALID: only checks new rows.
alter table public.space_members drop constraint if exists space_members_user_fk;
alter table public.space_members add constraint space_members_user_fk
  foreign key (user_id) references auth.users (id) on delete cascade not valid;

revoke truncate, trigger, references on public.spaces, public.space_members, public.day_items, public.goals
  from authenticated, anon;
revoke all on function public.photo_space(text) from public, anon;
grant execute on function public.photo_space(text) to authenticated;
revoke all on function public.cap_members()   from public, anon, authenticated;
revoke all on function public.lock_space_id() from public, anon, authenticated;

-- ---------------------------------------------------------------- pairing and admin functions

create or replace function public.create_space(start_date date, space_name text, member_name text)
returns table (space_id uuid, pair_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_space public.spaces;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  perform public.rate_check('create:' || auth.uid()::text, 2, 5);   -- per person
  perform public.rate_check('create:everyone', 10, 60);             -- all people together
  if exists (select 1 from public.space_members where user_id = auth.uid()) then
    raise exception 'This phone is already in a space';
  end if;
  insert into public.spaces (start_date, name)
    values (create_space.start_date,
            coalesce(nullif(trim(regexp_replace(space_name, '[[:cntrl:]]', '', 'g')), ''), 'Our space'))
    returning * into new_space;
  insert into public.space_members (space_id, user_id, nickname)
    values (new_space.id, auth.uid(),
            left(trim(regexp_replace(coalesce(member_name, ''), '[[:cntrl:]]', '', 'g')), 40));
  return query select new_space.id, new_space.pair_code;
end;
$$;

create or replace function public.join_space(code text, member_name text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_space uuid;
  own_space uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  perform public.rate_check('join:' || auth.uid()::text, 10, 30);
  select id into found_space from public.spaces
    where pair_code = lower(trim(code)) for update;  -- serialises joins per space
  if found_space is null then
    return null;
  end if;
  select space_id into own_space from public.space_members where user_id = auth.uid();
  if own_space is not null then
    return case when own_space = found_space then found_space else null end;
  end if;
  if (select count(*) from public.space_members where space_id = found_space) >= 20 then
    return null;  -- full (same answer as a wrong code)
  end if;
  begin
    insert into public.space_members (space_id, user_id, nickname)
      values (found_space, auth.uid(),
              left(trim(regexp_replace(coalesce(member_name, ''), '[[:cntrl:]]', '', 'g')), 40));
  exception when unique_violation then
    return null;  -- this phone joined somewhere else at the same moment
  end;
  return found_space;
end;
$$;

-- The return type changes (void -> text), so the old version has to go first.
drop function if exists public.remove_member(uuid);

-- Removes another member and makes a new pairing code, so the removed person cannot rejoin.
-- Returns the new code.
create function public.remove_member(target_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_space uuid;
  new_code text;
begin
  select space_id into my_space from public.space_members where user_id = auth.uid();
  if my_space is null then
    raise exception 'Not in a space';
  end if;
  perform public.rate_check('admin:' || auth.uid()::text, 10, 60);
  if target_user = auth.uid() then
    raise exception 'Use "Leave space" to remove this phone';
  end if;
  perform 1 from public.spaces where id = my_space for update;   -- two people removing each other at once
  if not exists (select 1 from public.space_members where space_id = my_space and user_id = auth.uid()) then
    raise exception 'Not in a space';
  end if;
  delete from public.space_members where space_id = my_space and user_id = target_user;
  if found then
    update public.spaces set pair_code = encode(extensions.gen_random_bytes(12), 'hex')
      where id = my_space returning pair_code into new_code;
  else
    select pair_code into new_code from public.spaces where id = my_space;
  end if;
  return new_code;
end;
$$;

create or replace function public.rotate_pair_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_space uuid;
  new_code text;
begin
  select space_id into my_space from public.space_members where user_id = auth.uid();
  if my_space is null then
    raise exception 'Not in a space';
  end if;
  perform public.rate_check('admin:' || auth.uid()::text, 10, 60);
  update public.spaces set pair_code = encode(extensions.gen_random_bytes(12), 'hex')
    where id = my_space returning pair_code into new_code;
  return new_code;
end;
$$;

-- Leave on your own. When the last person leaves, the space and all its pages and goals are deleted
-- (the app removes the photo files first).
create or replace function public.leave_space()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_space uuid;
begin
  select space_id into my_space from public.space_members where user_id = auth.uid();
  if my_space is null then
    raise exception 'Not in a space';
  end if;
  perform public.rate_check('admin:' || auth.uid()::text, 10, 60);
  perform 1 from public.spaces where id = my_space for update;
  delete from public.space_members where space_id = my_space and user_id = auth.uid();
  if not exists (select 1 from public.space_members where space_id = my_space) then
    delete from public.spaces where id = my_space;   -- cascades to members, items and goals
  end if;
end;
$$;

revoke all on function public.create_space(date, text, text) from public, anon;
revoke all on function public.join_space(text, text)         from public, anon;
revoke all on function public.remove_member(uuid)            from public, anon;
revoke all on function public.rotate_pair_code()             from public, anon;
revoke all on function public.leave_space()                  from public, anon;
grant execute on function public.create_space(date, text, text) to authenticated;
grant execute on function public.join_space(text, text)         to authenticated;
grant execute on function public.remove_member(uuid)            to authenticated;
grant execute on function public.rotate_pair_code()             to authenticated;
grant execute on function public.leave_space()                  to authenticated;
