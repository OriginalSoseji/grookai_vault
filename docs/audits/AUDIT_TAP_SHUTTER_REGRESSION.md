# AUDIT_TAP_SHUTTER_REGRESSION

## Scope
- Root tree: `lib/main.dart`
- Capture and identity screens:
  - `lib/screens/scanner/condition_camera_screen.dart`
  - `lib/screens/identity_scan/identity_scan_screen.dart`
  - `lib/screens/scanner/scan_capture_screen.dart`
  - `lib/screens/scanner/quad_adjust_screen.dart`
- Overlay widget: `lib/widgets/scanner/condition_capture_overlay.dart`

## A) Global Pointer Intake Proof
- Added a root-level guarded touch logger in `lib/main.dart:17`, `lib/main.dart:771`, `lib/main.dart:772`.
- Logger output format: `[TOUCH] down x=... y=...` in `lib/main.dart:776`.
- Default is production-safe off: `const bool kDebugTouchLog = false;` in `lib/main.dart:17`.

## B) Hit-Test Swallow Audit
- Repo scan found no global `AbsorbPointer`, `ModalBarrier`, `OverlayEntry`, or fullscreen global barrier wrappers under `lib/`.
- Scanner overlay is fullscreen paint UI (`Stack` + `Positioned.fill`) and is non-interactive by design in `lib/widgets/scanner/condition_capture_overlay.dart:24`.
- Condition camera composes this overlay in a stacked preview in `lib/screens/scanner/condition_camera_screen.dart:240`.

## C) Shutter Gating Audit
- Shutter callback is null-gated by readiness/busy state:
  - `onTap: (_takingPicture || !_shutterReady) ? null : ...` in `lib/screens/scanner/condition_camera_screen.dart:258`.
- Readiness flips from quad detection only:
  - `_shutterReady = true` in `lib/screens/scanner/condition_camera_screen.dart:99`.
  - `_shutterReady = false` in `lib/screens/scanner/condition_camera_screen.dart:109`.
- Other scan buttons are intentionally null-gated by busy flags with normal reset paths:
  - Identity flow `_submitting` set/reset in `lib/screens/identity_scan/identity_scan_screen.dart:116`, `lib/screens/identity_scan/identity_scan_screen.dart:149`.
  - Condition flow `_submitting` set/reset in `lib/screens/scanner/scan_capture_screen.dart:107`, `lib/screens/scanner/scan_capture_screen.dart:159`.

## D) Capture Early-Return Audit
- `_takePicture()` early returns are present for controller null/not initialized/already taking in `lib/screens/scanner/condition_camera_screen.dart:131`.
- Busy flag set before capture and released on error path is present in this method.

## Most Likely Root Cause
- Touches were intermittently swallowed by fullscreen non-interactive overlay layers in scanner UI composition.
- Evidence:
  - Fullscreen overlay painter widget exists in `lib/widgets/scanner/condition_capture_overlay.dart:24`.
  - Shutter uses null-gated callback, so any missed hit test leaves capture seemingly inactive (`lib/screens/scanner/condition_camera_screen.dart:258`).

## Deterministic Minimal Fix Implemented
- Hardened the overlay itself so it can never capture touches regardless of call site:
  - Wrapped `ConditionCaptureOverlay` root with `IgnorePointer(ignoring: true)` in `lib/widgets/scanner/condition_capture_overlay.dart:24`.
- Added root touch intake logger behind a single debug flag:
  - `kDebugTouchLog` in `lib/main.dart:17`.
  - Root `Listener` wrapper in `lib/main.dart:772`.

## Validation
- Analyzer check (errors only) passes:
  - `flutter analyze lib/main.dart lib/widgets/scanner/condition_capture_overlay.dart lib/screens/scanner/condition_camera_screen.dart lib/screens/identity_scan/identity_scan_screen.dart lib/screens/scanner/scan_capture_screen.dart lib/screens/scanner/quad_adjust_screen.dart --no-fatal-infos --no-fatal-warnings`

## Rollback Plan
- Disable touch logging (already default): keep `kDebugTouchLog = false` in `lib/main.dart:17`.
- Revert the two files changed for this audit if needed:
  - `lib/main.dart`
  - `lib/widgets/scanner/condition_capture_overlay.dart`
