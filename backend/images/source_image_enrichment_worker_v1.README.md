# source_image_enrichment_worker_v1

## 1. Purpose

`source_image_enrichment_worker_v1.mjs` applies exact or representative image enrichment for source-backed canonical rows. In Prize Pack closure it is used in bounded input-json mode to mark promoted stamped rows with honest representative shared-stamp coverage while leaving exact image fields untouched.

## 2. Why it exists

Prize Pack stamped rows often lack exact routed source imagery, but the UI still needs transparent representative coverage. This worker enforces the difference between exact images and representative fallback so image closure does not corrupt identity truth.

## 3. Inputs

- CLI: `node backend/images/source_image_enrichment_worker_v1.mjs --input-json <path> --apply`
- Alternative CLI for other domains: `--set-code <code>`, but Prize Pack closure should use `--input-json`.
- Exact batch closure JSON containing promoted rows.
- Live DB access to card prints and image fields.

## 4. Outputs

- Representative image fields or image status for exact promoted rows.
- Batch checkpoint image result such as `representative_shared_stamp`.
- No exact `image_url` overwrite when only representative fallback is available.
- No canon identity writes.

## 5. Safe usage

- Use `--input-json` with the exact promoted batch closure file.
- Verify `image_url` remains exact-only.
- Verify representative fallback is labeled as representative.
- Confirm image-closed count equals promoted count.

## 6. Unsafe usage

- Running a set-wide image job during a Prize Pack batch.
- Writing representative fallback into exact `image_url`.
- Using an unrelated base image when no deterministic sibling fallback exists.
- Treating image coverage as evidence for READY classification.

## 7. Governing contracts

- `SOURCE_IMAGE_ENRICHMENT_V1`
- `REPRESENTATIVE_IMAGE_CONTRACT_V1`
- `REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1`
- `SET_CLOSURE_PLAYBOOK_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`

## 9. Common failure modes

- Input JSON is a candidate file rather than a closure file.
- Exact image candidate is ambiguous.
- Representative fallback tries to cross identity boundaries.
- Exact image field would be overwritten.
- Missing representative sibling image for a promoted stamped row.

## 10. Verification checklist

- Image-closed count equals batch size.
- `representative_shared_stamp` count equals expected representative coverage count.
- Missing image count is zero for closed batches.
- Exact image overwrite count is zero.
- Worker scope was limited to rows in the input JSON.
