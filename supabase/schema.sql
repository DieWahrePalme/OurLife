-- OurLife: draft schema for Supabase. NOT applied yet.
-- Moritz runs this himself once a Supabase project exists (SQL editor or CLI).
-- Model: no sign-up. Each phone signs in anonymously, then pairs into one "space"
-- with a long random code. Row Level Security ties every row to the space.
-- Only the anon/publishable key is ever used in the app. Never a service_role key.
--
-- Supabase dashboard settings to do together with this file:
--   * Authentication > Providers: keep "Anonymous sign-ins" ON, email sign-up OFF
--     (anonymous users use the "authenticated" role, so no real accounts may exist).
--   * Authentication > Rate limits: keep the anonymous sign-in limit low; enable CAPTCHA if offered.
-- Reviewed by the security-reviewer agent on 2026-10-06; findings are applied below.

-- ---------------------------------------------------------------- tables

create table public.spaces (
  id          uuid primary key default gen_random_uuid(),
  start_date  date not null,
  -- The pairing code is the only secret: 24 hex characters (96 bits of real randomness).
  pair_code   text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at  timestamptz not null default now()
);

create table public.space_members (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  user_id     uuid not null default auth.uid(),
  joined_at   timestamptz not null default now(),
  primary key (space_id, user_id),
  -- One phone belongs to exactly one space.
  unique (user_id)
);

-- One row per canvas item. `data` holds the item exactly as the app stores it
-- (kind, position, scale, rotation, colour, content, tasks, amount, ...).
-- The key includes space_id so two spaces can never collide on an item id.
create table public.day_items (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  id          text not null,
  day_number  integer not null check (day_number >= 1),
  data        jsonb not null check (pg_column_size(data) < 20000),
  updated_at  timestamptz not null default now(),
  primary key (space_id, id)
);
create index day_items_space_day_idx on public.day_items (space_id, day_number);

create table public.goals (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  id          text not null,
  name        text not null check (length(name) between 1 and 80),
  target      numeric not null check (target > 0),
  unit        text not null default '' check (length(unit) <= 20),
  deadline    date,
  created_at  timestamptz not null default now(),
  primary key (space_id, id),
  unique (space_id, name)
);

-- ---------------------------------------------------------------- table rights
-- Supabase grants broad rights by default; RLS is the gate, but we narrow the rights too.

revoke all on public.spaces, public.space_members, public.day_items, public.goals from anon;
revoke insert, delete on public.spaces from authenticated;
revoke update on public.spaces from authenticated;
grant update (start_date) on public.spaces to authenticated;      -- never pair_code or id
revoke insert, update, delete on public.space_members from authenticated;  -- only via the functions below
revoke update (space_id) on public.day_items from authenticated;
revoke update (space_id) on public.goals from authenticated;

-- ---------------------------------------------------------------- access helper

create or replace function public.is_space_member(target_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_members
    where space_id = target_space and user_id = auth.uid()
  );
$$;

revoke all on function public.is_space_member(uuid) from public, anon;
grant execute on function public.is_space_member(uuid) to authenticated;

-- ---------------------------------------------------------------- row level security

alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.day_items     enable row level security;
alter table public.goals         enable row level security;

create policy "members read their space"   on public.spaces
  for select using (public.is_space_member(id));
create policy "members change start date"  on public.spaces
  for update using (public.is_space_member(id)) with check (public.is_space_member(id));

create policy "members see members"        on public.space_members
  for select using (public.is_space_member(space_id));

create policy "members use day items"      on public.day_items
  for all using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));

create policy "members use goals"          on public.goals
  for all using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));

-- No insert/delete policy on spaces or space_members: they only change through
-- the two functions below, which keep the pairing code secret.

-- ---------------------------------------------------------------- guards

-- Exactly two people per space, even if someone bypasses the functions.
create or replace function public.cap_members()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.spaces where id = new.space_id for update;  -- serialise concurrent joins
  if (select count(*) from public.space_members where space_id = new.space_id) >= 2 then
    raise exception 'Space is full';
  end if;
  return new;
end;
$$;

create trigger cap_members before insert on public.space_members
  for each row execute function public.cap_members();

-- A row can never be moved to another space.
create or replace function public.lock_space_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.space_id is distinct from old.space_id then
    raise exception 'space_id cannot change';
  end if;
  return new;
end;
$$;

create trigger lock_space_id_items before update on public.day_items
  for each row execute function public.lock_space_id();
create trigger lock_space_id_goals before update on public.goals
  for each row execute function public.lock_space_id();

-- ---------------------------------------------------------------- pairing

-- First phone: creates "our space" and becomes its first member. Returns the code to share.
create or replace function public.create_space(start_date date)
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
  insert into public.spaces (start_date) values (create_space.start_date) returning * into new_space;
  insert into public.space_members (space_id, user_id) values (new_space.id, auth.uid());
  return query select new_space.id, new_space.pair_code;
end;
$$;

-- Second phone: enters the code. Returns the space id, or null if the code is wrong
-- or the space is full (same answer for both, so nothing leaks about which codes exist).
create or replace function public.join_space(code text)
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
    insert into public.space_members (space_id, user_id) values (found_space, auth.uid());
  exception when others then
    return null;  -- space is full
  end;
  return found_space;
end;
$$;

revoke all on function public.create_space(date) from public, anon;
revoke all on function public.join_space(text)   from public, anon;
grant execute on function public.create_space(date) to authenticated;
grant execute on function public.join_space(text)   to authenticated;

-- ---------------------------------------------------------------- live sync

alter publication supabase_realtime add table public.day_items;
alter publication supabase_realtime add table public.goals;
-- Do not add spaces or space_members: they hold the pairing code.

-- ---------------------------------------------------------------- photos (private bucket)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files live at  <space_id>/<item_id>.<ext>. Returns null for any other path shape,
-- so a malformed name can never cause a cast error.
create or replace function public.photo_space(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1]
         ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

create policy "members read photos" on storage.objects
  for select using (bucket_id = 'photos' and public.is_space_member(public.photo_space(name)));
create policy "members add photos" on storage.objects
  for insert with check (bucket_id = 'photos' and public.is_space_member(public.photo_space(name)));
create policy "members delete photos" on storage.objects
  for delete using (bucket_id = 'photos' and public.is_space_member(public.photo_space(name)));
-- Add an update policy only if the app ever uploads with upsert.
-- Photos of a deleted space stay in storage: plan a cleanup job when deleting spaces.
