
### Edge Probe (2025-11-07 11:23:54)
# Edge Functions Test (PROD)

| Name          | Method | Auth         | Code | OK  |
|---------------|--------|--------------|------|-----|
| import-prices | POST   | service-role | 200 | True |
| check-sets    | POST   | service-role | 200 | True |
| wall_feed     | GET    | anon         | 200 | True |

**Verdict:** GREEN

Staging TL;DR (read-only audit)

- Env invalid: `.env.staging` contains placeholders; cannot reach staging. All REST probes returned `HTTP:000` (unreachable).
- RPC `search_cards`: Unverified (no staging connectivity). Canonical contract documented; needs on-environment verify once .env.staging is populated.
- Wall feed views (wall_feed_view/v_wall_feed): Unverified; prior doc showed 404s on hosted. Expect missing view or missing grants.
- Thumbnails MV (wall_thumbs_3x4): Unverified; same exposure concern as above.
- Flutter static analysis: Completed; minor warnings remain. Runtime staging run skipped pending valid .env.staging and device run.
- Security/RLS: On-paper grants/policies reviewed; need explicit GRANTs for views/MVs/RPCs; RLS policy checks recommended.
- CI: Workflows exist; add DB smoke (local) and migrations-apply guard; staging probes in CI should be opt-in and read-only.
- Images: Enforce 3:4 thumbnails in feed; confirm staging feed uses `thumb_url` once connectivity is fixed.

Top Risks

- P0: `.env.staging` not configured â†’ staging endpoints unreachable.
- P0: Wall feed view/MV likely missing or not exposed â†’ 404 risk persists.
- P1: `search_cards` RPC contract not validated on staging â†’ drift risk.
- P1: CI lacks strong DB smoke + migrations apply guard â†’ regressions slip.


