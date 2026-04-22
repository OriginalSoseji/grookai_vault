# promote_source_backed_justtcg_mapping_v1

## 1. Purpose

`promote_source_backed_justtcg_mapping_v1.mjs` creates active JustTCG mappings for exact promoted source-backed rows. The README is stored with the warehouse docs because Prize Pack batch closure calls it as part of the warehouse closure sequence, while the executable worker lives at `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs`.

## 2. Why it exists

Promotion creates canon rows, but external marketplace/source mappings are a separate closure step. This worker links newly promoted Prize Pack stamped rows back to their exact JustTCG source records without running a global mapping job.

## 3. Inputs

- CLI: `node backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs --input-json <path> --dry-run`
- CLI apply: `node backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs --input-json <path> --apply`
- Exact ready batch closure JSON containing promoted card print ids and source external ids.
- Live DB access to external mapping tables.

## 4. Outputs

- Active external mappings for exact promoted rows.
- Mapping status captured in the batch closure checkpoint.
- No canon `card_prints` writes.
- No image writes.

## 5. Safe usage

- Run only with the exact batch closure JSON produced after promotion.
- Dry-run first and check for duplicate external ids.
- Apply only if every promoted row maps one-to-one.
- Verify there are no multi-active mapping conflicts after apply.

## 6. Unsafe usage

- Running global mapping jobs during Prize Pack closure.
- Mapping rows that were not promoted in the current exact batch.
- Reusing a source external id already actively mapped to another canon row.
- Treating mapping success as evidence that an unresolved row should be promoted.

## 7. Governing contracts

- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `SET_CLOSURE_PLAYBOOK_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`

## 9. Common failure modes

- Input JSON lacks promoted card print ids.
- Duplicate source external id.
- Multiple active mappings for one card print.
- Worker is pointed at a candidate file instead of a closure file.

## 10. Verification checklist

- Mapped count equals promoted count.
- Duplicate active external id count is zero.
- Multi-active mapping conflict count is zero.
- Mapping rows are limited to the exact promoted batch.
