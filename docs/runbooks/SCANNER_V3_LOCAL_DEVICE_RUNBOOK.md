# Scanner V3 Local Device Runbook

This runbook starts the local Scanner V3 identity service and installs a debug APK that points the Samsung device at that service.

## 1. Start Identity Service

```powershell
cd C:\grookai_vault
node backend/identity_v3/run_scanner_v3_identity_service_v1.mjs
```

Expected:

- server starts on `0.0.0.0:8787`;
- embedding model warms successfully;
- health output reports the V7 or V5 embedding index;
- reference count is non-zero.

## 2. Health Check

In another terminal:

```powershell
curl http://localhost:8787/health
```

Expected response includes:

```json
{
  "ok": true,
  "service": "scanner_v3_identity_service_v1",
  "endpoints": {
    "embed": "/scanner-v3/embed",
    "candidates": "/scanner-v3/candidates"
  }
}
```

## 3. Connect Samsung And Reverse Port

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb shell settings put global stay_on_while_plugged_in 3
& $adb reverse tcp:8787 tcp:8787
```

Expected device:

```text
R5CT3291F6E    device
```

## 4. Build APK With Endpoints

```powershell
flutter build apk --debug `
  --dart-define=SCANNER_V3_EMBEDDING_ENDPOINT=http://127.0.0.1:8787/scanner-v3/embed `
  --dart-define=SCANNER_V3_VECTOR_ENDPOINT=http://127.0.0.1:8787/scanner-v3/candidates
```

## 5. Install

```powershell
& $adb install -r build\app\outputs\flutter-apk\app-debug.apk
```

## 6. Launch

```powershell
& $adb shell monkey -p com.example.grookai_vault -c android.intent.category.LAUNCHER 1
```

Open the Scan tab.

## 7. Expected UI States

- `Align card`: camera is live, no candidate shown.
- `Reading card`: at least one V8/V9 candidate is present, but confidence guard has not accepted it.
- `Need a clearer angle`: candidate evidence is ambiguous or glare/angle is weak.
- `No confident match`: scanner has insufficient identity confidence; use `Try again` or `Search manually`.
- `Card found`: V9 guard accepted a stable candidate.
- `Scanner identity service unavailable`: endpoint config or local service connection is missing. Open debug Diagnostics for the exact reason.

Production UI shows one primary candidate only. Raw IDs, timing, crop support, and endpoint details are debug-only Diagnostics.

## 8. Troubleshooting

If candidates do not appear:

1. Confirm the identity service terminal is still running.
2. Confirm `curl http://localhost:8787/health` returns `ok: true`.
3. Re-run `adb reverse tcp:8787 tcp:8787` after reconnecting the phone.
4. Confirm the APK was built with both dart-defines.
5. Open Diagnostics and check `service`, `timing`, and `top5`.

If the card is out of the local reference index, the correct behavior is `No confident match` or `Need a clearer angle`, not a wrong final identity.
