# PC_SOURCE_OF_TRUTH_AUDIT_V1

## Repo
- path: `/Users/cesarcabral/grookai_vault`
- branch: `main`
- head: `39b5290 network: card interaction redesign v1`

## Surface Ownership
- wall: `lib/screens/public_collector/public_collector_screen.dart`
- network: `lib/screens/network/network_screen.dart`
- scanner: `lib/screens/identity_scan/identity_scan_screen.dart`

## Scanner Routing
- active scanner entry file(s): `lib/screens/identity_scan/identity_scan_screen.dart`
- legacy scanner references still present: `lib/screens/scanner/scan_capture_screen.dart`, `lib/screens/scanner/condition_camera_screen.dart`, `lib/screens/scanner/quad_adjust_screen.dart`
- whether UI still routes to legacy flow: yes in code; `IdentityScanScreen` pushes `ConditionCameraScreen`, and live iOS verification was blocked by build failure

## Launch Verification
- repo terminal cwd used for launch: `/Users/cesarcabral/grookai_vault`
- iPhone simulator command: `flutter run -d B8D3C72A-14B9-4E7C-A42F-AB0C848E42FD`
- iPhone simulator result: failed before app launch in `camera_avfoundation` with `AVCaptureDevice` / `CaptureDevice` conformance error
- macOS command: `flutter run -d macos`
- macOS result: failed to build because `lib/main.dart` imports multiple files not present in this worktree, including `lib/main_shell.dart`, `lib/main_vault.dart`, and several `screens/`, `services/`, and `widgets/` files

## Outcome
- classification: `D. PC is launching from the wrong repo/workspace`
- supporting note: the original active workspace was `/Users/cesarcabral/Desktop/grookai_vault`, which is not a git repo; the confirmed git repo is `/Users/cesarcabral/grookai_vault`, but that worktree is currently not runnable as-is and still carries legacy scanner routing in code
