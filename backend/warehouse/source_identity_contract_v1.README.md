# source_identity_contract_v1

## 1. Purpose

`source_identity_contract_v1.mjs` is the helper module that derives source-backed identity information from warehouse candidate payloads. For Prize Pack rows it preserves the relationship between the external source row, the routed base printed identity, and the stamped overlay identity.

## 2. Why it exists

The warehouse flow must keep source provenance separate from canon identity while still producing deterministic candidate actions. This module centralizes the source-backed identity interpretation so bridge, classification, and promotion workers do not each invent their own routing behavior.

## 3. Inputs

- In-process candidate object.
- `claimed_identity_payload`.
- `reference_hints_payload`.
- Optional `variant_identity` object containing rule, status, collision group, and base proof summary.
- No CLI entry point.

## 4. Outputs

- Source-backed identity package.
- Normalized variant key.
- Underlying base route summary where available.
- Flags indicating whether variant identity is resolved or missing.
- No DB writes and no file writes.

## 5. Safe usage

- Use through bridge, classification, or executor code paths that already carry complete source payloads.
- Preserve `variant_key = play_pokemon_stamp` for generic Prize Pack rows.
- Preserve explicit variant identity rule names in payloads.
- Treat missing route proof as a blocker, not as permission to infer.

## 6. Unsafe usage

- Editing this module to special-case one Prize Pack row without a new contract.
- Letting a source-family label replace exact printed identity.
- Treating series number as a variant key for generic Play! Pokemon stamps.
- Deriving a base route from near-hit evidence.

## 7. Governing contracts

- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `PROMO_FAMILY_IDENTITY_RULE_V1`
- `PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.json`
- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`

## 9. Common failure modes

- `variant_key` is required by a variant rule but absent.
- Base route proof is absent from reference hints.
- Source set id and effective routed set code are conflated.
- Payload preserves source name but loses printed number normalization.

## 10. Verification checklist

- The derived identity has source-backed provenance.
- Prize Pack stamped rows carry `variant_key = play_pokemon_stamp`.
- Effective base route remains separate from source family.
- Missing variant identity is surfaced as unresolved.
- No caller uses this helper output as evidence of series appearance.
