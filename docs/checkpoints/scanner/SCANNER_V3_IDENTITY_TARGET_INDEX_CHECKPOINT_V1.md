# Scanner V3 Identity Target Index Checkpoint

Date: 2026-05-08
Branch: `scanner-v4-card-present-gate`

## Purpose

This checkpoint freezes the first identity-index coverage pass after the Scanner V4 card-present and tap-selection checkpoint.

The completed scanner foundation now feeds selected cards into the Scanner V3/V8/V9 identity path. This checkpoint proves the active local identity service can return and lock the two physical test cards:

```text
left selected card  -> Diggersby  -> GV-PK-ME03-065 -> me03 #065
right selected card -> Salandit   -> GV-PK-ME03-015 -> me03 #015
```

No scanner detector threshold, OCR path, identity acceptance threshold, Supabase write path, pricing path, ML model, or backend identity worker was changed.

## What Changed

- Added a local Scanner V3 identity index builder:
  - `backend/identity_v3/build_scanner_v3_identity_index_v1.mjs`
- Added reusable Scanner V3 reference view generation:
  - `backend/identity_v3/lib/scanner_v3_reference_views_v1.mjs`
- Built a local uncommitted merged index artifact:
  - `.tmp/scanner_v3_embedding_index_v7_plus_diggersby_salandit_v1.json`

The builder reads existing `card_prints` catalog image fields, downloads reference images into `.tmp`, embeds six reference views per target card, and merges those target references into the existing local V7 index. It does not write Supabase and does not act as runtime identity authority.

## Target Rows

```text
Diggersby
card_id: 0a555f3b-646c-4585-905f-01264a57561e
gv_id:   GV-PK-ME03-065
set:     me03
number:  065

Salandit
card_id: e048de4b-36b9-4d43-acd8-4eca092da4e5
gv_id:   GV-PK-ME03-015
set:     me03
number:  015
```

## Local Index Result

```text
base_reference_count:    188
target_reference_count:  2
merged_reference_count:  190
merged_reference_views:  1140
skipped_downloads:       0
skipped_references:      0
```

The local identity service was restarted with:

```powershell
node backend/identity_v3/run_scanner_v3_identity_service_v1.mjs --index-cache .tmp/scanner_v3_embedding_index_v7_plus_diggersby_salandit_v1.json
```

Health check:

```text
reference_count=190
reference_view_count=1140
index_source=.tmp/scanner_v3_embedding_index_v7_plus_diggersby_salandit_v1.json
```

## What Is Proven

- The active identity service returns both corrected target rows from the merged local index.
- Local endpoint self-check returns each target as top-1 for `artwork`, `center_tight`, and `full_card` probe views.
- Real-device selected-card scan locks the left card as:
  - `Diggersby`
  - `me03 / 065`
  - `identity_locked`
  - `card_present=true`
  - support: `crops 8 recent 3 dist 0.110`
- Real-device selected-card scan locks the right card as:
  - `Salandit`
  - `me03 / 015`
  - `identity_locked`
  - `card_present=true`
  - support: `crops 8 recent 3 dist 0.092`
- Switching cards requires clearing the locked result with the existing `Rescan` action, then tapping the next card.

## Evidence

Local generated evidence is under `.tmp/scanner_v3_identity_index_builder_v1/`:

- `diggersby_salandit_build_report_v1.json`
- `diggersby_salandit_service_selfcheck_v1.json`
- `diggersby_salandit_real_device_identity_report_v1.json`

Real-device screenshots:

- `.tmp/scanner_v3_identity_left_later.png`
- `.tmp/scanner_v3_identity_right_diagnostics.png`

## Verification

Completed for this checkpoint:

```text
git diff --check
node --check backend/identity_v3/build_scanner_v3_identity_index_v1.mjs
node --check backend/identity_v3/lib/scanner_v3_reference_views_v1.mjs
```

## Boundaries

This checkpoint is identity reference coverage work only.

Do not infer broader catalog identity accuracy from this result. The proof is scoped to the two physical target cards and the active 190-reference local Scanner V3 index.

Do not weaken V9 acceptance gates to improve lock rate. The successful locks here came from adding the missing reference rows, not from lowering confidence requirements.

## Next Work

- Decide whether the target-index builder remains a local dev utility or becomes the approved way to expand the Scanner V3 reference index.
- Replace the two-card target artifact with a broader governed scanner identity index.
- Address the existing debug-panel vertical overflow before relying on expanded diagnostics screenshots for polished demos.
- Improve selected-card switching after a lock so a user can tap another card without first pressing `Rescan`.
