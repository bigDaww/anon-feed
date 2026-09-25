-- anon-feed schema
-- Run this in the Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  anon_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  anon_id text not null,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  unique (post_id, anon_id)
);

create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists votes_post_id_idx on public.votes (post_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Anonymous clients send anon_id on each row. Without Auth, RLS cannot
-- cryptographically prove ownership, so policies allow public select/insert
-- and require anon_id on writes. Clients should always filter updates with
-- .eq('anon_id', anonId) so only "their" rows are targeted.

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;

-- posts
create policy "Anyone can select posts"
  on public.posts for select
  using (true);

create policy "Anyone can insert posts"
  on public.posts for insert
  with check (anon_id is not null);

create policy "Anyone can update own posts"
  on public.posts for update
  using (true)
  with check (anon_id is not null);

-- comments
create policy "Anyone can select comments"
  on public.comments for select
  using (true);

create policy "Anyone can insert comments"
  on public.comments for insert
  with check (anon_id is not null);

create policy "Anyone can update own comments"
  on public.comments for update
  using (true)
  with check (anon_id is not null);

-- votes
create policy "Anyone can select votes"
  on public.votes for select
  using (true);

create policy "Anyone can insert votes"
  on public.votes for insert
  with check (anon_id is not null and value in (1, -1));

create policy "Anyone can update own votes"
  on public.votes for update
  using (true)
  with check (anon_id is not null and value in (1, -1));

create policy "Anyone can delete own votes"
  on public.votes for delete
  using (true);
