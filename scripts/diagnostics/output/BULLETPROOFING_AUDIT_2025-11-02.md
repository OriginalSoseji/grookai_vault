# Bulletproofing Audit — Nov 2, 2025 (America/Denver)

This audit summarizes build health, database/migrations, Edge/API, security (RLS), performance, UI/UX, and known issues. Evidence pulled from repo contents and git history. Where evidence is missing, exact commands are listed to generate it.

## Build & Project Health

- Flutter/Dart analysis
  - Evidence missing. Generate with:
    - `flutter --version > scripts/diagnostics/output/flutter_version.txt 2>&1`
    - `flutter analyze > scripts/diagnostics/output/flutter_analyze.txt 2>&1`
    - `dart pub outdated > scripts/diagnostics/output/dart_outdated.txt 2>&1`
    - `dart fix --dry-run > scripts/diagnostics/output/dart_fix_dry_run.txt 2>&1`
- Android config
  - `android/app/build.gradle.kts` pins `compileSdk=36`, `buildToolsVersion=36.0.0`, `targetSdk=34`; prints installed build-tools and warns on RC/previews.
  - Risk: local SDKs with RC build-tools may cause `aapt2`/packaging issues. VS Code task “Android: install build-tools 36.0.0” is present to remediate.
  - Verify minSdk via Flutter config; adjust if any plugins require higher.
- VS Code tasks
  - `.vscode/tasks.json` adds guarded release, schema scan, Android build-tools install, pricing smoke/e2e, price index creation, and pricing enqueue+run tasks. Useful for reproducible ops and guardrails.

## Database & Migrations Sanity

- Baseline/No-op stubs
  - Many `*_baseline_stub.sql` and `*_noop.sql` files exist. Keep to preserve ordering and avoid “holes” in migration history.
- Today’s related migrations
  - `supabase/migrations/20251102_220843_pricing_refresh_security.sql`:
    - Revokes `process_jobs`/`job_log` from public/anon/auth; grants to `service_role`.
    - Adds `pricing_health_v` (latest MV observed_at, MV row count, 24h job stats).
  - `supabase/migrations/20251102_221736_pricing_ops_hygiene.sql`:
    - Adds `prune_old_jobs()` SECURITY DEFINER; schedules weekly via pg_cron when present.
    - Adds `pricing_alerts_v` (staleness and failed jobs signals).
- Compat & indices (present as of 2025-11-03)
  - `supabase/migrations/20251103_compat_set_counts.sql`:
    - Adds `v_set_print_counts` (en, grouped by set_code), optional `card_catalog` shim.
    - Grants select to anon/auth/service_role.
  - `supabase/migrations/20251103_card_prints_index_lang_en.sql`:
    - Adds partial index `card_prints_set_lang_idx` on `card_prints(set_code)` for `lang='en'`.
- Potential pitfalls
  - Ensure grants on `pricing_health_v` allow anon reads if the Flutter client calls it directly. If internal-only, expose a thin RPC/proxy and update the client.
  - Confirm MV `latest_card_prices_mv` refresh job is registered and not double-scheduled (Edge `pricing_refresh` handles enqueue+process_once). 

## Edge Functions & API Health

- Functions and env dependencies (auto-scanned)
  - Examples: `pricing_refresh` (SRK), `import-prices` (SRK + POKEMON_TCG_API_KEY), `system_health` (SRK + webhook), `prices_status` (PRICE_API_BASE_URL/KEY), `ebay_sold_engine` (eBay token), `ext_gateway`/`floor_engine` (JUSTTCG + SRK), and others.
  - Full list was scanned from `supabase/functions/**/index.ts` for `Deno.env.get(...)` usage.
- Hardening observations
  - `pricing_refresh` enforces SRK presence and returns 405 on non‑POST.
  - `import-prices` writes via PostgREST using SRK; performs post‑import enqueue and single worker run with dedupe. Inputs accept multiple set_code variants; includes debug surface.
  - `system_health` pings internal paths and persists best‑effort `system_health_runs`; webhook optional.
- Gaps to consider
  - Timeouts/retries: use `AbortController` or fetch timeouts on network calls (e.g., PTCG, eBay, JustTCG) to avoid long‑running invocations.
  - Circuit breakers: consider minimum backoff and capped concurrency on job workers (config exists but verify enforced).
  - Error handling: most functions catch broadly but should bound response payloads and redact secrets in logs.

## Security & RLS

- Public Wall MVP
  - `20251103_120000_public_wall_mvp.sql` enables RLS on `seller_profiles`, `listings`, `listing_photos`; defines owner CRUD and anon read-only for active listings via `public.wall_feed_v`.
- Other tables/views used by client
  - Client selects from: `v_card_search`, `card_prints`, `v_recently_added`, `v_vault_items`, `wishlist_items`, `user_vault`, `public_wall_v`, `pricing_health_v`, etc. Verify RLS policies and minimal grants (anon selects only for intended read paths; writes through authenticated owners).
- SRK usage
  - No SRK on client side observed; SRK is confined to Edge Functions and scripts. Keep SRK only in server/Edge environments.
- PostgREST exposure
  - Views like `pricing_health_v` and `v_set_print_counts` are safe to expose read‑only; confirm no PII. Restrict base tables as needed via RLS and revoke explicit table grants from anon/auth when views suffice.

## Performance & Cost Risk

- Client `.select('*')`
  - Found in: `lib/features/dev/diagnostics/pricing_probe_page.dart:58`, `lib/services/vault_service.dart:91`, and elsewhere. Prefer explicit column projections to reduce payload and CPU.
- Index coverage
  - New `card_prints_set_lang_idx` aids set/lang counts. Listing indices (`status`, `status,created_at`, `card_print_id`) look adequate for wall feed.
  - Validate indices for common filters in `v_card_search`, `v_vault_items`, and price lookups (e.g., `card_id`, `condition`).
- Network egress
  - Avoid large images in feeds; consider thumb URLs in `wall_feed_v` and lazy load full images.
- Polling/chatty loops
  - Pricing health is cached in-session (5 min). Ensure other periodic probes (e.g., dev pages) are off in production builds.

## UI/UX Consistency & Accent/Glow Direction

- Tokens
  - `lib/ui/tokens/colors.dart` defines light/dark palettes with an electric-blue accent.
- Inconsistencies to watch
  - Screens using ad-hoc paddings or default Material chips/buttons may clash with the premium look. Converge on shared components (chip/button/card) using tokens.
- Surgical plan
  - Add shared GlowChip/GlowButton components with subtle shadows (avoid text glow). Limit glow to focus/selected states and key accents.
  - Keep elevation ≤ 2 for cards; use frosted headers only on top-level pages (home, search) with scroll blur.
  - Respect text contrast; avoid blue glow on text—use accent for outlines/indicators instead.

## Known Issues & Threads

- 404 on `manual_price_overrides`
  - No occurrences in repo. If clients or scripts expect this resource, create a compat view or update callers. Quick fix: add `manual_price_overrides_v` view pointing to the canonical overrides table (if exists) or remove references.
- Diagnostics alignment
  - `compute_missing_cards.ps1` implements a robust fallback chain (primary `card_prints` group → `v_set_print_counts` → SRK function probe using `check-sets` + `import-cards?op=probe`). The Nov 3 compat migration ensures the middle step is available.
  - `scan_schema_compat.ps1` scans repo REST usage and flags missing endpoints; suggests `card_catalog` shim when absent.

## What to Run Next (evidence generation)

```powershell
mkdir -Force scripts\diagnostics\output | Out-Null
flutter --version > scripts\diagnostics\output\flutter_version.txt 2>&1
flutter analyze > scripts\diagnostics\output\flutter_analyze.txt 2>&1
dart pub outdated > scripts\diagnostics\output\dart_outdated.txt 2>&1
dart fix --dry-run > scripts\diagnostics\output\dart_fix_dry_run.txt 2>&1
flutter build apk --debug > scripts\diagnostics\output\android_build_debug.txt 2>&1
supabase db lint > scripts\diagnostics\output\supabase_db_lint.txt 2>&1
supabase db diff > scripts\diagnostics\output\supabase_db_diff.txt 2>&1
pwsh -File scripts\tools\scan_schema_compat.ps1 -Verbose *> scripts\diagnostics\output\scan_schema_compat_verbose.txt
pwsh -File scripts\diagnostics\compute_missing_cards.ps1 -Verbose *> scripts\diagnostics\output\compute_missing_cards_verbose.txt
```

