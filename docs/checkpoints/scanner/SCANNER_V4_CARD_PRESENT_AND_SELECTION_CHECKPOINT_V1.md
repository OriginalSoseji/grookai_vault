# Scanner V4 Card Present And Selection Checkpoint

Date: 2026-05-07
Branch: `scanner-v4-card-present-gate`
Commit: `5409d52a86c5d0c6b956e94bad64d50cc84a489e`

## Purpose

This checkpoint freezes the completed Scanner V4 card-present gate, multi-card surround, and tap-to-select identity plumbing before starting identity-index/retrieval coverage work.

The active scanner path is now:

```text
live camera frame
-> native multi-card candidate detection
-> card-present gate blocks empty/background frames
-> visible card boxes render around physical cards
-> tap selects one detected card as the active identity target
-> selected card normalization feeds Scanner V3/V8/V9 identity plumbing
-> identity diagnostics expose candidate names and distances
```

No identity index expansion, retrieval change, OCR authority change, Supabase write path, pricing path, or backend identity-worker change is part of this checkpoint.

## Current Architecture

- Native scanner bridge can return multiple card candidates for the live scanner view.
- Scanner overlay can render multiple card boxes and preserve a tapped selected card.
- Selected card state is retained long enough for identity work instead of expiring during vector lookup.
- Switching selected cards resets live-loop identity vote state so one card's candidates do not bleed into another card.
- Selected cards are passed into the live loop as an explicit `selected_card_target`.
- Selected-card identity state decays through transient detector misses instead of being immediately cleared.
- Scanner V4 diagnostics now include live Top-5 identity candidate names, ids, scores, distances, and support metrics.

## What Is Proven

- Empty/background card-present gate blocks identity:
  - `card_present=0`
  - `identity_allowed=0`
  - `identity_started=0`
- Real card in frame passes the card-present gate:
  - `REAL_CARD: PASS`
  - `total=15 native=15 card_present=11 identity_allowed=11 identity_started=11 ordering=pass`
- Two physical cards can be surrounded at the same time.
- Tapping a card selects that card and keeps the selected box stable instead of drifting back to the pair.
- The selected-card path starts identity and reports named candidates from the active local identity service.
- The Diggersby/Salandit live test did not fail because the scanner could not select the cards; it failed because the active identity index cannot return those cards.

## Evidence

Primary real-device evidence is in `.tmp/scanner_v4_real_device_reports/`:

- `scanner_v4_card_present_gate_combined_evidence_v1.json`
- `scanner_v4_real_card_phase_valid_report_v1.json`
- `scanner_v4_gate_fix_unlocked_run_process.out.log`
- `scanner_v4_real_device_auto_test_report_v1.json`
- `screenshots/selected_card_rank_fix_two_cards_before_tap.png`
- `screenshots/selected_card_rank_fix_left_tap_early.png`
- `screenshots/selected_card_rank_fix_left_tap_late.png`
- `screenshots/selected_card_rank_fix_right_tap_early.png`
- `screenshots/selected_card_rank_fix_right_tap_late.png`
- `identity/identity_fix_two_cards_start.png`
- `identity/identity_fix_left_after_tap.png`

The final identity-index boundary check showed:

```text
.tmp/scanner_v3_embedding_index_v7.json refs=188 Diggersby=0 Salandit=0
.tmp/scanner_v3_embedding_index.json    refs=188 Diggersby=0 Salandit=0
```

## Verification

Scanner verification completed before commit:

```text
git diff --check
flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub
node --check backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs
flutter build apk --debug --dart-define=SCANNER_V3_EMBEDDING_ENDPOINT=http://127.0.0.1:8787/scanner-v3/embed --dart-define=SCANNER_V3_VECTOR_ENDPOINT=http://127.0.0.1:8787/scanner-v3/candidates
adb install -r build\app\outputs\flutter-apk\app-debug.apk
adb reverse tcp:8787 tcp:8787
```

The checkpoint commit also passed the repo pre-commit shipcheck. The shipcheck reported known deferred debt and an existing `WarehouseSubmissionForm.tsx` Next lint warning, but no commit-blocking failure.

## Files In Checkpoint Commit

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/QuadDetectorV1Bridge.kt`
- `lib/screens/scanner/condition_camera_screen.dart`
- `lib/screens/scanner/widgets/scanner_debug_panel.dart`
- `lib/screens/scanner/widgets/scanner_frame_guide.dart`
- `lib/screens/scanner/widgets/scanner_v3_camera_overlay.dart`
- `lib/services/scanner_v3/scanner_v3_live_loop_controller.dart`
- `lib/services/scanner_v4/scanner_v4_diagnostic_capture_v1.dart`

## What Is Not Yet Proven

- Diggersby and Salandit can lock as final identities.
- Broad real-device identity accuracy beyond the current 188-reference local index.
- Production-safe recall for cards absent from the active scanner index.
- Final video-level identity behavior with complete expected card coverage.

## Boundary For Next Work

The next phase is no longer scanner-card selection work. It is identity-index/retrieval coverage work.

Before changing scanner acceptance gates again, the identity system must be able to return the target cards from the local service. For the current physical test pair, that means Diggersby and Salandit must be present in the active scanner identity index or an approved replacement identity source must be connected.

## Do Not Re-Litigate

- Empty/background frames must remain blocked from identity.
- Selected-card identity must reset when the user switches cards.
- Multi-card surround and tap selection are now scanner foundation, not speculative UI.
- Scanner-only guesses are not final identity authority when the card is absent from the active index.
- Do not force acceptance by weakening confidence gates while the target card is not retrievable.

## Next Checkpoint

Create the next checkpoint only after the identity-index/retrieval phase proves that Diggersby and Salandit can be returned by the active identity service and locked from the same real-device two-card setup.
