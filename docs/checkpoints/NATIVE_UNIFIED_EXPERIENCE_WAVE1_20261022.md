# Native Unified Experience Wave 1 — October 22, 2026

## Purpose

Wave 1 reconciles the native launch-polish project onto current `origin/main`
without importing the separate web-seasonal or scanner projects. The bounded
scope is Roboto, grookai branding, primary navigation, the Pulse/Discovery
feed, and Vault ownership presentation.

## Reconciliation authority

- Destination base: `d48239a926276e4dbdd19149f1ecb860b1ec6d0e`
- Preserved source: `c1a28eb710096416dde440da98fb2f7bb89aedfb`
- Integration branch: `integration/native-unified-wave1-20261022`
- Source preservation bundle:
  `C:\grookai_vault_operator_artifacts\native_unified_wave1_20261022\launch_polish_source.bundle`
- Bundle SHA-256:
  `577876B119AE940570AD1A1478C0802CBFD7B65ECD540C80A8FF444D0AE07E49`
- A clean short-path restore drill reproduced the source commit at
  `C:\gvw1_restore`; its evidence is stored beside the bundle in
  `restore_drill_longpaths.txt`.

## Included behavior

- Bundles Roboto weights 100, 300, 400, 500, 700, and 900 and applies Roboto
  globally through `GvTypography` and the shared native themes.
- Centralizes standalone product lockups in `GrookaiBrandText`, keeps the
  lowercase `grookai` and `grookai vault` names, and uses the original logo
  asset in the shell header instead of a replacement monogram.
- Keeps the primary mobile and desktop order `Pulse · Wall · Scan · Vault ·
  Search`, restores the branded activity entry point, and keeps account and
  drawer actions clear of device safe areas.
- Diversifies Discovery sessions across card families, collectors, sets, lead
  lanes, and refreshes; weaves collector activity into the complete Pokémon,
  Magic, and One Piece catalog lanes; and keeps the TCG selector reachable
  after scrolling.
- Preserves progressive first paint while pricing and ownership hydrate in the
  background.
- Requires an exact printing before a Vault write, makes owned variants
  editable within the same parent identity, and keeps copy-level mutations
  anchored to the existing owner and owned instance.
- Routes Scanner V5 and both retained scanner fallbacks through the shared
  exact-variant picker before their Vault writes, closing the review-discovered
  gap between scan identification and the printing requirement.
- Applies shared 9 px card-grid spacing and compact content-first headers to
  the native collection surfaces covered by the source project.

## Deliberate exclusions

- No `apps/web` files or seasonal web behavior.
- No scanner-project feature work or scanner-notice redesign. The only scanner
  changes wire existing add routes to the shared exact-variant picker required
  by this wave's Vault write contract.
- No pricing publication, catalog backfill, Supabase migration, workflow, or
  production data change.
- No stale project checkpoint or contract overwrite.

## Verification

- `dart format` on all changed Dart files: passed.
- `git diff --cached --check`: passed.
- `flutter analyze`: no issues.
- Focused native contract tests for typography, navigation, feed diversity,
  grid rhythm, content hierarchy, and Vault variant identity: passed.
- Selected Node contract tests for native ownership, shell, exact-printing
  messages, Vendor Mode, and platform bootstrap: passed.
- Full Flutter suite after review corrections: 1,456 passed, 2 intentionally
  skipped.
- Grookai Object renderer golden suite: 19 passed after updating the three
  sale-front references for the required lowercase Roboto Black lockup.
- `flutter build apk --debug`: passed and produced
  `build/app/outputs/flutter-apk/app-debug.apk`.
- The managed pre-commit shipcheck was attempted twice. Its secret-packaging
  guard passed, then the read-only live runtime preflight stopped on
  `ETIMEDOUT` to the configured Supabase database endpoint. The full shipcheck
  is therefore not claimed. The implementation commit uses the intentional
  `git commit --no-verify` path documented by
  `AUTOMATED_SHIP_GUARDS_V1`. The review branch uses the same documented
  `git push --no-verify` path after the identical live preflight timeout; this
  authorizes no merge or deployment bypass.

## Rollback

Revert the Wave 1 integration commit. No database or production-state rollback
is required because this wave changes only checked-in native application code,
assets, tests, and this checkpoint.
