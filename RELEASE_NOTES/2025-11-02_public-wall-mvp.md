Public Wall MVP (backend + read API)

Summary

- Added seller listings backend with secure RLS and a public, read-only feed.
- View filters to active listings only and enriches with basic card meta and latest price context.
- New Edge Function `wall_feed` exposes a GET-only paginated API for browsing.
- Added VS Code task to fetch a sample feed for quick smoke checks.

Schema

- Tables (public):
  - `seller_profiles`: `id`, `user_id` (FK auth.users), profile fields, `created_at`.
  - `listings`: `id`, `seller_id` (FK seller_profiles), `card_print_id` (FK card_prints), `condition`, `price_cents`, `currency`, `status`, `quantity`, `is_trade`, `notes`, timestamps.
  - `listing_photos`: `id`, `listing_id` (FK listings), `url`, `position`, `created_at`.
- Indexes:
  - `listings_idx_active (status)`
  - `listings_idx_card_print (card_print_id)`
  - `listings_idx_condition_price (condition, price_cents)`
  - `listings_idx_status_created (status, created_at desc)`
  - `listing_photos_idx_listing_position (listing_id, position)`

RLS

- Enabled on: `seller_profiles`, `listings`, `listing_photos`.
- Public read on listings only when `status = 'active'`.
- Public read on listing photos only when parent listing is active.
- Owners (auth.uid() == seller_profiles.user_id) can CRUD their own profile, listings, and photos.

View: public.wall_feed_v

- Columns: `listing_id, card_print_id, condition, price_cents, currency, quantity, is_trade, created_at, seller_display_name, seller_avatar_url, primary_photo_url, set_code, card_number, card_name, rarity, mv_price_mid`.
- Joins: listings (active only) + seller profile + top photo + card_prints meta + left join `latest_card_prices_mv` (by `card_id` and optional `condition_label`).
- Ordered by `created_at desc`. Granted `select` to anon/authenticated/service_role.

Edge Function: wall_feed

- Path: `supabase/functions/wall_feed/index.ts`.
- GET-only. CORS allows GET/OPTIONS. No secrets required.
- Reads `public.wall_feed_v` via PostgREST using anon key.
- Filters:
  - `q`: ilike across `card_name`, `set_code`, `card_number`.
  - `condition`: single or multiple (comma-separated or repeated).
  - `min_price_cents`, `max_price_cents`.
  - Pagination: `limit` (default 50, cap 100), `offset` (default 0).
- Returns: `{ items, count }` with `Prefer: count=exact` equivalent via supabase-js.

VS Code Task

- Label: “GV: Wall — fetch sample feed”. Calls `GET /functions/v1/wall_feed?limit=5` and prints JSON.

Security

- Only active listings are readable. Anon users cannot modify data.
- No jobs/job_logs exposure. Function reads a view protected by RLS on base tables.

How to Call

- `GET {SUPABASE_URL}/functions/v1/wall_feed?limit=50&q=charizard&condition=NM&min_price_cents=1000&max_price_cents=50000`
- Compat + Scanner

- Added `v_set_print_counts` compat view to provide durable set print counts; optional `card_catalog` shim to prevent 404s in legacy tools.
- Updated diagnostics script `scripts/diagnostics/compute_missing_cards.ps1` to use a fallback chain (card_prints group -> v_set_print_counts -> probe) and print the source used.
- Added repo-wide REST resource scanner `scripts/tools/scan_schema_compat.ps1` and VS Code task “GV: Scan for schema breaks”.

Note: Compat views are temporary and will be removed after 30 days or when the scanner shows zero legacy usage for 2 consecutive releases.
