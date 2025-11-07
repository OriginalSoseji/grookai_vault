# Wall — RLS & Refresh

## RLS (public.listings)
- Read: anyone can `select` rows where `visibility='public' AND status='active'`.
- Write: only `owner_id = auth_uid()` may insert/update/delete their own rows.
- listing_images inherits ownership via FK to listings.

## Refresh (Materialized View)
- Call `POST /rest/v1/rpc/rpc_refresh_wall` (auth) to refresh `wall_thumbs_3x4`.
- Safe to call on demand after bulk changes. Consider wiring a nightly Edge cron.
- Uses `CONCURRENTLY` to avoid long locks.

## Client hint
- Unified search RPC handles inputs like `49`, `049`, `049/203`, `pika 49`.
- Optional client helper: `lib/utils/search_normalizer.dart`.

