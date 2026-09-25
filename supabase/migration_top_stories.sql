-- OutLinked schema upgrade
-- Run in Supabase SQL Editor (safe to re-run with IF NOT EXISTS / guards)

-- ---------------------------------------------------------------------------
-- posts: add leaderboard + profile display columns
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists image_url text,
  add column if not exists author_name text,
  add column if not exists author_avatar text,
  add column if not exists upvotes integer not null default 0,
  add column if not exists downvotes integer not null default 0;

-- Backfill display fields from anon_id where missing
update public.posts
set
  author_name = coalesce(
    author_name,
    'Anon-' || upper(right(replace(anon_id, '-', ''), 4))
  ),
  author_avatar = coalesce(author_avatar, anon_id)
where author_name is null or author_avatar is null;

alter table public.posts
  alter column author_name set not null,
  alter column author_avatar set not null;

create index if not exists posts_upvotes_idx on public.posts (upvotes desc);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- ---------------------------------------------------------------------------
-- comments: author_name for display
-- ---------------------------------------------------------------------------

alter table public.comments
  add column if not exists author_name text;

update public.comments
set author_name = coalesce(
  author_name,
  'Anon-' || upper(right(replace(anon_id, '-', ''), 4))
)
where author_name is null;

alter table public.comments
  alter column author_name set not null;

-- ---------------------------------------------------------------------------
-- votes: user_id + vote_type (keep anon_id/value in sync for compatibility)
-- ---------------------------------------------------------------------------

alter table public.votes
  add column if not exists user_id text,
  add column if not exists vote_type text;

update public.votes
set
  user_id = coalesce(user_id, anon_id),
  vote_type = coalesce(
    vote_type,
    case when value = 1 then 'up' when value = -1 then 'down' else null end
  )
where user_id is null or vote_type is null;

alter table public.votes
  alter column user_id set not null;

alter table public.votes
  drop constraint if exists votes_vote_type_check;

alter table public.votes
  add constraint votes_vote_type_check
  check (vote_type in ('up', 'down'));

-- Unique vote per user per post (prefer user_id; keep anon unique if present)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'votes_post_id_user_id_key'
  ) then
    alter table public.votes add constraint votes_post_id_user_id_key unique (post_id, user_id);
  end if;
end $$;

-- Recompute denormalized counts from existing votes
update public.posts p
set
  upvotes = coalesce((
    select count(*)::int from public.votes v
    where v.post_id = p.id and (v.vote_type = 'up' or v.value = 1)
  ), 0),
  downvotes = coalesce((
    select count(*)::int from public.votes v
    where v.post_id = p.id and (v.vote_type = 'down' or v.value = -1)
  ), 0);

-- Keep upvotes/downvotes in sync
create or replace function public.sync_post_vote_counts()
returns trigger
language plpgsql
as $$
declare
  target uuid;
begin
  target := coalesce(new.post_id, old.post_id);
  update public.posts
  set
    upvotes = (
      select count(*)::int from public.votes
      where post_id = target and (vote_type = 'up' or value = 1)
    ),
    downvotes = (
      select count(*)::int from public.votes
      where post_id = target and (vote_type = 'down' or value = -1)
    )
  where id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists votes_sync_counts on public.votes;
create trigger votes_sync_counts
after insert or update or delete on public.votes
for each row execute function public.sync_post_vote_counts();

-- ---------------------------------------------------------------------------
-- groups + group_posts
-- ---------------------------------------------------------------------------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.group_posts (
  group_id uuid not null references public.groups (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, post_id)
);

create index if not exists group_posts_post_id_idx on public.group_posts (post_id);

alter table public.groups enable row level security;
alter table public.group_posts enable row level security;

drop policy if exists "Anyone can select groups" on public.groups;
create policy "Anyone can select groups"
  on public.groups for select using (true);

drop policy if exists "Anyone can select group_posts" on public.group_posts;
create policy "Anyone can select group_posts"
  on public.group_posts for select using (true);

drop policy if exists "Anyone can insert group_posts" on public.group_posts;
create policy "Anyone can insert group_posts"
  on public.group_posts for insert with check (true);

insert into public.groups (name, description, member_count)
values
  ('College Students', 'Life on campus, exams, and everything in between.', 48210),
  ('Startup Founders', 'Building in public — anonymously.', 19340),
  ('Remote Workers', 'WFH wins, losses, and coffee runs.', 27105),
  ('Gamers', 'Ranked rants and clutch confessions.', 35880),
  ('Designers', 'Pixels, critique, and portfolio panic.', 12450),
  ('Engineers', 'Ship it. Then fix it.', 30120),
  ('Chandigarh', 'Local stories from the city beautiful.', 8640),
  ('India', 'Nationwide anonymous pulse.', 112300)
on conflict (name) do nothing;

-- Allow vote policies to accept user_id writes (existing policies still apply)
drop policy if exists "Anyone can insert votes with user_id" on public.votes;
create policy "Anyone can insert votes with user_id"
  on public.votes for insert
  with check (
    (user_id is not null or anon_id is not null)
    and (vote_type in ('up', 'down') or value in (1, -1))
  );
