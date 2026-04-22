# prize_pack_evidence_family

## 1. Purpose

The `prize_pack_evidence_v*_nonblocked.mjs` family performs bounded evidence passes for Prize Pack rows whose route is valid but whose blocker is missing series confirmation. Each version asks one evidence question for one coherent slice and rebuckets rows into READY, DO_NOT_CANON, or WAIT.

## 2. Family pattern

Every version must:

- Rebuild the current WAIT pool from artifacts.
- Exclude acquisition-blocked rows unless the pass is explicitly source acquisition.
- Exclude special-family rows unless explicitly selected.
- Select one coherent slice.
- Define one shared evidence question.
- Use only currently accessible source material.
- Preserve evidence tier distinctions.
- Write JSON and markdown checkpoints.
- Create a READY candidate JSON only for newly unlocked rows.

## 3. Evidence rules

- Exact single-series corroboration means `READY_FOR_WAREHOUSE`.
- Exact multi-series corroboration with no printed distinction means `DO_NOT_CANON`.
- No exact hit means `WAIT`.
- Near-hit-only evidence means `WAIT`.
- Official local JSON and official PDFs can be Tier 1.
- Bulbapedia, JustInBasil, and repo fixtures are useful but must be tiered honestly.

## 4. Version history from the milestone

- V6 through V13 compressed large and medium nonblocked slices.
- V18 through V20 extracted final small READY batches after official source imports.
- V21 found an exact multi-series duplicate and moved it to DO_NOT_CANON.
- V22 tested the final high-signal near-hit row and produced no READY, proving the nonblocked exact-evidence lane was exhausted.

## 5. When to create a new version

Create a new evidence version only when:

- A row or slice has a new accessible authoritative source.
- The slice has the same set family or tight cluster.
- The question is shared by every row.
- The source set can answer exact name plus printed-number identity.
- The pass does not depend on blocked official acquisition.

Endgame versions may contain one row. Do not widen artificially.

## 6. When not to create a new version

Do not create a new evidence version when:

- `WAIT_REMAINING_EXACT_ACCESSIBLE_HIT = 0` and no new source exists.
- The only evidence is a near hit already recorded in final state.
- The row is acquisition-blocked.
- The row is an error-source duplicate.
- The row needs structural route repair rather than evidence.

## 7. Checkpoint requirements

Each version must write:

- `docs/checkpoints/warehouse/prize_pack_evidence_v<n>_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v<n>_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v<n>_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v<n>_nonblocked.md`

If READY rows exist, write:

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v<n>_nonblocked_candidate.json`

## 8. Safe usage

- Use current final-state buckets as the starting surface.
- Keep one shared question.
- Cite exact source hits and exact series appearances.
- Keep acquisition-blocked and special-family rows out of nonblocked slices.
- Treat no-hit and near-hit rows as unresolved, not failed data.

## 9. Unsafe usage

- Promoting from near-hit-only evidence.
- Treating same-name evidence as exact printed identity.
- Using community lists as Tier 1.
- Continuing evidence slices after V22 without a genuinely new authoritative source.
- Mixing duplicate cleanup with likely READY hunting in one pass.

## 10. Freeze and retirement

An evidence version is retired once its checkpoint and optional READY candidate are written. If it produces READY rows, close them through the ready batch family before starting unrelated work. If V22-style signal testing finds no exact hits and no new source exists, stop slicing and keep the final backlog frozen.
