# App-Wide Simplification Samsung Smoke Checkpoint

Date: 2026-07-13
Branch: `main`
Base merge commit: `f1d777db`
Cleanup commit: `a3f1e0a1`
Device: Samsung SM-S908U, Android 16, Flutter device id `R5CT3291F6E`

## Result

Status: pass with one release-install blocker noted.

The merged app-wide simplification work boots on the Samsung when launched with
the required mobile Supabase dart-defines:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The first debug launch without dart-defines failed before UI render with the
expected guard:

`Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY`

After relaunching with dart-defines, Supabase initialized, the persisted session
loaded, and the app rendered the Pulse home surface.

## Screens Captured

Local screenshot artifacts:

- `artifacts/screenshots/samsung_main_boot_20260713.png`
- `artifacts/screenshots/samsung_pulse_after_card_back_20260713.png`
- `artifacts/screenshots/samsung_wall_20260713.png`
- `artifacts/screenshots/samsung_vault_20260713.png`
- `artifacts/screenshots/samsung_search_after_wait_20260713.png`

Observed surfaces:

- Pulse loaded with the renamed Pulse top-level surface.
- Pulse card detail route opened and returned cleanly.
- Wall loaded owner profile, section tabs, and grid cards.
- Vault loaded search/filter controls and grid cards.
- Search loaded shell first, then populated Trending now after a short wait.

## Verification

Pre-commit shipcheck passed on `a3f1e0a1`:

- release secret guard
- runtime preflight and contract reports
- web typecheck, lint, and strict build
- `flutter analyze`
- `flutter test` with 280 tests passing

Additional local check:

- `node --check scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs`

## Notes

The release APK build succeeded, but release install was blocked by Android
signature mismatch against the currently installed package:

`INSTALL_FAILED_UPDATE_INCOMPATIBLE`

I did not force-uninstall the package because that can wipe local device app
state. A release-device QA pass needs either the matching signing key or explicit
approval to uninstall the existing package first.

The Search smoke screenshot showed internal ranking score overlays in the debug
build. Treat this as a debug-state observation until confirmed in a release build
with matching signing.
