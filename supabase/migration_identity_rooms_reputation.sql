-- Additive migration: profiles, discussion rooms, reputation
-- Run in Supabase SQL Editor. Does not drop existing tables.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (anonymous identity)
-- id matches existing anon_id / user_id strings
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id text primary key,
  display_name text not null,
  public_id text not null unique,
  recovery_hash text not null,
  avatar text not null,
  karma integer not null default 0,
  rep_insightful integer not null default 0,
  rep_helpful integer not null default 0,
  rep_funny integer not null default 0,
  rep_supportive integer not null default 0,
  created_at timestamptz not null default now(),
  onboarded_at timestamptz not null default now()
);

create index if not exists profiles_public_id_idx on public.profiles (public_id);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Anyone can insert own profile" on public.profiles;
create policy "Anyone can insert own profile"
  on public.profiles for insert
  with check (id is not null and display_name is not null and public_id is not null);

drop policy if exists "Anyone can update profiles" on public.profiles;
create policy "Anyone can update profiles"
  on public.profiles for update
  using (true)
  with check (id is not null);

-- Hide recovery_hash from direct table reads via column privilege
revoke all on table public.profiles from anon, authenticated;
grant select (
  id, display_name, public_id, avatar, karma,
  rep_insightful, rep_helpful, rep_funny, rep_supportive,
  created_at, onboarded_at
) on table public.profiles to anon, authenticated;
grant insert (
  id, display_name, public_id, recovery_hash, avatar, karma,
  rep_insightful, rep_helpful, rep_funny, rep_supportive,
  created_at, onboarded_at
) on table public.profiles to anon, authenticated;
grant update (
  display_name, avatar, karma,
  rep_insightful, rep_helpful, rep_funny, rep_supportive
) on table public.profiles to anon, authenticated;

-- Hash helper (same formula as client)
-- Use extensions.digest — Supabase installs pgcrypto in `extensions`, and
-- SECURITY DEFINER funcs with search_path=public alone cannot see digest().
create or replace function public.hash_recovery_key(p_key text, p_public_id text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(
    digest(
      convert_to(lower(trim(p_key)) || ':' || p_public_id, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

-- Create profile (stores hash server-side)
create or replace function public.create_anon_profile(
  p_id text,
  p_display_name text,
  p_public_id text,
  p_recovery_key text,
  p_avatar text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec public.profiles%rowtype;
begin
  if p_id is null or length(trim(p_id)) = 0 then
    raise exception 'missing id';
  end if;
  if p_public_id !~ '^[0-9]{6}$' then
    raise exception 'public_id must be 6 digits';
  end if;
  if p_recovery_key is null or length(trim(p_recovery_key)) < 8 then
    raise exception 'recovery key too short';
  end if;

  insert into public.profiles (
    id, display_name, public_id, recovery_hash, avatar
  ) values (
    p_id,
    coalesce(nullif(trim(p_display_name), ''), 'Anonymous User'),
    p_public_id,
    public.hash_recovery_key(p_recovery_key, p_public_id),
    coalesce(nullif(trim(p_avatar), ''), '#94a3b8')
  )
  returning * into rec;

  return json_build_object(
    'id', rec.id,
    'display_name', rec.display_name,
    'public_id', rec.public_id,
    'avatar', rec.avatar,
    'karma', rec.karma,
    'rep_insightful', rec.rep_insightful,
    'rep_helpful', rec.rep_helpful,
    'rep_funny', rec.rep_funny,
    'rep_supportive', rec.rep_supportive,
    'created_at', rec.created_at
  );
end;
$$;

grant execute on function public.create_anon_profile(text, text, text, text, text) to anon, authenticated;

-- Recover session with Public ID + Recovery Key
create or replace function public.verify_recovery(p_public_id text, p_recovery_key text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec public.profiles%rowtype;
  expected text;
begin
  select * into rec from public.profiles where public_id = p_public_id;
  if not found then
    return null;
  end if;

  expected := public.hash_recovery_key(p_recovery_key, p_public_id);
  if expected is distinct from rec.recovery_hash then
    return null;
  end if;

  return json_build_object(
    'id', rec.id,
    'display_name', rec.display_name,
    'public_id', rec.public_id,
    'avatar', rec.avatar,
    'karma', rec.karma,
    'rep_insightful', rec.rep_insightful,
    'rep_helpful', rec.rep_helpful,
    'rep_funny', rec.rep_funny,
    'rep_supportive', rec.rep_supportive,
    'created_at', rec.created_at
  );
end;
$$;

grant execute on function public.verify_recovery(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Discussion rooms
-- ---------------------------------------------------------------------------

create table if not exists public.conversation_rooms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.conversation_rooms (id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.conversation_rooms (id) on delete cascade,
  user_id text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_members_user_idx on public.room_members (user_id);
create index if not exists room_messages_room_created_idx
  on public.room_messages (room_id, created_at);

alter table public.conversation_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;

drop policy if exists "Rooms are readable" on public.conversation_rooms;
create policy "Rooms are readable" on public.conversation_rooms for select using (true);
drop policy if exists "Rooms can be inserted" on public.conversation_rooms;
create policy "Rooms can be inserted" on public.conversation_rooms for insert with check (true);
drop policy if exists "Rooms can be updated" on public.conversation_rooms;
create policy "Rooms can be updated" on public.conversation_rooms for update using (true) with check (true);

drop policy if exists "Room members readable" on public.room_members;
create policy "Room members readable" on public.room_members for select using (true);
drop policy if exists "Room members insert" on public.room_members;
create policy "Room members insert" on public.room_members for insert with check (true);
drop policy if exists "Room members delete" on public.room_members;
create policy "Room members delete" on public.room_members for delete using (true);

drop policy if exists "Room messages readable" on public.room_messages;
create policy "Room messages readable" on public.room_messages for select using (true);
drop policy if exists "Room messages insert" on public.room_messages;
create policy "Room messages insert" on public.room_messages for insert
  with check (message is not null and length(trim(message)) > 0);

grant select, insert, update on public.conversation_rooms to anon, authenticated;
grant select, insert, delete on public.room_members to anon, authenticated;
grant select, insert on public.room_messages to anon, authenticated;

-- Auto-create room when 10 unique participants (post author + commenters)
create or replace function public.maybe_spawn_discussion_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_count int;
  existing_room uuid;
  new_room uuid;
  author text;
begin
  select anon_id into author from public.posts where id = new.post_id;

  select count(*)::int into participant_count
  from (
    select author as uid where author is not null
    union
    select distinct c.anon_id from public.comments c where c.post_id = new.post_id
  ) u
  where uid is not null;

  if participant_count < 10 then
    return new;
  end if;

  select id into existing_room
  from public.conversation_rooms
  where post_id = new.post_id;

  if existing_room is not null then
    -- keep members in sync
    insert into public.room_members (room_id, user_id)
    select existing_room, uid
    from (
      select author as uid where author is not null
      union
      select distinct c.anon_id from public.comments c where c.post_id = new.post_id
    ) u
    where uid is not null
    on conflict do nothing;
    return new;
  end if;

  insert into public.conversation_rooms (post_id, active)
  values (new.post_id, true)
  returning id into new_room;

  insert into public.room_members (room_id, user_id)
  select new_room, uid
  from (
    select author as uid where author is not null
    union
    select distinct c.anon_id from public.comments c where c.post_id = new.post_id
  ) u
  where uid is not null
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists comments_maybe_spawn_room on public.comments;
create trigger comments_maybe_spawn_room
after insert on public.comments
for each row execute function public.maybe_spawn_discussion_room();

-- ---------------------------------------------------------------------------
-- Reputation from post upvotes
-- ---------------------------------------------------------------------------

create or replace function public.apply_vote_reputation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author text;
  bucket int;
  delta int;
begin
  if tg_op = 'DELETE' then
    delta := case when old.vote_type = 'up' or old.value = 1 then -1 else 0 end;
    select anon_id into author from public.posts where id = old.post_id;
    bucket := abs(hashtext(coalesce(old.id::text, ''))) % 4;
  elsif tg_op = 'UPDATE' then
    -- net change from old → new
    if (old.vote_type = 'up' or old.value = 1) and not (new.vote_type = 'up' or new.value = 1) then
      delta := -1;
    elsif not (old.vote_type = 'up' or old.value = 1) and (new.vote_type = 'up' or new.value = 1) then
      delta := 1;
    else
      delta := 0;
    end if;
    select anon_id into author from public.posts where id = new.post_id;
    bucket := abs(hashtext(coalesce(new.id::text, ''))) % 4;
  else
    delta := case when new.vote_type = 'up' or new.value = 1 then 1 else 0 end;
    select anon_id into author from public.posts where id = new.post_id;
    bucket := abs(hashtext(coalesce(new.id::text, ''))) % 4;
  end if;

  if author is null or delta = 0 then
    return coalesce(new, old);
  end if;

  update public.profiles
  set
    karma = greatest(0, karma + delta),
    rep_insightful = case when bucket = 0 then greatest(0, rep_insightful + delta) else rep_insightful end,
    rep_helpful = case when bucket = 1 then greatest(0, rep_helpful + delta) else rep_helpful end,
    rep_funny = case when bucket = 2 then greatest(0, rep_funny + delta) else rep_funny end,
    rep_supportive = case when bucket = 3 then greatest(0, rep_supportive + delta) else rep_supportive end
  where id = author;

  return coalesce(new, old);
end;
$$;

drop trigger if exists votes_apply_reputation on public.votes;
create trigger votes_apply_reputation
after insert or update or delete on public.votes
for each row execute function public.apply_vote_reputation();

-- Realtime: enable for room_messages (run in dashboard if needed)
-- alter publication supabase_realtime add table public.room_messages;
do $$
begin
  begin
    alter publication supabase_realtime add table public.room_messages;
  exception when duplicate_object then
    null;
  when others then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.room_members;
  exception when duplicate_object then
    null;
  when others then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.conversation_rooms;
  exception when duplicate_object then
    null;
  when others then
    null;
  end;
end $$;
