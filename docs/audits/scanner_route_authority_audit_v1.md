# Scanner Route Authority Audit V1

Date: 2026-05-16
Branch: `scanner-v4-card-present-gate`
Starting HEAD: `1ffecb0`

## Purpose

The previous real-device retest was invalid because the normal scanner route opened the legacy live scanner loop. This audit records every scanner entrypoint found before changing route authority.

## Entrypoints Found

| Entrypoint | File | Route/action label | Current target before this change | Production/user-facing? | Change required | Final intended target |
| --- | --- | --- | --- | --- | --- | --- |
| Bottom navigation Scan tab | `lib/main_shell.dart` | `Scan` | `NativeScannerPhase0Screen` when legacy platform guard allowed; `FixedSlotCaptureScreen` only when `FIXED_SLOT_CAPTURE_SCANNER_V1=true`; otherwise `ConditionCameraScreen` then `IdentityScanScreen` | Yes, identity scanner | Yes | `FixedSlotCaptureScreen` by default |
| Shell scanner V4 ADB debug action | `lib/main_shell.dart` | `scanner_v4_auto_test` | `ConditionCameraScreen(autoStartScannerV4DiagnosticTest: true)` | Debug/developer | No production change; mark legacy at runtime | Legacy debug route only |
| App bootstrap pending scanner V4 debug action | `lib/main.dart` | `scanner_v4_auto_test` before shell ready | `ConditionCameraScreen(autoStartScannerV4DiagnosticTest: true)` | Debug/developer | No production change; mark legacy at runtime | Legacy debug route only |
| Native Phase0 debug prototype button | `lib/screens/scanner/native_scanner_phase0_screen.dart` | `Scanner V3 live loop prototype` | `ConditionCameraScreen(enableScannerV3LiveLoopPrototype: true)` | Debug/developer | No production change; mark legacy at runtime | Legacy debug route only |
| Vault item condition scan tile action | `lib/main_vault.dart` | `Scan (Condition + Fingerprint)` | `ScanCaptureScreen` | User-facing condition/write flow | No; this is not the identify-only Scan tab and changing it would mix vault write flow into this task | `ScanCaptureScreen` |
| Vault item grid menu action | `lib/main_vault.dart` | `Scan card` | `ScanCaptureScreen` | User-facing condition/write flow | No; this is not the identify-only Scan tab and changing it would mix vault write flow into this task | `ScanCaptureScreen` |
| Condition scan image capture | `lib/screens/scanner/scan_capture_screen.dart` | `Capture Front` / `Capture Back` | `ConditionCameraScreen` | Condition/write capture subflow | No; this belongs to the condition scan workflow, not the identify-only fixed-slot scanner | `ConditionCameraScreen` |

## Legacy Live Scanner Authority

The following routes can still open `ConditionCameraScreen` with the Scanner V3/V4 live loop:

- `lib/main_shell.dart` ADB debug action `scanner_v4_auto_test`
- `lib/main.dart` pending debug action `scanner_v4_auto_test`
- `lib/screens/scanner/native_scanner_phase0_screen.dart` debug prototype button
- `lib/main_shell.dart` fallback path only when `FIXED_SLOT_CAPTURE_SCANNER_V1=false`

These are legacy/debug access paths. They are not the production identity scanner route after this change.

## Route Authority Change

The normal app Scan tab now opens `FixedSlotCaptureScreen` by default because `FIXED_SLOT_CAPTURE_SCANNER_V1` defaults to `true`.

The legacy native Phase0 and legacy `ConditionCameraScreen` identity fallback remain compile-safe, but are only reachable by debug/developer paths or by explicitly building with `FIXED_SLOT_CAPTURE_SCANNER_V1=false`.

## Runtime Proof Contract

Opening the production scanner route must log:

```text
[fixed_slot_capture_v1] surface_opened scanner_surface=fixed_slot_capture_v1 identity_mode=still_capture_ann ocr=false live_identity_loop=false
```

Opening the legacy live scanner path logs:

```text
[scanner_legacy_live] surface_opened legacy=true production=false
```

Fixed-slot artifact manifests include:

```json
{
  "scanner_surface": "fixed_slot_capture_v1",
  "identity_mode": "still_capture_ann",
  "ocr": false,
  "live_identity_loop": false,
  "endpoint": "<actual endpoint>"
}
```

## Explicit Non-Changes

- No ANN ranking changes.
- No OCR changes.
- No crop normalization changes.
- No detector threshold changes.
- No vote-state changes.
- No vault write flow changes.
