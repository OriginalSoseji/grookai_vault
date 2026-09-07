# Sealed Samsung Acceptance And Search Keyboard Repair

Date: 2026-09-07. Scope: bounded signed-in sealed client acceptance, with a
two-line keyboard-focus repair. No catalog, pricing, Storage, visibility, or
Vault mutation was performed by the operator.

## Device And Build

- Samsung SM-S908U is connected and signed in. Existing app data and session
  were preserved; no uninstall, clear-data, or credential changes.
- The installed app used the local Android development certificate, not the
  CI beta certificate. The signed-release APK from run `34138556889` was
  inspected but NOT installed. Replacing signatures would require uninstalling.
- Built matching `profile` / `android-arm64` APK with the existing public-env
  script and both `-EnableMtgSealed` and `-EnablePokemonSealed`.
- Package `com.grookai.vault`, version `1.0.0`, Android version code `312`.
  This is an in-place local acceptance build, not a new store release.
- Installed APK SHA-256 exactly matches the tested artifact:
  `66b2946fbfad4306473aa59aa7870a5406c2ced6a68acd5b2fd563ac1fdcc194`.
- Source base: `9b45451815cf0115dc47952cad4d3d380f4eeff9`, plus only the
  two focus-dismissal lines in `mtg_sealed_catalog_screen.dart`.

## Observed And Repaired

The shared sealed screen's search arrow submitted a query but left the keyboard
covering product names and prices. Reproduced on Samsung and in widget tests.
Explicitly unfocus on both arrow and IME submission. Query trimming, page reset,
authentication, source authority, pricing and signing behavior are unchanged.

- Before repair: arrow regression tests failed for Pokemon and MTG; IME tests
  passed. After repair: all four pass.
- Existing sealed client tests plus focus regressions: 14/14 pass.
- Scoped Dart analysis, secret-packaging guard and diff check pass.
- Android profile build and in-place installation succeed.

## Physical Samsung Evidence

Operator root:
`C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_device_acceptance/`

Each screenshot has an accompanying Android accessibility XML capture.

- `pokemon_loaded`: populated Pokemon grid, package images, exact product names
  and market prices.
- `bundles_loaded`: bundle filter excludes the collection/case entries and
  retains separate Booster Bundle and Booster Bundle Display products.
- `search_results`: `151` + Bundles returns the two visible English products;
  before-fix screenshot also captures the obstructing keyboard.
- `japanese_151`: adding Japanese produces a clear empty state, not English
  fallback matches. This is current release coverage, not global nonexistence.
- `fixed_page2`: next-page action loads Page 2 with distinct products and prices.
- `fixed_search_typed`: focused input before submission on the repaired APK.
- `fixed_search_results`: submitting `151` resets Page 2 to Page 1; input is no
  longer focused, keyboard is gone, names/images/prices remain visible.
- MTG focus behavior is widget-tested here; no new physical MTG journey is
  claimed by these Pokemon screenshots.

Loading pauses are still visible. Screenshot intervals include operator/capture
overhead, so they are not a p95 latency benchmark. General speed optimization
remains open; this is functional acceptance of the bounded flows above.

## iPhone Boundary

Mac CoreDevice reports the paired iPhone 17 Pro available with build 312 still
installed. Existing TestFlight build 313 remains the processed sealed-enabled
candidate, not installed on this phone during this check.

An isolated Xcode UI probe failed signing from SSH, then signed successfully in
the existing desktop session without changing certificates or keychain security.
Xcode then explicitly reported the physical iPhone locked. The waiting probe was
cancelled and its process exit verified (143). No unlock was automated and no
TestFlight update or physical iPhone acceptance is claimed. Retained logs:
`testflight_gui.log`, `testflight_gui.exit`; isolated Mac probe directory:
`~/grookai_sealed_device_acceptance_20260907`.

## Next Gates

1. Merge the tested keyboard repair after remote checks. A later iOS build must
   include it; existing TestFlight 313 predates this repair.
2. Finish physical iPhone signed-in browse when Xcode can launch on the unlocked
   device. Availability and `passcodeRequired=false` alone do not prove this.
3. Preserve freshness/image exclusions and the other release gates in
   `POKEMON_SEALED_FRESHNESS_PROOF_20260907.md` and `SEALED_CLIENT_CLOSEOUT_20260907.md`.
4. Do not re-run source ingestion, extend stale dates, remove image backgrounds,
   or submit a public store release as part of this acceptance fix.
