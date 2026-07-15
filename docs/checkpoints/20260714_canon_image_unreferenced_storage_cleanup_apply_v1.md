# Canon Image Unreferenced Storage Cleanup Apply V1

Date: 2026-07-14

## Scope

Ran the image playbook cleanup against the full canon image storage surface after the full DB scan showed old unreferenced self-hosted image objects.

## Apply Result

- Bucket: `user-card-images`
- Deleted prefix: `warehouse-derived/self-hosted-images-v1/card_prints/`
- Requested deletes: 3,061
- Removed objects: 3,061
- Errors: 0
- Deleted bytes: 504,415,965

The apply script rechecked database references immediately before deletion and only removed image objects that were still unreferenced, older than 7 days, non-empty, and outside held proof-artifact prefixes.

## Post-Cleanup Verification

Full DB image playbook scan:

- Parent rows scanned: 53,316
- Child rows scanned: 70,090
- Storage objects scanned: 51,964
- Identity rows with canon image paths: 80,206
- Missing storage objects for referenced image paths: 0
- Non-image referenced storage objects: 0
- Zero-byte referenced storage objects: 0
- Rows with selected bad image patterns: 0
- Japanese rows with selected bad image patterns: 0
- Unreferenced suspicious storage objects: 0

Cleanup plan after apply:

- Referenced canon image paths: 51,945
- Unreferenced canon storage objects: 19
- Delete candidates: 0
- Hold objects: 19
- Delete candidate bytes: 0

The 19 remaining unreferenced canon objects are held `warehouse-derived/image-truth-v1/` proof artifacts, not self-hosted image candidates.

## Evidence

- Full DB scan: `docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.json`
- Full DB scan summary: `docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.md`
- Cleanup plan: `docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_plan_v1.json`
- Cleanup plan summary: `docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_plan_v1.md`
- Cleanup manifest: `docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_manifest_v1.jsonl`
- Apply script: `scripts/audits/canon_image_unreferenced_storage_cleanup_apply_v1.mjs`

## Test Gate

`npm run contracts:test` passed after cleanup.

- Tests: 692
- Passed: 692
- Failed: 0
