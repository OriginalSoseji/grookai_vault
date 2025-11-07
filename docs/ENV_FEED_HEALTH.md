**Environment Summary**
- App URL: https://ycdxbpibncqcchqiihfz.supabase.co
- App Key: anon (present in `.env` and `lib/secrets.dart`)
- Classification: Hosted (contains supabase.co)
- Local Supabase status: running
- Local API URL (from `supabase status`): http://127.0.0.1:54321
- Routing: App → Hosted

**Detected Config**
- Source files scanned:
  - `.env`
  - `lib/config/env.dart`
  - `lib/secrets.dart`
- SUPABASE_URL: https://ycdxbpibncqcchqiihfz.supabase.co
- SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[anon]

**Data Presence**
- Listings (GET /rest/v1/listings): 404 Not Found (table not exposed/present)
- Feed View (GET /rest/v1/wall_feed_view): 404 Not Found (view not exposed/present)
- Thumbs count (HEAD /rest/v1/wall_thumbs_3x4): 404 Not Found (matview not exposed/present)
- Result: Unable to fetch rows; hosted database likely missing required wall tables/views or REST exposure.

**Grants Status**
- Unable to confirm via API, since `public.wall_feed_view` is not found.
- Repository migrations define intended grants:
  - GRANT SELECT on `public.wall_feed_view`, `public.wall_feed_v`, `public.v_wall_feed` to `anon` and `authenticated`.
- Status: Not verifiable (objects absent on Hosted project).

**Caller Alignment**
- Flutter callers use `public.wall_feed_view`:
  - `lib/features/home/home_vm.dart:77`
  - `lib/features/wall/wall_feed_page.dart:50`
  - `lib/features/wall/wall_post_detail.dart:57`
  - `lib/features/wall/public_wall_feed.dart:49`
- Edge function caller:
  - `supabase/functions/wall_feed/index.ts:53` → `.from("wall_feed_view")`
- Outdated aliases (`wall_feed_v`, `v_wall_feed`): none in app/edge code (docs only).

**Status**
- ❌ Feed not healthy on Hosted: required tables/views return 404 via PostgREST.

**Next Actions**
- If targeting Hosted:
  - Push migrations to the hosted project (read-only safe check first):
    - `supabase db pull` to review remote schema (optional, may write `supabase/schema.sql`).
    - `supabase db push` to apply wall tables/views and grants.
  - After push, refresh the MV if needed: `select public.refresh_wall_thumbs_3x4();` or `REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;`.
  - Re-run API probes:
    - `/rest/v1/listings?select=id,title,visibility,status,created_at&order=created_at.desc&limit=5`
    - `/rest/v1/wall_feed_view?select=listing_id,title,created_at&order=created_at.desc&limit=5`
    - `/rest/v1/wall_thumbs_3x4?select=id` with `Prefer: count=exact` (read `Content-Range`).
- If targeting Local for development:
  - Switch `.env` to local: `SUPABASE_URL=http://127.0.0.1:54321` and use the local publishable key (`supabase status` → Publishable key).
  - Confirm local REST endpoints return rows; then decide whether to seed or sync to Hosted.

**Notes**
- Rules observed: read-only REST checks, no destructive SQL, no migration edits performed.
 - Use `--dart-define=GV_ENV=local|staging|prod` to switch environments. VS Code tasks are provided for LOCAL/STAGING runs.
