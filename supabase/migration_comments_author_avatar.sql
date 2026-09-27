-- Optional: freeze comment badge color the same way posts store author_avatar.
-- Safe to re-run.

alter table public.comments
  add column if not exists author_avatar text;

update public.comments
set author_avatar = coalesce(nullif(trim(author_avatar), ''), '#6A6A7A')
where author_avatar is null;

-- Keep nullable for older rows; new inserts should always set it from the app.
