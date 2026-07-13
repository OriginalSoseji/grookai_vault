# Scanner V5 Launch Checkpoint

Date: 2026-07-13
Branch: `main`

## Status

Scanner V5 is wired to the app and the production health endpoint is reachable,
but the launch gate is not fully closed because there is no current 20-card
real-device session summary in the repo.

## Active App Wiring

- App screen: `lib/screens/scanner_v5/scan_capture_v5_screen.dart`
- Service entry point: `lib/services/scanner_v5/scanner_v5_identity_service.dart`
- Default identify endpoint:
  `https://scanner-identity.grookaivault.com/scanner-v5/identify`
- Override flags:
  - `SCANNER_V5_IDENTIFY_ENDPOINT`
  - `SCANNER_V5_ENDPOINT`
- Physical-device guard:
  `scannerV5EndpointNotConfiguredForDevice` blocks localhost-style endpoints
  on Android/iOS devices.

## Live Endpoint Health

Checked from this workspace on 2026-07-13:

- Health URL:
  `https://scanner-identity.grookaivault.com/scanner-v5/health`
- HTTP status: `200`
- Service: `scanner_v5_identity_service_v1`
- Contract: `SCANNER_V5_IDENTIFY_CONTRACT_V1`
- Started at: `2026-07-09T02:46:45.203Z`
- Artifact dir:
  `/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1`
- Reference count: `24715`
- Debug artifacts: `false`

Five health checks completed with round-trip timings:

```text
637 ms, 486 ms, 249 ms, 220 ms, 928 ms
```

These are endpoint health round trips only. They do not prove identify-path
latency or recognition accuracy.

## Fixture Regression

Command:

```powershell
npm --prefix backend run scanner:identity:v5:regression
```

Result:

- Passed: yes
- Case count: `4`
- Scored cases: `3`
- Skipped: `0`
- Top-1: `1.0`
- Top-3: `1.0`
- OCR p50: `620.149 ms`
- Embedding p50: `null` because scored cases resolved through OCR exact mode
- Parser source: `tesseract`

This proves the committed fixture harness is healthy. It is not a real-device
launch proof because it uses committed fixture images and the fixture artifact,
not the production full compact artifact through the phone camera flow.

## Launch Gate

Not launch-closed.

Required before marking Scanner V5 ready:

1. Run `docs/tests/scanner_v5_live_session_verify.md` on an Android or iOS
   device against the production endpoint or a LAN-hosted full artifact.
2. Capture and preserve a 20-card mixed-era session log.
3. Parse it with:

   ```powershell
   node backend/identity_v3/scanner_v5/parse_session_log_v1.mjs path\to\session-log.jsonl `
     --out .tmp\scanner_v5_live_session\latest_summary.json
   ```

4. Record launch metrics in a follow-up checkpoint:
   - active endpoint
   - app build/device
   - card count
   - top-1 confirmation rate
   - top-3 confirmation rate
   - retake rate
   - p50/p95 shutter-to-confirm latency
   - non-rank-1 confirmations
   - app-side dead ends

## Current Conclusion

Scanner V5 is service-reachable and code-regression clean, but launch readiness
still depends on real-device evidence. Keep the launch blocker open until that
session is captured and summarized.
