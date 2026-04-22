# external_discovery_to_warehouse_bridge_v1

## 1. Purpose

`external_discovery_to_warehouse_bridge_v1.mjs` bridges exact external discovery candidates into warehouse candidate rows. For Prize Pack work, it is the entry point that takes a bounded READY candidate artifact and creates source-backed stamped warehouse candidates with the correct claimed identity payload, base route proof, and `variant_key = play_pokemon_stamp`.

## 2. Why it exists

External source rows are not canon rows. This worker preserves that staging boundary by moving only audited source rows into the warehouse review flow. During the Prize Pack milestone it prevented direct canon writes and made every later classification, approval, promotion, mapping, and image step traceable to an exact source candidate.

## 3. Inputs

- CLI: `node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs --set-id=<external-set-id> [--source-candidate-id=<uuid> ...] [--stamped-batch-file=<path>] [--apply]`
- Required source set id, usually `prize-pack-series-cards-pokemon` for this lane.
- One or more exact `--source-candidate-id` values, or a stamped batch file that contains the exact batch rows.
- Live DB access for external discovery source rows and warehouse candidate writes.
- Stamped payload fields: base name, printed number, normalized number, `variant_key`, variant identity rule, evidence provenance, and base route hints.

## 4. Outputs

- Inserts or resumes `canon_warehouse_candidates` for exact source candidates.
- Writes warehouse candidate events for bridge actions.
- Does not create `card_prints`.
- Does not map external ids.
- Does not write image fields.

## 5. Safe usage

- Use only after a READY candidate JSON has been created by an evidence, route, or source-upgrade checkpoint.
- Pass the exact candidate file or exact source candidate ids from that artifact.
- Run dry or inspection paths first when available; apply only after confirming every row is in scope.
- Verify that `claimed_identity_payload.variant_key = play_pokemon_stamp` for generic Prize Pack rows.
- Verify the `reference_hints_payload` includes evidence provenance and effective routed set code.

## 6. Unsafe usage

- Running the bridge from a broad source-set query during Prize Pack work.
- Bridging rows that are still `WAIT`, `DO_NOT_CANON`, acquisition-blocked, or near-hit-only.
- Omitting stamped payload data and allowing later workers to infer route or variant identity.
- Bridging a row because it appears in a chat prompt instead of an in-repo candidate artifact.

## 7. Governing contracts

- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `STAMPED_IDENTITY_RULE_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `EVIDENCE_TIER_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`

## 9. Common failure modes

- Missing `--set-id`.
- Candidate id is not found in the external source table.
- Candidate was already bridged in a conflicting state.
- The source row is a product row or non-card row that lacks a valid stamped bridge payload.
- `variant_key` or evidence provenance is missing, causing classification to lose the stamped identity basis.

## 10. Verification checklist

- Exact number of bridged or resumed rows equals the candidate artifact count.
- No source candidates outside the artifact were touched.
- Every bridged row has base name, printed number, number plain, `variant_key = play_pokemon_stamp`, and source provenance.
- No canon rows, mappings, or images were written by this worker.
- The next worker is `classification_worker_v1` on the exact bridged row set.
