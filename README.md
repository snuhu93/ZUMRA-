# ZUMRA

**Connect. Share. Belong.**

A lightweight, fast social network built for low-end Android phones, small
storage, and slow or expensive mobile data. React + TypeScript + Vite on the
frontend, Supabase (PostgreSQL + Auth + Storage + Realtime) on the backend.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- **Deployment:** Netlify (frontend) + Supabase (backend)

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the migrations **in order**:
   - `supabase/migrations/0001_init.sql` -- tables, RLS policies, triggers
   - `supabase/migrations/0002_storage.sql` -- storage buckets + policies
   - `supabase/migrations/0003_functions.sql` -- share count / friend-accept RPCs
   - `supabase/migrations/0004_admin.sql` -- admin RLS + admin RPCs
3. (Optional) Run `supabase/seed.sql` to add demo data for testing.
4. To make your own account an admin, run once you've signed up:
   ```sql
   update profiles set is_admin = true where username = 'your_username';
   ```
5. Deploy the account-deletion Edge Function (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy delete-account
   ```
   This function is the only place the `service_role` key is used, and it
   never leaves Supabase's servers -- Supabase sets it automatically for
   Edge Functions as `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Environment variables

```bash
cp .env.example .env
```

Fill in from **Project Settings -> API** in your Supabase dashboard:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Never put the `service_role` key in this file or anywhere in frontend code.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## 4. Build

```bash
npm run build
```

Output goes to `dist/`.

## 5. Deploy to Netlify

1. Push this project to a GitHub repository.
2. In Netlify: **Add new site -> Import an existing project** and pick the repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under **Site settings -> Environment variables**.
5. Deploy.

### Common build-error troubleshooting

| Error | Fix |
|---|---|
| `Missing Supabase environment variables` at runtime | Env vars not set in Netlify -- add them and redeploy |
| TypeScript errors on build | Run `npm run build` locally first; it runs `tsc -b` before Vite build |
| Blank page after deploy, console shows routing errors | Add a Netlify `_redirects` file (see below) so client-side routes don't 404 |
| Images/videos don't load | Check bucket names match exactly: `avatars`, `covers`, `post-images`, `post-videos`, `message-media` |

Create `public/_redirects` with:
```
/*  /index.html  200
```
(so refreshing `/profile/someone` doesn't 404 on Netlify).

## Project structure

```
src/
  components/   Reusable UI (PostCard, Avatar, BottomNav, ...)
  pages/        Route-level screens
  layouts/      AppLayout (header + bottom nav wrapper)
  hooks/        useDebounce, useInfiniteScroll
  lib/          Supabase client
  services/     All Supabase queries, grouped by domain
  contexts/     Auth + Settings (data saver, theme, offline) providers
  types/        Shared TypeScript types
  utils/        Image compression / media optimization helpers
  i18n/         Translation strings (English now, ready for Hausa)
supabase/
  migrations/   SQL schema, RLS policies, functions (run in order)
  functions/    Edge Functions (delete-account uses the service-role key)
  seed.sql      Optional demo data
```

## Features implemented

Auth (sign up/in/out, forgot/reset/change password, delete account via Edge
Function), profiles (avatar/cover upload with compression, bio, stats,
friends/follow/block), home feed with pagination, create/edit/delete posts
(multi-image + video, privacy levels), likes/comments/replies/shares/saves,
friend requests + follow system, debounced global search, realtime private
messaging with offline-aware sending, notifications, 24-hour stories/status,
Data Saver mode (on by default), dark/light/system theme, full settings
screen, reporting + blocking, an admin dashboard (users/posts/reports/stats),
PWA manifest + service worker, and Postgres RLS securing every table.

## Data Saver mode

On by default for new users. When enabled: images are compressed harder and
served at lower resolution, videos never autoplay, and uploads are squeezed
more aggressively before they touch the network. Users can turn it off in
Settings -> Data.

## Security notes

- Every table has Row Level Security enabled; policies are in
  `0001_init.sql` and `0004_admin.sql`.
- The `service_role` key is used **only** inside the `delete-account` Edge
  Function, which runs on Supabase's servers -- it is never bundled into the
  frontend.
- Storage policies restrict uploads/deletes to each user's own folder
  (`{user_id}/...`).
