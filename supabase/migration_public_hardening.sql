-- Hardening for public launch: tighter RLS, bans, rate limits, reports.
-- Run in Supabase SQL Editor after prior migrations. Safe to re-run.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Moderation tables
-- ---------------------------------------------------------------------------

create table if not exists public.banned_anon_ids (
  anon_id text primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_anon_id text not null,
  target_type text not null check (target_type in ('post', 'comment', 'room_message', 'profile')),
  target_id text not null,
  reason text not null default 'abuse',
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists moderation_reports_target_idx
  on public.moderation_reports (target_type, target_id);
create index if not exists moderation_reports_reporter_created_idx
  on public.moderation_reports (reporter_anon_id, created_at desc);

alter table public.banned_anon_ids enable row level security;
alter table public.moderation_reports enable row level security;

-- Bans: readable so clients can show a clear message; no client writes
drop policy if exists "Bans are readable" on public.banned_anon_ids;
create policy "Bans are readable"
  on public.banned_anon_ids for select using (true);

-- Reports: insert only via RPC (no direct select of others' reports)
revoke all on table public.moderation_reports from anon, authenticated;
grant insert (reporter_anon_id, target_type, target_id, reason, details)
  on table public.moderation_reports to anon, authenticated;

drop policy if exists "Anyone can insert reports" on public.moderation_reports;
create policy "Anyone can insert reports"
  on public.moderation_reports for insert
  with check (
    reporter_anon_id is not null
    and length(trim(reporter_anon_id)) > 0
    and target_id is not null
  );

-- ---------------------------------------------------------------------------
-- Helpers: ban + rate limit + content
-- ---------------------------------------------------------------------------

create or replace function public.is_anon_banned(p_anon_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.banned_anon_ids b where b.anon_id = p_anon_id
  );
$$;

create or replace function public.content_is_allowed(p_content text)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_content is null then
    return false;
  end if;
  if length(trim(p_content)) < 1 then
    return false;
  end if;
  if length(p_content) > 2000 then
    return false;
  end if;
  -- Basic control-char / obvious spam patterns
  if p_content ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.assert_can_write(
  p_anon_id text,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
  max_allowed int;
  window_minutes int := 60;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 then
    raise exception 'missing identity';
  end if;

  if public.is_anon_banned(p_anon_id) then
    raise exception 'account restricted';
  end if;

  if p_kind = 'post' then
    max_allowed := 5;
    select count(*)::int into recent_count
    from public.posts
    where anon_id = p_anon_id
      and created_at > now() - make_interval(mins => window_minutes);
  elsif p_kind = 'comment' then
    max_allowed := 30;
    select count(*)::int into recent_count
    from public.comments
    where anon_id = p_anon_id
      and created_at > now() - make_interval(mins => window_minutes);
  elsif p_kind = 'room_message' then
    max_allowed := 60;
    select count(*)::int into recent_count
    from public.room_messages
    where user_id = p_anon_id
      and created_at > now() - make_interval(mins => window_minutes);
  elsif p_kind = 'report' then
    max_allowed := 10;
    select count(*)::int into recent_count
    from public.moderation_reports
    where reporter_anon_id = p_anon_id
      and created_at > now() - make_interval(mins => window_minutes);
  elsif p_kind = 'vote' then
    max_allowed := 120;
    select count(*)::int into recent_count
    from public.votes
    where user_id = p_anon_id
      and created_at > now() - make_interval(mins => window_minutes);
  else
    raise exception 'unknown write kind';
  end if;

  if recent_count >= max_allowed then
    raise exception 'rate limit exceeded — try again later';
  end if;
end;
$$;

grant execute on function public.is_anon_banned(text) to anon, authenticated;
grant execute on function public.content_is_allowed(text) to anon, authenticated;
grant execute on function public.assert_can_write(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Write guards (triggers)
-- ---------------------------------------------------------------------------

create or replace function public.guard_post_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_write(new.anon_id, 'post');
  if not public.content_is_allowed(new.content) then
    raise exception 'content not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard_write on public.posts;
create trigger posts_guard_write
before insert on public.posts
for each row execute function public.guard_post_write();

create or replace function public.guard_comment_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_write(new.anon_id, 'comment');
  if not public.content_is_allowed(new.content) then
    raise exception 'content not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_guard_write on public.comments;
create trigger comments_guard_write
before insert on public.comments
for each row execute function public.guard_comment_write();

create or replace function public.guard_room_message_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_write(new.user_id, 'room_message');
  if not public.content_is_allowed(new.message) then
    raise exception 'content not allowed';
  end if;
  if not exists (
    select 1 from public.room_members m
    where m.room_id = new.room_id and m.user_id = new.user_id
  ) then
    raise exception 'join the room before chatting';
  end if;
  return new;
end;
$$;

drop trigger if exists room_messages_guard_write on public.room_messages;
create trigger room_messages_guard_write
before insert on public.room_messages
for each row execute function public.guard_room_message_write();

-- ---------------------------------------------------------------------------
-- Vote RPC (no open client update/delete on votes)
-- ---------------------------------------------------------------------------

create or replace function public.cast_anon_vote(
  p_post_id uuid,
  p_user_id text,
  p_direction smallint
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.votes%rowtype;
  next_type text;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'missing identity';
  end if;
  if public.is_anon_banned(p_user_id) then
    raise exception 'account restricted';
  end if;
  if p_direction is distinct from 1 and p_direction is distinct from -1 then
    raise exception 'invalid vote';
  end if;

  select * into existing
  from public.votes
  where post_id = p_post_id and user_id = p_user_id;

  if found and existing.value = p_direction then
    delete from public.votes where id = existing.id;
    return json_build_object('action', 'removed', 'value', null);
  end if;

  perform public.assert_can_write(p_user_id, 'vote');

  next_type := case when p_direction = 1 then 'up' else 'down' end;

  if found then
    update public.votes
    set vote_type = next_type,
        value = p_direction,
        anon_id = p_user_id
    where id = existing.id;
    return json_build_object('action', 'updated', 'value', p_direction);
  end if;

  insert into public.votes (post_id, user_id, anon_id, vote_type, value)
  values (p_post_id, p_user_id, p_user_id, next_type, p_direction);

  return json_build_object('action', 'created', 'value', p_direction);
end;
$$;

grant execute on function public.cast_anon_vote(uuid, text, smallint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Report RPC
-- ---------------------------------------------------------------------------

create or replace function public.submit_moderation_report(
  p_reporter text,
  p_target_type text,
  p_target_id text,
  p_reason text default 'abuse',
  p_details text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_can_write(p_reporter, 'report');

  if p_target_type not in ('post', 'comment', 'room_message', 'profile') then
    raise exception 'invalid target';
  end if;
  if p_target_id is null or length(trim(p_target_id)) = 0 then
    raise exception 'missing target';
  end if;

  insert into public.moderation_reports (
    reporter_anon_id, target_type, target_id, reason, details
  ) values (
    p_reporter,
    p_target_type,
    trim(p_target_id),
    coalesce(nullif(trim(p_reason), ''), 'abuse'),
    left(coalesce(p_details, ''), 500)
  );

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.submit_moderation_report(text, text, text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tighten RLS: remove open update/delete surfaces
-- ---------------------------------------------------------------------------

-- Posts: select + insert only (counts updated by trigger as owner)
drop policy if exists "Anyone can update own posts" on public.posts;
drop policy if exists "Anyone can update posts" on public.posts;
drop policy if exists "Anyone can delete posts" on public.posts;

drop policy if exists "Anyone can insert posts" on public.posts;
create policy "Anyone can insert posts" on public.posts for insert
  with check (
    anon_id is not null
    and author_name is not null
    and public.content_is_allowed(content)
    and not public.is_anon_banned(anon_id)
  );

-- Comments
drop policy if exists "Anyone can update own comments" on public.comments;
drop policy if exists "Anyone can update comments" on public.comments;
drop policy if exists "Anyone can delete comments" on public.comments;

drop policy if exists "Anyone can insert comments" on public.comments;
create policy "Anyone can insert comments" on public.comments for insert
  with check (
    anon_id is not null
    and author_name is not null
    and public.content_is_allowed(content)
    and not public.is_anon_banned(anon_id)
  );

-- Votes: select + insert only; mutations go through cast_anon_vote
drop policy if exists "Anyone can update own votes" on public.votes;
drop policy if exists "Anyone can update votes" on public.votes;
drop policy if exists "Anyone can delete own votes" on public.votes;
drop policy if exists "Anyone can delete votes" on public.votes;

drop policy if exists "Anyone can insert votes" on public.votes;
drop policy if exists "Anyone can insert votes with user_id" on public.votes;
create policy "Anyone can insert votes" on public.votes for insert
  with check (
    user_id is not null
    and vote_type in ('up', 'down')
    and value in (1, -1)
    and not public.is_anon_banned(user_id)
  );

-- Profiles: no open client updates (create via RPC only)
drop policy if exists "Anyone can update profiles" on public.profiles;

-- Conversation rooms: clients cannot insert/update (spawn trigger is security definer)
drop policy if exists "Rooms can be inserted" on public.conversation_rooms;
drop policy if exists "Rooms can be updated" on public.conversation_rooms;
revoke insert, update, delete on public.conversation_rooms from anon, authenticated;
grant select on public.conversation_rooms to anon, authenticated;

-- Room members: keep join/leave; cannot wipe others without knowing their user_id
-- (spoofable without auth — accepted for anon apps; leave scoped by client filter)
drop policy if exists "Room members delete" on public.room_members;
create policy "Room members delete" on public.room_members for delete
  using (user_id is not null);

drop policy if exists "Room members insert" on public.room_members;
create policy "Room members insert" on public.room_members for insert
  with check (
    user_id is not null
    and not public.is_anon_banned(user_id)
  );

-- Room messages
drop policy if exists "Room messages insert" on public.room_messages;
create policy "Room messages insert" on public.room_messages for insert
  with check (
    user_id is not null
    and public.content_is_allowed(message)
    and not public.is_anon_banned(user_id)
  );

-- Fake groups write surface (UI removed; lock down)
drop policy if exists "Anyone can insert group_posts" on public.group_posts;
revoke insert, update, delete on table public.group_posts from anon, authenticated;
grant select on table public.group_posts to anon, authenticated;
revoke insert, update, delete on table public.groups from anon, authenticated;
grant select on table public.groups to anon, authenticated;
