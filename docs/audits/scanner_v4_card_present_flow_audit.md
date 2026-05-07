# Scanner V4 Card-Present Gate Audit

Branch: `scanner-v4-card-present-gate`

Date: 2026-05-07

Scope: scanner-only card-present gate, scanner V4 diagnostics, and ADB debug auto-test plumbing. This audit intentionally excludes detector threshold tuning, OCR, retrieval, identity model changes, ML changes, Supabase, pricing, and backend identity workers.

## Result

The scanner live loop now blocks identity work until a card-present decision has passed. Background and empty-desk scenes can still produce native quad detections, but those detections no longer allow identity to start unless the card-present gate accepts the normalized frame.

The debug auto-test runner can be started from ADB when the scanner is already open, and the PowerShell ADB script plus Node report parser are retained as the repeatable real-device validation path.

## Implemented Gate

The live scanner path records a scanner V4 diagnostic snapshot for sampled live-loop frames. Each snapshot includes native detector state, selected quad source, card-present state and reason, identity eligibility, identity start state, native diagnostics usability, and card-present metrics.

Identity is gated behind card-present persistence. A sampled frame that fails card-present publishes a blocked state, clears identity state, and does not start identity work. A sampled frame that passes card-present must satisfy the persistence gate before identity is marked allowed and before identity starts.

Native detector success is now treated as required evidence for card-present. Scanner fallback quads can support normalization/debug display, but they do not by themselves satisfy the card-present gate.

## Real-Device Evidence

Primary combined evidence:

- `.tmp/scanner_v4_real_device_reports/scanner_v4_card_present_gate_combined_evidence_v1.json`
- `.tmp/scanner_v4_real_device_reports/scanner_v4_real_card_phase_valid_report_v1.json`
- `.tmp/scanner_v4_real_device_reports/scanner_v4_gate_fix_unlocked_run_process.out.log`
- `.tmp/scanner_v4_real_device_reports/scanner_v4_real_device_auto_test_report_v1.json`

The combined evidence is assembled from separate valid physical setups because the device cannot change scenes unattended during one fully automated run.

### Empty Desk

Source: `.tmp/scanner_v4_real_device_reports/scanner_v4_gate_fix_unlocked_run_process.out.log`

Status: `WARN`, valid scene, reason `empty_scene_identity_blocked`

- Total frames: `23`
- Native success frames: `23`
- Card-present frames: `0`
- Identity-allowed frames: `0`
- Identity-started frames: `0`

This proves that an empty/background scene can still produce native detections, but the card-present gate blocks identity.

### Partial Edge / Background

Source: `.tmp/scanner_v4_real_device_reports/scanner_v4_gate_fix_unlocked_run_process.out.log`

Status: `WARN`, valid scene, reason `empty_scene_identity_blocked`

- Total frames: `25`
- Native success frames: `25`
- Card-present frames: `0`
- Identity-allowed frames: `0`
- Identity-started frames: `0`

This proves that partial/background structure is also blocked from identity start.

### Real Card

Source: `.tmp/scanner_v4_real_device_reports/scanner_v4_real_card_phase_valid_report_v1.json`

Status: `PASS`, valid scene, reason `real_card_detected`, ordering `pass`

- Total frames: `15`
- Native success frames: `15`
- Card-present frames: `11`
- Identity-allowed frames: `11`
- Identity-started frames: `11`

This proves that a real card in view can pass the gate and start identity after card-present eligibility is satisfied.

## Overall Evidence Conclusions

- Empty/background identity blocked: `true`
- Real card detected: `true`
- ADB auto-start fixed: `true`
- Production detector changed: `false`
- Production identity/OCR/retrieval/ML changed: `false`

## Retained Debug Plumbing

The following scanner debug plumbing is intentionally retained:

- `lib/services/scanner_v4/scanner_v4_debug_action_bus_v1.dart`
- `lib/services/scanner_v4/scanner_v4_diagnostic_capture_v1.dart`
- `lib/services/scanner_v4/scanner_v4_diagnostic_test_runner_v1.dart`
- `backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs`
- `scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1`
- Android debug intent bridge used to deliver `gv_debug_action=scanner_v4_auto_test`

Temporary per-frame console logging has been removed from the scanner camera path; the remaining scanner V4 log markers are part of the ADB runner/report extraction contract.
