-- Fix: create_anon_profile failed with
--   function digest(text, unknown) does not exist
-- because SECURITY DEFINER used search_path=public only, while Supabase
-- installs pgcrypto in the `extensions` schema.
--
-- Run this in the Supabase SQL Editor (safe to re-run).

create extension if not exists pgcrypto with schema extensions;

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
