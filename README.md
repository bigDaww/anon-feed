# anon-feed

Anonymous LinkedIn-style feed built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase. No accounts — identity is a browser `anon_id` in `localStorage`.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project URL and anon key, then run these SQL files in the Supabase SQL editor (in order):

1. `supabase/schema.sql` (or `migration_top_stories.sql` if upgrading an older DB)
2. `supabase/votes_delete_policy.sql` if needed
3. `supabase/migration_identity_rooms_reputation.sql`
4. `supabase/fix_profiles_digest_search_path.sql` (if profile create fails on `digest`)
5. `supabase/migration_public_hardening.sql` (**required before public launch**)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Name | Where to set |
|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` (local) · Vercel Project → Settings → Environment Variables (prod/preview) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |

These are `NEXT_PUBLIC_*` values, so Vercel inlines them at **build** time. Set them in the Vercel dashboard for Production and Preview before deploying. Do **not** commit real keys or put secrets in `vercel.json`.

## Build check

```bash
npm run build
```

## Deploy: GitHub + Vercel

This app lives in its own folder and should be its **own** Git repo (not nested under a parent monorepo remote unless you intend that).

### 1. Create a GitHub repo

1. On GitHub: **New repository** → name it `anon-feed` → leave it empty (no README/license).
2. In a terminal:

```bash
cd /path/to/anon-feed

# If this folder is not its own git repo yet:
git init
git add .
git commit -m "Initial commit: anon-feed Next.js app"

# Create the remote (GitHub CLI) or add the URL GitHub shows you:
gh repo create anon-feed --private --source=. --remote=origin --push
# OR:
# git remote add origin https://github.com/YOUR_USER/anon-feed.git
# git branch -M main
# git push -u origin main
```

Confirm `.env.local` is **not** in the commit (it is gitignored via `.env*.local`).

### 2. Import on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new).
2. **Import** the `anon-feed` GitHub repo.
3. Framework Preset: **Next.js** (also set in `vercel.json`).
4. Before deploying, open **Environment Variables** and add:

   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key  

   Apply to **Production**, **Preview**, and **Development** (or at least Production + Preview).

5. Click **Deploy**.

### 3. After deploy

- Confirm the live site loads and can read/write posts (RLS + schema must already be applied in Supabase).
- Supabase → Authentication / API: your anon key is public by design; rely on RLS policies in `supabase/schema.sql`.
- Optional: add your Vercel domain under Supabase if you later enable auth redirects (not required for this anon-only app).

### Redeploys

Pushes to `main` trigger Production deploys. Pull requests get Preview deployments automatically when the GitHub integration is connected.
