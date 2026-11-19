# Cross-TCG Custom Binders — 2026-11-19

## Outcome

Custom Binder checklists can combine exact canonical card prints from the
currently enabled app game scopes: Pokémon, One Piece, and Magic: The
Gathering. The custom card search now has an explicit game selector and passes
that scope to the existing game-scoped catalog search. Each selected card
retains its game label in the custom search results and active checklist draft,
so a mixed-game Binder remains legible while it is being assembled.

This is a client and contract change only. Existing custom checklist slots
already store exact canonical card-print IDs and governed finish IDs; no schema
or remote data change is needed.

## Files

- `lib/screens/binders/binder_custom_checklist_screen.dart`
- `lib/screens/binders/binder_create_screen.dart`
- `lib/services/binders/binder_repository.dart`
- `lib/models/binders/binder_models.dart`
- `docs/contracts/COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1.md`
- `docs/CONTRACT_INDEX.md`

## Verification

- 72 focused Binder refinement, integration, and create/controller tests passed.
- `dart format` completed on all touched Dart files.
- `flutter analyze` on changed Dart files reported no issues; `git diff --check` passed.
- Android debug verification build `1.0.0+558` was built with the repository's
  public mobile configuration script.
- Android update preflight passed for package `com.grookai.vault`, version
  `1.0.0`, build 558, and the installed matching signer
  `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2`.
- Build 558 installed in place on Samsung SM-S908U; package readback reports
  version 558 and the app process is running. App data was not cleared.
- On-device custom Binder search returned live Magic: The Gathering results
  for “Black Lotus” and One Piece results for “Luffy”; result subtitles show
  the selected game. The selector lists Pokémon, One Piece, and Magic.
- The on-device exploration did not submit or save a test Binder. The app was
  left in the custom checklist on live One Piece search results.
- Full shipcheck uncovered a narrow-phone overflow in the custom Binder game
  selector. Expanding the dropdown within its field and ellipsizing long game
  names fixed it; all 20 `binder_editor_navigation_test.dart` cases pass across
  dark/light themes, 1.0x/1.6x text, and phone/tablet/compact viewports.
- Full `npm run shipcheck` then passed: release secret guard, runtime preflight,
  contract/service gates, web typecheck and lint, strict production web build,
  Flutter analysis, and the complete Flutter suite (2,071 passed, 2 skipped).
- APK SHA-256:
  `F493D70FBD876C412F703912F7E60930FB4087B8223CA5D41A8EC49E745014B3`.

## Release boundary

Build 558 remains a local Android verification build, not a paired iOS/Android
release. Tailscale SSH access to the Mac has since been restored and Xcode is
available. The full shipcheck is being rerun with the overflow fix; iOS 558 has
not yet been archived, uploaded, or read back from App Store Connect. No commit,
merge, or publication is claimed by this checkpoint.
