# prize_pack_ready_batch_family

## 1. Purpose

The `prize_pack_ready_batch_*` family closes exact READY candidate files through bridge, classification, founder review, approval, executor dry-run, executor apply, JustTCG mapping, and representative image coverage. It is the only Prize Pack worker family that writes canon.

## 2. Family pattern

Every READY batch version must:

- Materialize one exact candidate JSON.
- Verify the row count and row identities.
- Re-audit live DB state.
- Bridge or resume only the exact rows.
- Classify and stage only the exact rows.
- Apply explicit founder approval.
- Dry-run promotion.
- Apply promotion only for rows that passed dry-run.
- Map only the promoted rows.
- Image-close only the promoted rows.
- Write JSON and markdown closure checkpoints.

## 3. Contract invariants

- Base printed identity remains unchanged.
- `variant_key = play_pokemon_stamp`.
- Generic Play! Pokemon stamp identity is not split by Prize Pack series.
- Base rows are not mutated.
- `image_url` remains exact-only.
- Representative fallback is explicitly labeled and auditable.
- No row outside the candidate file is substituted.

## 4. Version history from the milestone

Closed READY batches included large initial batches, nonblocked evidence batches, source-upgrade batches, and endgame micro-batches. Recent proving examples:

- `prize_pack_ready_batch_v18_nonblocked.json`: 3 promoted, 3 mapped, 3 representative image closed.
- `prize_pack_ready_batch_v19_nonblocked.json`: 3 promoted, 3 mapped, 3 representative image closed.
- `prize_pack_ready_batch_v20_nonblocked.json`: 2 promoted, 2 mapped, 2 representative image closed.

The final promoted Prize Pack total after V20 closure was 422.

## 5. When to create a new version

Create a new READY batch version only when:

- A candidate JSON exists.
- Every row has `final_decision = READY_FOR_WAREHOUSE`.
- Every row has a valid base route.
- Every row has sufficient evidence provenance.
- The batch can be closed without touching non-batch rows.

## 6. When not to create a new version

Do not create a READY batch version when:

- Rows are typed in a prompt but no candidate JSON exists.
- Any row is still WAIT, DO_NOT_CANON, near-hit-only, or acquisition-blocked.
- Mapping or image closure would need a global job.
- Live precheck shows an unexpected conflict.
- The row depends on a missing official source.

## 7. Checkpoint requirements

Each batch must write:

- `docs/checkpoints/warehouse/prize_pack_ready_batch_<version>.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_<version>.md`

The checkpoint must include:

- attempted and completed counts
- classified, staged, approved, promoted, mapped, and image-closed counts
- failures by class
- representative promoted rows
- post-batch Prize Pack totals
- next step token

## 8. Safe usage

- Start from the exact candidate JSON.
- Keep a row-level manifest for the whole batch.
- Use dry-run before apply.
- Verify mappings and image closure after promotion.
- Recompute backlog state after closure.

## 9. Unsafe usage

- Running bridge, classification, mapping, or image workers globally.
- Adding substitute rows to a candidate batch.
- Approving rows outside the exact batch.
- Overwriting exact images with representative fallback.
- Reopening closed batches to add rows.

## 10. Freeze and retirement

A READY batch is retired after its closure checkpoint is written and counts reconcile. If a row in a closed batch later needs audit, create a separate audit checkpoint; do not edit the closure artifact or rerun the batch as a broader job.
