# promotion_executor_v1

## 1. Purpose

`promotion_executor_v1.mjs` executes founder-approved warehouse staging rows into canonical rows. For Prize Pack READY batches it creates the new stamped `card_prints` rows after bridge, classification, staging, review, approval, and dry-run gates have all passed.

## 2. Why it exists

Promotion is the only point in the READY batch flow that writes canon. The executor centralizes that write behind approval, duplicate-target checks, GV ID construction, and row-state validation so evidence workers never mutate canon directly.

## 3. Inputs

- CLI: `node backend/warehouse/promotion_executor_v1.mjs --staging-id=<uuid> --dry-run`
- CLI apply: `node backend/warehouse/promotion_executor_v1.mjs --staging-id=<uuid> --apply`
- Optional CLI: `--limit=<n>`.
- One exact founder-approved staging id for bounded Prize Pack work.
- Live DB access to staging rows, candidates, and canonical tables.

## 4. Outputs

- On dry-run: executor validation without canon writes.
- On apply: new canonical `card_prints` rows for approved create actions.
- Updates staging execution status and promoted card print references.
- Does not perform JustTCG mapping.
- Does not perform image enrichment.

## 5. Safe usage

- Run dry-run for every staging id before apply.
- Apply only rows that are founder-approved and in the exact READY batch.
- Verify action type is `CREATE_CARD_PRINT`.
- Verify `variant_key = play_pokemon_stamp` and base printed identity are preserved.
- Recompute batch counts after apply.

## 6. Unsafe usage

- Running with a broad `--limit` during Prize Pack work.
- Applying unapproved rows.
- Applying rows not present in the candidate artifact.
- Ignoring dry-run duplicate target warnings.
- Applying after a route or evidence checkpoint without a READY candidate file.

## 7. Governing contracts

- `GV_ID_ASSIGNMENT_V1`
- `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`
- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`

## 9. Common failure modes

- Founder approval missing.
- Staging id missing or already executed.
- Duplicate stamped target detected.
- GV ID differs from the expected deterministic stamped id.
- Executor would collapse into the base row instead of creating a stamped row.

## 10. Verification checklist

- Dry-run passed for every staging row.
- Apply count equals approved count.
- New `card_prints` count equals batch size.
- Base rows remain unchanged.
- Every promoted row has deterministic non-null `variant_key = play_pokemon_stamp`.
- Mapping and image closure are run only after promotion and only for promoted rows.
