PR Group: Local DB + Smoke Readiness

- Add/verify VS Code tasks for local flow (already present): `Grookai: Ensure Local Ready`, `Grookai: Start Supabase`, `GV: smoke search_cards`.
- Scripted smoke: `scripts/dev/smoke_local.ps1` (exists) ensures `/rest/v1/rpc/search_cards` returns JSON.
- Rollback: none (read-only). Test: run tasks end-to-end; capture outputs in reports folder.

PR Group: Wall Feed Exposure + Grants

- Ensure objects exist and are exposed:
  - Views/MVs: `public.wall_feed_view`, `public.wall_thumbs_3x4`.
  - Grants: `GRANT SELECT ON public.wall_feed_view, public.wall_thumbs_3x4 TO anon, authenticated;`.
- Refresh: `select public.refresh_wall_thumbs_3x4();` as needed.
- Rollback: `REVOKE` matching grants. Test: GET `/rest/v1/wall_feed_view` returns rows.

PR Group: Search API Contract Hardening

- Canonical RPC: `public.search_cards(q text, "limit" int, "offset" int)` SECURITY DEFINER, `search_path=public`.
- Grants: `GRANT EXECUTE ON FUNCTION public.search_cards(text,int,int) TO anon, authenticated;`.
- Add docs/test: REPORTS/API_CONTRACTS.md and CI DB smoke calling RPC (see REPORTS/CI_CHECKS.md).

PR Group: Flutter Analyzer Cleanups (minor)

- Remove unused variable in scanner flow.
  - lib/features/scanner/scanner_page.dart: remove unused `vs`.
- Remove unnecessary casts in listing prefill.
  - lib/features/wall/create_listing_page.dart: drop `as Map<String, dynamic>?` on `maybeSingle()` results.
- Test: `dart analyze` clean for changed files.

PR Group: Test Harness Fix (GVTheme)

- Wrap `ScanHintSubtitle` test with app/theme provider or a `MaterialApp` that provides `GVTheme`.
- Files: `test/scan_hint_subtitle_test.dart` (add TestApp wrapper).
- Test: `flutter test` passes locally.

PR Group: CI Guardrails

- Add DB smoke job (local container) that: resets DB, seeds one row, calls `search_cards`, verifies 200 + JSON.
- Ensure migrations apply in CI (dry-run lint, then apply to local container).
- See REPORTS/CI_CHECKS.md for YAML.

Before/After Snippets

- scanner_page.dart
  - Before: `final vs = VaultService(Supabase.instance.client);`
  - After: (removed; variable unused)

- create_listing_page.dart
  - Before: `...maybeSingle() as Map<String, dynamic>?;`
  - After: `...maybeSingle();`

