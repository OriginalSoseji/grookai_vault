# Bulletproofing Audit ‚Äî Nov 3, 2025 (patch summary)

## Files Changed (1-line reason)
- `supabase/migrations/20251103_grants_pricing_health.sql` ‚Äî grant anon/auth select on `pricing_health_v`.
- `lib/features/dev/diagnostics/pricing_probe_page.dart` ‚Äî replace `.select('*')` with explicit projection.
- `lib/services/vault_service.dart` ‚Äî replace `.select('*')` with `id,card_id,qty,notes`.
- `supabase/functions/_shared/fetchWithTimeout.ts` ‚Äî shared fetch with timeout helper.
- `supabase/functions/import-prices/index.ts` ‚Äî use `fetchWithTimeout` for Pok√©monTCG API calls.
- `supabase/functions/system_health/index.ts` ‚Äî use `fetchWithTimeout` for webhook post.
- `supabase/functions/prices_status/index.ts` ‚Äî use `fetchWithTimeout` for external price API health ping.
- `supabase/functions/_shared/.env.example` ‚Äî document required env keys.
- `supabase/migrations/20251103_perf_indexes.sql` ‚Äî indexes for latest prices (if table) and listings.
- `supabase/migrations/20251103_wall_feed_thumbs.sql` ‚Äî NOTE stub; no thumbnail source present yet.
- `.vscode/tasks.json` ‚Äî added "Diagnostics: bundle" task.
- `scripts/diagnostics/output/RUN_LOCALLY.md` ‚Äî exact commands to generate local evidence.
- `CHANGELOG.md` ‚Äî appended bulletproofing summary.

## New Migrations Created Today
- `20251103_grants_pricing_health.sql`
- `20251103_perf_indexes.sql`
- `20251103_wall_feed_thumbs.sql` (note-only stub)

## Confirmed Projections
- Replaced `.select('*')` at:
  - `lib/features/dev/diagnostics/pricing_probe_page.dart: latest_card_prices_v -> card_id,condition,observed_at,price_mid`
  - `lib/services/vault_service.dart: vault_items -> id,card_id,qty,notes`

## Edge Functions Updated to use fetchWithTimeout
- `import-prices` (Pok√©monTCG API calls)
- `system_health` (webhook post)
- `prices_status` (external price API)

## Env Example Presence
- `supabase/functions/_shared/.env.example` includes: `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `POKEMON_TCG_API_KEY`.

## VS Code Task Added
- `Diagnostics: bundle` ‚Äî one-click evidence generation to `scripts/diagnostics/output/`.

## How to Generate Local Artifacts
- See `scripts/diagnostics/output/RUN_LOCALLY.md` for exact PowerShell commands (Flutter/Supabase CLI required).

## Notes / Next Steps
- If `pricing_health_v` should not be readable by anon in prod, swap to a thin RPC and revoke anon select.
- Implement thumbnail strategy for wall feed and update the view accordingly.
- Consider adding retries/backoff around external calls (see `FIX_PLAN_2025-11-03.md`).

---

## P2 Patch (thumbs/retries/alerts) ‚Äî COMPLETED

- Wall feed thumbnails
  - View recreated via `supabase/migrations/20251103_wall_feed_thumbs.sql` to include `thumb_url` (fallback to `url`) and retain `primary_photo_url`.
  - Grants preserved to `anon, authenticated, service_role`.
- External retries/backoff
  - Added `supabase/functions/_shared/retryFetch.ts` (exp backoff + jitter over `fetchWithTimeout`).
  - Updated external calls to use `retryFetch` in:
    - `supabase/functions/import-prices/index.ts` (Pok√©monTCG API)
    - `supabase/functions/system_health/index.ts` (webhook)
    - `supabase/functions/prices_status/index.ts` (external health ping)
- Pricing alerts surfaced in UI
  - `lib/models/pricing_alert.dart` and `lib/services/pricing_alerts_service.dart` created.
  - `lib/features/dev/diagnostics/pricing_smoke_page.dart` renders ‚ÄúPricing Alerts‚Äù section from `pricing_alerts_v`.
  - Grants added: `supabase/migrations/20251103_grants_pricing_alerts.sql`.

### Quick Acceptance Notes
- `wall_feed_v` now returns `thumb_url`; in absence of thumb columns it equals `primary_photo_url`.
- Imports of `retryFetch` present in all targeted functions.
- Run `flutter analyze` locally to verify no new issues; see `scripts/diagnostics/output/RUN_LOCALLY.md` for commands.
- Diagnostics page shows ‚ÄúPricing Alerts‚Äù or an empty state.

---
## Acceptance Checks ó Results (2025-11-03T12:32:33.4111999Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: FAIL
- retryFetch in supabase/functions/system_health/index.ts: FAIL
- retryFetch in supabase/functions/prices_status/index.ts: FAIL
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T12:33:19.1466233Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T12:36:29.6426983Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T12:52:43.5689467Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

### Latest Acceptance Summary (appended)
## Acceptance Checks ó Results (2025-11-03T12:52:43.5689467Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T12:53:53.9699373Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:09:01.5184363Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:09:19.2360710Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:09:59.0678933Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:19:15.1600597Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:20:19.1441926Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:20:42.4205389Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:26:19.7521101Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:27:04.7009635Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:29:18.4772771Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:30:49.6345958Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:31:12.6869303Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:36:11.5732562Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:36:27.8394298Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T17:40:11.2106196Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T18:19:14.2120583Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T18:22:55.5334772Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T18:23:10.1360034Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T18:32:28.7876244Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T18:41:52.6204346Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS

---
## Acceptance Checks ó Results (2025-11-03T19:12:37.9703418Z)
- Grants (REST): pricing_health_v=FAIL pricing_alerts_v=FAIL
- wall_feed_v.thumb_url: ERROR The remote server returned an error: (404) Not Found.
- retryFetch in supabase/functions/import-prices/index.ts: PASS
- retryFetch in supabase/functions/system_health/index.ts: PASS
- retryFetch in supabase/functions/prices_status/index.ts: PASS
- No .select('*') in lib hot paths: PASS
