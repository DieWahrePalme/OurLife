-- OurLife migration 002: space name, member names, more than two members, remove member, new code.
-- Run once in the Supabase SQL editor on the project that already has schema.sql applied.
-- (A fresh project gets the same result from schema.sql, which already includes all of this.)

-- ---------------------------------------------------------------- names

alter table public.spaces
  add column if not exists name text not null default 'Our space' check (length(name) between 1 and 60);
grant update (name) on public.spaces to authenticated;   -- start_date is already granted

alter table public.space_members
  add column if not exists nickname text not null default '' check (length(nickname) <= 40);
grant update (nickname) on public.space_members to authenticated;

drop policy if exists "members rename themselves" on public.space_members;
create policy "members rename themselves" on public.space_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- member limit: 20 instead of 2

create or replace function public.cap_members()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.spaces where id = new.space_id for update;  -- serialise concurrent joins
  if (select count(*) from public.space_members where space_id = new.space_id) >= 20 then
    raise exception 'Space is full';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- pairing functions (new signatures)

drop function if exists public.create_space(date);
drop function if exists public.join_space(text);

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
  if exists (select 1 from public.space_members where user_id = auth.uid()) then
    raise exception 'This phone is already in a space';
  end if;
  insert into public.spaces (start_date, name)
    values (create_space.start_date, coalesce(nullif(trim(space_name), ''), 'Our space'))
    returning * into new_space;
  insert into public.space_members (space_id, user_id, nickname)
    values (new_space.id, auth.uid(), left(trim(coalesce(member_name, '')), 40));
  return query select new_space.id, new_space.pair_code;
end;
$$;

-- Enter the code. Returns the space id, or null if the code is wrong or the space is full
-- (same answer for both, so nothing leaks about which codes exist).
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
  select id into found_space from public.spaces
    where pair_code = lower(trim(code)) for update;  -- serialises joins per space
  if found_space is null then
    return null;
  end if;
  select space_id into own_space from public.space_members where user_id = auth.uid();
  if own_space is not null then
    return case when own_space = found_space then found_space else null end;
  end if;
  begin
    insert into public.space_members (space_id, user_id, nickname)
      values (found_space, auth.uid(), left(trim(coalesce(member_name, '')), 40));
  exception when others then
    return null;  -- space is full
  end;
  return found_space;
end;
$$;

-- ---------------------------------------------------------------- admin actions (every member is an admin)

-- Removes another member (for example the old session of a lost phone).
create or replace function public.remove_member(target_user uuid)
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
  if target_user = auth.uid() then
    raise exception 'Remove this phone from another phone';
  end if;
  delete from public.space_members where space_id = my_space and user_id = target_user;
end;
$$;

-- Makes the old code useless. Returns the new one.
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
  update public.spaces set pair_code = encode(extensions.gen_random_bytes(12), 'hex')
    where id = my_space returning pair_code into new_code;
  return new_code;
end;
$$;

revoke all on function public.create_space(date, text, text) from public, anon;
revoke all on function public.join_space(text, text)         from public, anon;
revoke all on function public.remove_member(uuid)            from public, anon;
revoke all on function public.rotate_pair_code()             from public, anon;
grant execute on function public.create_space(date, text, text) to authenticated;
grant execute on function public.join_space(text, text)         to authenticated;
grant execute on function public.remove_member(uuid)            to authenticated;
grant execute on function public.rotate_pair_code()             to authenticated;
