# SCANNER_ROUTE_AND_REPO_STABILIZATION_V1

## Objective
Stabilize the confirmed real repo by removing legacy scanner handoff and fixing launch blockers in the current worktree.

## Starting State
- repo: `/Users/cesarcabral/grookai_vault`
- head: `39b5290`
- canonical device: `B8D3C72A-14B9-4E7C-A42F-AB0C848E42FD`
- uncommitted local changes before edits:
  - modified: `.flutter-plugins-dependencies`
  - modified: `ios/Flutter/AppFrameworkInfo.plist`
  - modified: `ios/Flutter/Debug.xcconfig`
  - modified: `ios/Flutter/Release.xcconfig`
  - modified: `ios/Runner.xcodeproj/project.pbxproj`
  - modified: `ios/Runner.xcworkspace/contents.xcworkspacedata`
  - modified: `ios/Runner/AppDelegate.swift`
  - modified: `ios/Runner/Info.plist`
  - modified: `macos/Flutter/Flutter-Debug.xcconfig`
  - modified: `macos/Flutter/Flutter-Release.xcconfig`
  - modified: `macos/Runner.xcodeproj/project.pbxproj`
  - modified: `macos/Runner.xcworkspace/contents.xcworkspacedata`
  - modified: `pubspec.lock`
  - untracked: `docs/checkpoints/PC_SOURCE_OF_TRUTH_AUDIT_V1.md`
  - untracked: `ios/Podfile`
  - untracked: `ios/Podfile.lock`
  - untracked: `macos/Podfile`
  - untracked: `macos/Podfile.lock`
  - untracked: `temp/source_of_truth_repo_check.txt`
  - untracked: `temp/source_of_truth_surface_search.txt`

## Scanner Route Audit
- active scanner entry file: `lib/screens/identity_scan/identity_scan_screen.dart`
- legacy handoff line/function: `_captureAndIdentify()` pushes `ConditionCameraScreen` via `Navigator.of(context).push(...)`
- current downstream legacy files:
  - `lib/screens/scanner/condition_camera_screen.dart`
  - `lib/screens/scanner/scan_capture_screen.dart`
  - `lib/screens/scanner/quad_adjust_screen.dart`

## Main Import Audit
- missing imports:
  - `screens/account/account_screen.dart`
  - `screens/compare/compare_screen.dart`
  - `screens/network/network_inbox_screen.dart`
  - `screens/sets/public_set_detail_screen.dart`
  - `screens/sets/public_sets_screen.dart`
  - `screens/vault/vault_manage_card_screen.dart`
  - `services/public/card_surface_pricing_service.dart`
  - `services/public/compare_service.dart`
  - `services/public/public_collector_service.dart`
  - `services/public/public_sets_service.dart`
  - `widgets/card_surface_artwork.dart`
  - `widgets/card_surface_price.dart`
  - `widgets/card_view_mode.dart`
  - `widgets/app_shell_metrics.dart`
  - `main_shell.dart`
  - `main_vault.dart`
- stale imports:
  - `lib/main.dart` currently points at removed app shell modules and removed surface-support modules that are not present anywhere in this worktree
- replacement files if any:
  - active scanner surface: `lib/screens/identity_scan/identity_scan_screen.dart`
  - existing services usable from this worktree: `lib/services/identity/identity_scan_service.dart`, `lib/services/vault/vault_card_service.dart`

## Scanner Stabilization
- legacy handoff removed: yes
- scanner now remains inside: `lib/screens/identity_scan/identity_scan_screen.dart`
- active capture path: `ImagePicker.pickImage(source: ImageSource.camera)` inside `IdentityScanScreen`
- downstream legacy scanner UI on the active path: none

## Launch Stabilization
- `lib/main.dart` was replaced with a minimal app shell that references only files present in this worktree
- stale missing imports removed from the app entrypoint: yes
- removed simulator-blocking legacy plugin dependency: `camera`
- canonical run result: `flutter run -d B8D3C72A-14B9-4E7C-A42F-AB0C848E42FD` launched successfully on iPhone 17 Pro

## Runtime Verification
- verified launch surface via simulator screenshot OCR: `Grookai Vault`
- verified scanner entry via simulator screenshot OCR: `Identity Scan`, `Scan Card`, `Open Camera`, `Gallery`
- immediate legacy route observed from active scanner entry: no
