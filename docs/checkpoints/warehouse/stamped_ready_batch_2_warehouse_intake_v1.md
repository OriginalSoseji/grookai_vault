# stamped_ready_batch_2_warehouse_intake_v1

## Context
- Workflow: `STAMPED_READY_BATCH_2_WAREHOUSE_INTAKE_V1`
- Scope: exact existing 100 staged Batch 2 rows from `docs/checkpoints/warehouse/stamped_ready_batch_2_v1.json`
- Boundary preserved: no re-bridge, no re-classify, no widening beyond the staged 100, no global mapping/image jobs
- Batch composition: 8 `black-and-white-promos-pokemon` rows and 92 `sm-promos-pokemon` rows
- Stamp-label mix: 50 `Prerelease Stamp`, 50 `Staff Prerelease Stamp`

## Outcome
- Batch size attempted: 100
- Batch size completed: 100
- Rows classified: 100 (already complete before this resume pass)
- Rows staged: 100
- Rows approved: 100
- Rows promoted: 100
- Rows mapped: 100
- Rows image-closed: 100
- Failures: 0
- Recommended next execution step: `STAMPED_READY_BATCH_3_WAREHOUSE_INTAKE_V1_250`

## Precheck
- `canon_warehouse_candidates`: `STAGED_FOR_PROMOTION`, `current_review_hold_reason = NULL`, count `100`
- `canon_warehouse_promotion_staging`: `PENDING`, count `100`
- Batch remained deterministic and founder-approved before execution resumed

## Executor Resume
- Dry run on the exact staged 100 completed cleanly: `100/100`, `0` errors
- `PROMO_PREFIX_IDENTITY_RULE_V1` proved effective for `smp` rows:
  - `GV-PK-SM-SM10-PRERELEASE-STAMP`
  - `GV-PK-SM-SM72-STAFF-PRERELEASE-STAMP`
  - `GV-PK-SM-SM204-PRERELEASE-STAMP`
  - `GV-PK-SM-SM221-STAFF-PRERELEASE-STAMP`
- Existing `bwp` behavior remained stable:
  - `GV-PK-PR-BLW-51-PRERELEASE-STAMP`
  - `GV-PK-PR-BLW-84-STAFF-PRERELEASE-STAMP`
- The first apply command timed out at the shell boundary after partial progress, but live-state recheck showed the same bounded executor run completed successfully in the background:
  - warehouse candidates: `PROMOTED = 100`
  - promotion staging: `SUCCEEDED = 100`

## Canon Verification
- Promoted card prints in batch: `100`
- Null/blank stamped `variant_key`: `0`
- Base/stamped separation check:
  - stamped number groups: `50`
  - groups with both stamped variants present: `50`
  - groups with sibling base row still present: `50`
- No identity collapse detected
- No base-row mutation detected

## Mapping Closure
- Worker surface: `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs --input-json docs/checkpoints/warehouse/stamped_ready_batch_2_v1.json`
- Dry run: `would_upsert = 100`, `conflicts = 0`
- Apply: `upserted = 100`
- Verification:
  - mapped promoted rows: `100`
  - duplicate active external ids: `0`
  - rows with multiple active mappings: `0`

## Image Closure
- Worker surface: `backend/images/source_image_enrichment_worker_v1.mjs --input-json docs/checkpoints/warehouse/stamped_ready_batch_2_v1.json`
- Initial dry run exposed 16 stamped rows with no usable direct source image in the routed promo set
- Repair applied: stamped representative fallback now reuses the sibling base canon exact image when the routed promo source lacks a usable asset
- Governance: sibling-base representative fallback is now governed by `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`
- Final dry run: `representative_shared_stamp = 100`, `missing = 0`, `ambiguous = 0`
- Apply: `updated = 100`
- Verification:
  - exact `image_url` rows: `0`
  - `representative_image_url` rows: `100`
  - `image_status = representative_shared_stamp`: `100`
  - image sources:
    - `tcgdex`: `84`
    - `pokemonapi`: `16`
- Truth boundary preserved:
  - no representative image written into `image_url`
  - stamped rows remain representative-only until exact stamped imagery exists

## Representative Closed Examples
- Crobat | `51` | `prerelease_stamp` | `Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-51-PRERELEASE-STAMP`
- Crobat | `51` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-51-STAFF-PRERELEASE-STAMP`
- Flygon | `53` | `prerelease_stamp` | `Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-53-PRERELEASE-STAMP`
- Flygon | `53` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-53-STAFF-PRERELEASE-STAMP`
- Metagross | `75` | `prerelease_stamp` | `Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-75-PRERELEASE-STAMP`
- Porygon-Z | `84` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `bwp` | `GV-PK-PR-BLW-84-STAFF-PRERELEASE-STAMP`
- Shiinotic | `SM10` | `prerelease_stamp` | `Prerelease Stamp` | `smp` | `GV-PK-SM-SM10-PRERELEASE-STAMP`
- Bruxish | `SM11` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `smp` | `GV-PK-SM-SM11-STAFF-PRERELEASE-STAMP`
- Alolan Raichu | `SM72` | `prerelease_stamp` | `Prerelease Stamp` | `smp` | `GV-PK-SM-SM72-PRERELEASE-STAMP`
- Pheromosa | `SM115` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `smp` | `GV-PK-SM-SM115-STAFF-PRERELEASE-STAMP`
- Necrozma | `SM204` | `prerelease_stamp` | `Prerelease Stamp` | `smp` | `GV-PK-SM-SM204-PRERELEASE-STAMP`
- Terrakion | `SM205` | `staff_prerelease_stamp` | `Staff Prerelease Stamp` | `smp` | `GV-PK-SM-SM205-STAFF-PRERELEASE-STAMP`

## Scale Decision
- Batch 2 completed cleanly at 100-row scale
- The prior SMP promo-prefix blocker is closed
- Mapping and image closure both remained bounded to the promoted set
- Chosen next step: `STAMPED_READY_BATCH_3_WAREHOUSE_INTAKE_V1_250`
