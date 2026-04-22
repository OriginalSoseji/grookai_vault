# identity_slot_audit_v1

## 1. Purpose

`identity_slot_audit_v1.mjs` audits one warehouse candidate's identity slot and reports the existing canonical occupancy, collision shape, and route concerns. For Prize Pack work it is a read-only guard when a stamped candidate might collide with an existing base, variant, or special-family row.

## 2. Why it exists

Prize Pack rows create overlay identities. A route or slot mistake can either duplicate an existing stamped row or collapse an overlay into a base print. The audit worker gives a focused view of the slot before classification or promotion decisions are made.

## 3. Inputs

- CLI: `node backend/identity/identity_slot_audit_v1.mjs --candidate-id=<uuid>`
- One exact warehouse candidate id.
- Live DB read access to candidates and canonical identity tables.
- Candidate payloads with source identity, printed number, set route, and variant key.

## 4. Outputs

- Read-only identity slot audit result.
- Candidate slot context, including possible existing owners or variant collisions.
- No DB writes.
- No checkpoint files unless a caller captures output manually.

## 5. Safe usage

- Use when classification or review reveals a possible slot conflict.
- Use before route-sensitive approval, not after promotion.
- Treat the output as route and identity context only.
- Pair with route-repair checkpoints when ambiguity is structural.

## 6. Unsafe usage

- Treating a clean slot audit as Prize Pack series evidence.
- Using the audit to override missing source evidence.
- Running it on a broad set of rows and applying conclusions globally.
- Changing contracts because one audit output is inconvenient.

## 7. Governing contracts

- `GV_ID_ASSIGNMENT_V1`
- `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`
- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6.json`
- `docs/checkpoints/warehouse/prize_pack_special_identity_family_repair_v1.json`
- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`

## 9. Common failure modes

- Candidate id missing.
- Candidate payload does not include a deterministic route.
- Existing canonical row occupies the same identity slot.
- Audit identifies a collision but the batch continues instead of stopping.

## 10. Verification checklist

- The audited candidate id is in the current exact batch or route-repair slice.
- Output was used only as read-only context.
- Any unresolved collision is checkpointed before further action.
- No promotion, mapping, or image work was performed from audit output alone.
