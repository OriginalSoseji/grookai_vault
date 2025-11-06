---
Date: 2025-11-06 16:13 MST
STAGING: 200/200
PROD:    200/200
Verdict: GREEN
---

Status (local-only audit on Windows; outputs under reports/scan_YYYYMMDD_HHMM)

- DB (local): NOT RUNNING. `supabase status` shows no DB container; REST restarted but DB missing. Fix: run `Grookai: Ensure Local Ready` then `Grookai: Start Supabase`.
- RPCs: Unverified locally due to DB down. Hosted has edge functions incl. `search_cards`, but DB RPC shape not validated. Fix: bring up local DB, run smoke RPC.
- Views: Wall feed/view not reachable on hosted per docs/ENV_FEED_HEALTH.md. Local unverified. Fix: `supabase db push` to hosted (when ready) and refresh MVs; local check first.
- RLS/Grants: Unverified live. Migrations contain grants; need a pass to confirm for views/MVs and RPC EXECUTE for anon/auth. Fix: add explicit grants and RLS policy tests.
- Functions: Functions list retrieved (remote), but no local serve validation. Fix: use `Grookai: Functions Serve` and minimal payload smoke.
- Flutter UI/Perf: Analyze completed with minor warnings; some fixed here. One unit test fails (GVTheme context). Fix: wrap widget in app/theme for test or provide TestApp.
- Images: Feed requires 3:4 thumbnails; verification pending. Fix: enforce thumbnail usage and fallbacks; see REPORTS/IMAGE_PIPELINE.md.
- CI: Multiple workflows present; add DB smoke + migration apply checks to guard regressions.

Top Risks

- P0: Local DB not running â†’ blocks end-to-end validation.
- P0: Hosted wall feed objects not exposed/missing â†’ 404s in prod.
- P1: RPC contract drift for `search_cards` not locked in repo docs/tests.
- P1: Test failure (GVTheme) hides regressions in CI.


