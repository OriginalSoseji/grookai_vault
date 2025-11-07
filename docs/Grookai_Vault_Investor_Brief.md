# Grookai Vault — Investor Brief

## Executive Summary

Grookai Vault is wired end-to-end across Supabase (database schema + Edge functions), Flutter UI (ThunderShell app), and DevOps scripts. Core flows exist (Search, Vault tracking, public Wall groundwork, Scanner dev tools). The system is ~70% production-ready. The fastest path to a stable beta is aligning a few naming/schema mismatches between migrations, Edge functions, and Flutter queries, then standardizing types and run/dev tooling.

## What’s Completed

- Backend schema foundations
  - `public.vault_items` with RLS in place (basic version). Ref: `supabase/sql/2025_09_vault_items.sql`.
  - RPC for inserts: `public.vault_add_item(...)`.
  - Wall groundwork: staged tables (`public.listings`, `public.listing_images`) with RLS; materialized view + view for feed; refresh RPC.
  - Search foundation: unified search view (`v_card_search` family) with trigram/unaccent indexing and guarded joins to latest prices.
- Edge functions
  - `wall_feed` implemented (needs view name alignment), `search_cards` hybrid search, plus importers/cron engines and health probes.
- Flutter application
  - App shell, login gate, and tabbed navigation (Home, Search, Scan, Vault, Profile).
  - Wall grid/infinite scroll page, Search list, Card Detail, Vault list, Profile utilities.
  - Runtime env integration via `flutter_dotenv` with fallback `secrets.dart`.
- DevOps / scripts
  - Repair/pull/push scripts and diagnostics helpers under `scripts/` and `.chatgpt_sync` usage alignment.
  - Run checklist documented; device run path validated.

## What’s Next (High-Impact Fixes)

1) Unify Wall feed naming (single canonical name)
- Align Flutter and Edge to `public.wall_feed_view`.
- Update: `lib/features/wall/wall_feed_page.dart`, `supabase/functions/wall_feed/index.ts`.

2) Apply Wall base tables
- Promote `_hold/20251104_base_wall_tables.sql` to active migrations.
- Validate RLS + refresh RPC sequencing after apply.

3) Fix Search image field
- Option A: Add `image_best` alias in `v_card_search` (preferred for app stability).
- Option B: Update Flutter selects to `image_url` and keep `image_best.dart` helper.

4) Align Vault schema vs app
- App writes `qty`, `condition_label`, `grade_label`; table currently lacks `qty` and labels in active SQL. Promote “bak” migration or simplify app writes.

5) Consolidate Wall architecture
- Archive/retire legacy `wall_posts` path (`wall_list`, `wall_publish`) if standardizing on `listings`.

6) Grants and types
- Ensure SELECT grants for anon/auth to `v_card_search`, `wall_feed_view`.
- Add TS typegen for Edge; adopt DTOs or Flutter codegen for view/RPC rows.

7) UX polish / error surfacing
- Replace silent catches with SnackBars; keep current loading/empty states.
- Continue layout hygiene (ellipsis/Expanded/ConstrainedBox patterns).

## Current Readiness (Self-Assessment)

- Database Schema: 70% (objects present; needs alignment)
- RLS/Grants: 75% (policies present; verify coverage)
- Edge Functions: 65% (rich set; Wall/Search naming alignment pending)
- Flutter UI: 75% (navigation solid; a few schema mismatches)
- DevOps/Tooling: 70% (good scripts; add run/stop tasks and typegen)
- Overall E2E: 70%

## Comparison To A High-End Dev Team

- Architecture choices: On par — clean separation (DB views/RPCs, Edge functions, app services). Good.
- Naming/contract hygiene: Slightly below top-tier — drift between migrations, Edge, and Flutter queries is the main gap.
- Type safety: Below top-tier — no generated types for Edge; Flutter lacks DTO/codegen for views/RPCs.
- Dev ergonomics: Solid — scripts exist; adding all-in-one run/stop tasks would match premium teams.
- Test coverage: Not observed — a high-end team typically adds smoke/integration tests for RLS and critical queries.

Summary: You’ve built ~70% of what a premium team would deliver at this stage. Closing naming/schema drift, types, and run tasks would push it into the 85–90% bracket quickly. Tests and monitoring would take it to 95%+.

## Cost To Reach Production-Ready Beta

Scope: unify Wall feed naming; apply Wall base tables; fix search `image_best`; align Vault schema; archive legacy wall functions; ensure grants; add typegen + basic DTOs; add VS Code tasks; surface errors; dry run on device.

- Lean contractor team (blended $80–$120/hr)
  - 2–3 engineers x 2–3 weeks → $25k–$55k
- High-end dev shop (blended $150–$220/hr)
  - 2–3 engineers + PM x 2–3 weeks → $60k–$120k

Assumptions: No major surprises in data migration or RLS; hosted Supabase keys and function secrets ready; device available for on-device testing.

## 30/60/90 Plan

- Next 7–10 days
  - Unify `wall_feed_view` naming in DB/Edge/Flutter and ship.
  - Promote Wall base tables + verify RLS and refresh RPC order.
  - Add `image_best` alias to search view (or update app selects consistently).
  - Align `vault_items` schema with app writes (add `qty`, `condition_label`, `grade_label`) or simplify app.

- Days 11–30
  - Consolidate on `listings` (retire legacy `wall_posts`).
  - Add TS typegen for Edge and DTOs/codegen in Flutter for queried rows.
  - Add VS Code tasks: Start/Stop All, Typegen.
  - SnackBar error surfacing across Wall, Search, Vault.

- Days 31–90
  - Add basic integration tests (RLS, critical views/RPCs).
  - Add monitoring and health checks for Edge importers/pricing.
  - Seller onboarding polish and storefront read views.

## Key Risks & Mitigations

- Naming drift (Wall feed/view): Standardize on `public.wall_feed_view` and update callers.
- Insert failures (Vault): Align schema to app writes or reduce insert payload.
- Search image nulls: Add `image_best` alias with safe `COALESCE` fallback.
- Grants/RLS surprises: Add explicit SELECT grants; add smoke tests for RLS policies.

## KPIs For Beta

- TTI to first listing (min): < 5 minutes on clean device
- Search error rate (missing columns): 0% in last 500 searches
- Feed refresh latency (MV refresh): < 2 seconds perceived in app
- Vault add success rate: > 99% across last 200 inserts

## Tech Highlights

- Supabase + RPCs + materialized views for fast feed/search
- Flutter ThunderShell app with guarded routing and scanner dev tools
- RLS-first design for multi-tenant safety
- Scripts for migration repair/pull/push and local dev alignment

## Run Checklist (Device)

1) `supabase start` (or connect hosted)
2) `flutter clean && flutter pub get`
3) `flutter run -d <device-id>`
4) Verify:
   - Search loads (no column errors)
   - Wall feed shows items after `rpc_refresh_wall` or listing post
   - Vault adds work (no column mismatches)

---

Appendix: References To Align

- Wall feed naming
  - Flutter: `lib/features/wall/wall_feed_page.dart`
  - Edge: `supabase/functions/wall_feed/index.ts`
  - DB: `supabase/migrations/20251104102500_wall_views.sql`

- Search image field
  - Flutter: `lib/features/search/search_controller.dart`
  - DB: `supabase/migrations/20251104121000_search_view_prices.sql`

- Vault schema
  - Flutter: `lib/services/vault_service.dart`
  - DB (current): `supabase/sql/2025_09_vault_items.sql`
  - DB (bak): `supabase/migrations._bak_20251102004504/20250912022227_gv_step1_extend_vault_items.sql`

