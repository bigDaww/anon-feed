-- OutLinked / anon-feed canonical schema
-- Prefer supabase/migration_top_stories.sql if you already ran the earlier schema.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  content text not null,
  image_url text,
  author_name text not null,
  author_avatar text not null,
  created_at timestamptz not null default now(),
  upvotes integer not null default 0,
  downvotes integer not null default 0
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  anon_id text not null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id text not null,
  anon_id text not null,
  vote_type text not null check (vote_type in ('up', 'down')),
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  unique (post_id, user_id),
  unique (post_id, anon_id)
);

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

create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists votes_post_id_idx on public.votes (post_id);
create index if not exists posts_upvotes_idx on public.posts (upvotes desc);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists group_posts_post_id_idx on public.group_posts (post_id);

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

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.groups enable row level security;
alter table public.group_posts enable row level security;

drop policy if exists "Anyone can select posts" on public.posts;
create policy "Anyone can select posts" on public.posts for select using (true);
drop policy if exists "Anyone can insert posts" on public.posts;
create policy "Anyone can insert posts" on public.posts for insert
  with check (anon_id is not null and author_name is not null);
drop policy if exists "Anyone can update own posts" on public.posts;
create policy "Anyone can update own posts" on public.posts for update
  using (true) with check (anon_id is not null);

drop policy if exists "Anyone can select comments" on public.comments;
create policy "Anyone can select comments" on public.comments for select using (true);
drop policy if exists "Anyone can insert comments" on public.comments;
create policy "Anyone can insert comments" on public.comments for insert
  with check (anon_id is not null and author_name is not null);
drop policy if exists "Anyone can update own comments" on public.comments;
create policy "Anyone can update own comments" on public.comments for update
  using (true) with check (anon_id is not null);

drop policy if exists "Anyone can select votes" on public.votes;
create policy "Anyone can select votes" on public.votes for select using (true);
drop policy if exists "Anyone can insert votes" on public.votes;
create policy "Anyone can insert votes" on public.votes for insert
  with check (user_id is not null and vote_type in ('up', 'down'));
drop policy if exists "Anyone can update own votes" on public.votes;
create policy "Anyone can update own votes" on public.votes for update
  using (true) with check (user_id is not null and vote_type in ('up', 'down'));
drop policy if exists "Anyone can delete own votes" on public.votes;
create policy "Anyone can delete own votes" on public.votes for delete using (true);

drop policy if exists "Anyone can select groups" on public.groups;
create policy "Anyone can select groups" on public.groups for select using (true);
drop policy if exists "Anyone can select group_posts" on public.group_posts;
create policy "Anyone can select group_posts" on public.group_posts for select using (true);
drop policy if exists "Anyone can insert group_posts" on public.group_posts;
create policy "Anyone can insert group_posts" on public.group_posts for insert with check (true);

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
