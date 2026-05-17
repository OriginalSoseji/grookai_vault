# Scanner V4 Real Device Empty-Scene Capture V1

Purpose: capture real-device diagnostics from the actual Flutter camera stream -> Dart MethodChannel -> Android native quad detector -> Scanner V3 live-loop/card-present path.

Scope: diagnostics only. Do not tune thresholds, change detector logic, change card-present logic, or change identity behavior while running this protocol.

## Prerequisites

- Build and run a debug build on an Android device.
- Open the scanner flow that uses `ConditionCameraScreen` with the live scanner enabled.
- Expand the in-scanner debug diagnostics panel.
- Confirm the `Scanner V4 Diagnostics` toggle is visible. It is debug-only and should not appear in release builds.

## Export Location

Use the debug panel `Export` action after each test.

The app attempts to write:

```text
scanner_v4_real_device_empty_scene_report_v1.json
```

under the app process temp directory exposed by `Directory.systemTemp`. The console prints the exact path as:

```text
[scanner_v4_diagnostics] saved=<path>
```

If file export fails, the report is printed to the debug console between:

```text
[scanner_v4_diagnostics] report_json_begin
[scanner_v4_diagnostics] report_json_end
```

## Report Summary

Each export contains:

```json
{
  "branch": "scanner-v4-card-present-gate",
  "mode": "real_device_diagnostics",
  "frames": [],
  "summary": {
    "total_frames": 0,
    "native_success_frames": 0,
    "card_present_frames": 0,
    "identity_allowed_frames": 0,
    "identity_started_frames": 0
  }
}
```

Each frame records the native detector status, confidence, point presence, selected quad source, card-present result and reason, identity allowed/started status, and scanner state.

## Test A - Empty Desk

1. Open the scanner.
2. Expand the debug diagnostics panel.
3. Enable `Scanner V4 Diagnostics`.
4. Point the phone at an empty desk for 10 seconds.
5. Tap `Export`.
6. Disable `Scanner V4 Diagnostics`.

Expected:

```text
card_present_frames = 0
identity_allowed_frames = 0
identity_started_frames = 0
```

Native detector success should ideally remain 0. If `native_success_frames > 0`, keep the report. That is the evidence this harness is meant to capture.

## Test B - Partial Edge / Background Texture

1. Enable `Scanner V4 Diagnostics`.
2. Point the phone at a partial edge, wood grain, desk seam, mat border, or other background texture for 10 seconds.
3. Tap `Export`.
4. Disable `Scanner V4 Diagnostics`.

Expected:

```text
native_success_frames may be greater than 0
card_present_frames = 0
identity_allowed_frames = 0
identity_started_frames = 0
```

If card-present or identity counters increase, keep the report and note the scene.

## Test C - Real Card

1. Enable `Scanner V4 Diagnostics`.
2. Place a real card in the scanner view for 10 seconds.
3. Tap `Export`.
4. Disable `Scanner V4 Diagnostics`.

Expected:

```text
native_success_frames > 0
card_present_frames > 0
identity_allowed_frames may be greater than 0 after card_present is true
identity_started_frames may be greater than 0 only after valid card-present state
```

This test confirms the diagnostics capture does not block the normal live scanner path.

## Notes

- Enabling diagnostics starts a fresh capture.
- Disabling diagnostics stops recording but does not erase captured frames.
- Exporting does not call OCR, embeddings, vector search, or any new identity path. It serializes fields already available from the live scanner state.

## Automated Guided Test Runner

Use the automated runner when you want one combined report across all required real-device scenes.

### Start

1. Run a debug Android build on device.
2. Open the scanner.
3. Expand `Diagnostics`.
4. In `Scanner V4 Auto Test`, tap `Start`.
5. Follow the on-screen phase instructions.

The app automatically clears previous diagnostic frames, waits through each countdown, records only during capture windows, stops recording between phases, advances to the next phase, and exports the combined report at completion.

### Phase Sequence

```text
idle
empty_desk_countdown      5 seconds
empty_desk_capture       10 seconds
partial_edge_countdown    5 seconds
partial_edge_capture     10 seconds
real_card_countdown       5 seconds
real_card_capture        10 seconds
complete
```

During each countdown, point the camera as instructed:

- Empty Desk: point at empty desk/background. Do not place a card in frame.
- Partial Edge / Background Texture: point at a desk seam, mat edge, wood grain, or partial rectangle. No card.
- Real Card: place one real card clearly in frame.

### Auto Report Location

The automatic report is named:

```text
scanner_v4_real_device_auto_test_report_v1.json
```

It is written under `Directory.systemTemp`. The console prints:

```text
[scanner_v4_auto_test] complete
empty_desk: PASS/WARN/FAIL
partial_edge: PASS/WARN/FAIL
real_card: PASS/WARN/FAIL
report=<path>
```

If file export fails, the JSON is printed between:

```text
[scanner_v4_auto_test] report_json_begin
[scanner_v4_auto_test] report_json_end
```

You can also tap `Export Last Report` after completion or cancellation to regenerate the combined report from the captured frames currently held in memory.

### Auto Report Structure

```json
{
  "branch": "scanner-v4-card-present-gate",
  "mode": "real_device_auto_test",
  "phases": [
    {
      "phase": "empty_desk",
      "label": "Empty Desk",
      "frames": [],
      "summary": {
        "total_frames": 0,
        "native_success_frames": 0,
        "card_present_frames": 0,
        "identity_allowed_frames": 0,
        "identity_started_frames": 0
      },
      "evaluation": {
        "status": "PASS",
        "reason": "empty_scene_identity_blocked",
        "warnings": [],
        "ordering_check": "not_applicable"
      }
    }
  ],
  "overall_summary": {
    "total_frames": 0,
    "native_success_frames": 0,
    "card_present_frames": 0,
    "identity_allowed_frames": 0,
    "identity_started_frames": 0
  }
}
```

Each frame captured by the automated runner includes `test_phase`.

### Pass/Fail Rules

Empty Desk passes if:

```text
card_present_frames = 0
identity_allowed_frames = 0
identity_started_frames = 0
```

If `native_success_frames > 0`, the phase is marked `WARN` while still preserving the report as useful evidence.

Partial Edge / Background Texture uses the same pass/warn/fail rules as Empty Desk.

Real Card passes if:

```text
native_success_frames > 0
card_present_frames > 0
```

If identity starts, the runner checks frame ordering:

```text
first_identity_started_frame_index >= first_card_present_frame_index
```

If identity-start state is unavailable, the ordering check is marked `unavailable`.

## One-Command ADB Test Session

Use the workstation-side ADB script when you want the app launch, log capture, report extraction, and summary parsing handled from PowerShell.

### Prerequisites

- One Android device connected by USB.
- `adb`, `flutter`, and `node` available on PATH.
- USB debugging enabled.
- The app is logged in on the device, or the scanner cannot be opened past the auth gate.
- Camera permission already granted, or grant it on-device before starting the session.

### Command

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1
```

By default the script derives the app id from `android/app/build.gradle.kts`, builds a debug APK, installs it, launches:

```text
com.example.grookai_vault/.MainActivity
```

and passes the debug-only intent extra:

```text
gv_debug_action=scanner_v4_auto_test
```

For a faster launch against an already-installed debug build:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1 -SkipInstall
```

If package detection ever fails:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1 -AppId com.example.grookai_vault
```

### What Still Requires Physical Positioning

The script prints prompts synced to app phase logs when available:

```text
PHASE 1: Empty Desk
Point the phone at an empty desk/background.

PHASE 2: Partial Edge / Background Texture
Point the phone at a desk seam, mat edge, wood grain, or partial rectangle. No card.

PHASE 3: Real Card
Place one real card clearly in frame.
```

If phase logs are not observed, the script prints the same prompts on the configured timing offsets: 0 seconds, 15 seconds, and 30 seconds.

### Local Report Path

The script saves the report locally at:

```text
.tmp/scanner_v4_real_device_reports/scanner_v4_real_device_auto_test_report_v1.json
```

It first tries to pull the file path printed by the app. If direct `adb pull` fails, it tries `adb exec-out run-as <appId> cat <path>`. If file extraction fails, it extracts the console fallback JSON printed between:

```text
[scanner_v4_auto_test] report_json_begin
[scanner_v4_auto_test] report_json_end
```

### Pass/Warn/Fail Behavior

The script runs:

```text
backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs
```

The parser prints each phase status, counters, warnings, failure reasons, and identity ordering result.

The PowerShell script exits non-zero if:

- no report can be found or extracted
- JSON cannot be parsed
- any phase evaluates to `FAIL`

`WARN` is allowed for native detector false positives in empty/background phases when:

```text
card_present_frames = 0
identity_allowed_frames = 0
identity_started_frames = 0
```

## Zero-Tap USB Debugging Test Flow

Use this flow when the workstation should control all app interaction through USB debugging.

### Command

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1
```

The default mode is:

```text
AutomationMode = Auto
```

In this mode the script:

- verifies `adb` is available
- verifies exactly one Android device is connected
- prints the device screen resolution
- builds and installs the debug APK unless `-SkipInstall` is passed
- starts `adb logcat`
- launches the app with the debug-only `gv_debug_action=scanner_v4_auto_test` intent
- waits for Flutter startup logs
- falls back to `adb shell input tap` automation if auto-start is not observed
- monitors `[scanner_v4_auto_test]` phase and completion logs
- pulls or extracts the JSON report
- runs the Node parser

No app taps are required from the operator.

### What Remains Physical

Only camera scene positioning remains manual:

```text
==== PHASE 1/3 - EMPTY DESK ====
Point phone at empty desk/background.

==== PHASE 2/3 - PARTIAL EDGE ====
Point phone at desk seam / wood grain / partial rectangle.

==== PHASE 3/3 - REAL CARD ====
Place one real card clearly in frame.
```

### Coordinate Recalibration

The script centralizes all fallback tap coordinates:

```powershell
-TapScannerTabX 540 -TapScannerTabY 2200
-TapDiagnosticsExpandX 980 -TapDiagnosticsExpandY 420
-TapAutoTestStartX 820 -TapAutoTestStartY 1280
```

Recalibrate if the device resolution or scanner UI layout changes:

```powershell
adb shell wm size
adb exec-out screencap -p > scanner_screen.png
adb shell input tap X Y
```

Open `scanner_screen.png` in an image viewer, read the pixel coordinate for the scanner tab, diagnostics expansion control, and auto-test start button, then pass the updated values to the script.

To force coordinate automation instead of the debug intent:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1 -AutomationMode Taps
```

### Timeout Behavior

Default timeout:

```text
120 seconds
```

Failure recovery messages identify the failed step. Common examples:

```text
FAILED: Scanner V4 auto test did not start within 120 seconds.
ACTION: recalibrate tap coordinates or verify the debug intent hook.
```

```text
FAILED: Scanner V4 auto test started but did not complete within 120 seconds.
ACTION: check app crash, camera permission, and logcat output.
```

### Screenshots

The script captures screenshots during phase transitions and failure states unless `-NoScreenshots` is passed.

Screenshots are saved under:

```text
.tmp/scanner_v4_real_device_reports/screenshots/
```

### Reports And Logs

Local report:

```text
.tmp/scanner_v4_real_device_reports/scanner_v4_real_device_auto_test_report_v1.json
```

Logcat capture:

```text
.tmp/scanner_v4_real_device_reports/scanner_v4_adb_auto_test_v1.log
```

Parser summary includes:

```text
EMPTY_DESK: PASS/WARN/FAIL
PARTIAL_EDGE: PASS/WARN/FAIL
REAL_CARD: PASS/WARN/FAIL
```
