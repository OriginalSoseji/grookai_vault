# prize_pack_evidence_corroboration_v1

## 1. Purpose

`prize_pack_evidence_corroboration_v1.mjs` corroborates Prize Pack evidence against reachable card-list sources and writes a checkpoint of exact hits, duplicates, and unresolved rows. It was used early in the milestone to test accessible series evidence without promoting rows.

## 2. Why it exists

The backlog contained many rows with weak or missing evidence. This worker gave the project a reproducible first pass over accessible source pages so later evidence slices could be grounded in actual corroboration rather than manual memory.

## 3. Inputs

- CLI: `node backend/warehouse/prize_pack_evidence_corroboration_v1.mjs`
- Prior evidence checkpoint, historically `docs/checkpoints/warehouse/prize_pack_evidence_v2.json`.
- Reachable Bulbapedia or raw card-list pages used as lower-tier corroboration.
- Existing source/evidence artifacts.

## 4. Outputs

- `docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.md`
- Corroboration notes and row classifications for the targeted evidence pass.
- No DB writes.
- No canon writes.

## 5. Safe usage

- Use for bounded corroboration and evidence planning.
- Require exact name plus printed-number matches for decisive outcomes.
- Preserve evidence tier distinctions.
- Use official local JSON or official PDFs for Tier 1 where required.

## 6. Unsafe usage

- Treating Bulbapedia text as official Tier 1.
- Promoting from a name-only hit.
- Matching broad page text without exact printed identity.
- Reusing an early corroboration result after later source imports without rebuilding state.

## 7. Governing contracts

- `EVIDENCE_TIER_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v3.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v22_nonblocked.json`

## 9. Common failure modes

- Fetch failure.
- Page format changes.
- Text match is too broad and catches near-hit rows.
- Series coverage is incomplete for the question being asked.

## 10. Verification checklist

- Every decisive row has exact printed-identity corroboration.
- Multi-series exact rows are classified as duplicate/distribution-only.
- Near-hit-only rows remain WAIT.
- Checkpoint records source URLs and evidence tier.
