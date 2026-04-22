# prize_pack_wait_inspection_v1

## 1. Purpose

`prize_pack_wait_inspection_v1.mjs` inspects Prize Pack `WAIT` rows, classifies blocker shapes, attaches route and research context, and generates a checkpoint for planning later evidence or route passes.

## 2. Why it exists

The backlog needed a deterministic way to understand why rows were waiting before selecting a slice. This worker made blocker classes visible, separated route ambiguity from evidence gaps, and prevented ad hoc research batches.

## 3. Inputs

- CLI: `node backend/warehouse/prize_pack_wait_inspection_v1.mjs`
- Prior evidence checkpoint, historically `docs/checkpoints/warehouse/prize_pack_evidence_v2.json`.
- Live DB read access for source candidates and base row context.
- Environment with DB connection configured.

## 4. Outputs

- `docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.json`
- `docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.md`
- Blocker summaries, candidate context, base route context, and research links.
- No DB writes.
- No canon writes.

## 5. Safe usage

- Use as an inspection pass before route repair or evidence slicing.
- Treat the output as planning context, not final evidence.
- Select a later slice from rows sharing the same blocker class and question.
- Stop if a row cannot be reconstructed deterministically.

## 6. Unsafe usage

- Promoting from inspection output.
- Treating generated research links as corroboration.
- Mixing rows with different blocker classes into one follow-up pass.
- Re-running against stale evidence without noting the source checkpoint.

## 7. Governing contracts

- `EVIDENCE_TIER_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.json`
- `docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_clusters.json`

## 9. Common failure modes

- Source candidate missing.
- Base row missing or ambiguous.
- Research links point to broad search pages rather than source evidence.
- Blocker class is used as a final decision without a follow-up pass.

## 10. Verification checklist

- WAIT rows count matches the source checkpoint.
- Every inspected row has a blocker class.
- Route blockers and evidence blockers are separated.
- No DB writes occurred.
- Follow-up work selects one coherent slice only.
