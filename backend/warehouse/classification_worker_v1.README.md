# classification_worker_v1

## 1. Purpose

`classification_worker_v1.mjs` classifies warehouse candidates into reviewable actions. In the Prize Pack lane, it consumes bridged stamped warehouse candidates and determines whether each row can stage as `CREATE_CARD_PRINT` with the claimed Play! Pokemon stamped identity.

## 2. Why it exists

The bridge records source-backed intent, but classification is the review gate that checks identity shape, route, and candidate state before founder approval. It prevents a bridged row from moving directly to promotion and catches slot conflicts before any canon write.

## 3. Inputs

- CLI: `node backend/warehouse/classification_worker_v1.mjs --candidate-id=<uuid> [--dry-run|--apply]`
- Optional CLI: `--limit=<n>`, `--reclassify-all`.
- One exact warehouse candidate id for bounded Prize Pack work.
- Live DB access to warehouse candidates, canonical card prints, source payloads, and staging tables.
- Candidate payloads from `external_discovery_to_warehouse_bridge_v1`.

## 4. Outputs

- Classification result for the candidate.
- Staged founder-review action when applied.
- Proposed action type, expected `CREATE_CARD_PRINT` for Prize Pack stamped rows.
- Candidate state transition and event records.
- No direct `card_prints` promotion.

## 5. Safe usage

- Run only on exact candidate ids created or resumed from the current READY batch.
- Use dry-run before apply when reviewing a new batch shape.
- Accept only rows that stage as `CREATE_CARD_PRINT`.
- Confirm the classifier preserved the base printed name, printed number, and `variant_key = play_pokemon_stamp`.
- Stop on any repeated blocker class.

## 6. Unsafe usage

- Using `--reclassify-all` during a bounded Prize Pack batch.
- Classifying rows outside the exact READY candidate artifact.
- Treating a staged row as approved without founder review.
- Allowing a row to collapse into an unrelated base slot or series-split target.

## 7. Governing contracts

- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `STAMPED_IDENTITY_RULE_V1`
- `PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`

## 9. Common failure modes

- Warehouse candidate missing or in an unexpected state.
- Slot conflict with an existing stamped card print.
- Proposed action is not `CREATE_CARD_PRINT`.
- Source payload lacks base route proof or variant identity rule.
- Classifier attempts to collapse a Prize Pack stamped row into the base print.

## 10. Verification checklist

- Classified count equals expected batch count.
- Staged count equals expected batch count.
- Blocked count is zero.
- Every staged row has `variant_key = play_pokemon_stamp`.
- Every staged row preserves base name and printed number.
- Next step is founder review, not executor apply.
