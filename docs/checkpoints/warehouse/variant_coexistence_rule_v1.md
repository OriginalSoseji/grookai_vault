# VARIANT_COEXISTENCE_RULE_V1

## Context

`prize_pack_ready_batch_v1_129` promoted `127/129` rows cleanly. The final two rows stopped at slot audit with `MULTIPLE_SAME_NAME_SLOT_ROWS`, even though the live slot shape was lawful:

- same effective set code
- same printed name
- same printed number
- one base row
- one existing set-name stamp variant
- one incoming generic Play! Pokemon stamp variant

This was a missing coexistence rule, not a duplicate or routing failure.

## Exact Blocked Inputs

1. `Reshiram ex | 020/086 | sv10.5w | play_pokemon_stamp`
   - source external id: `pokemon-prize-pack-series-cards-reshiram-ex-double-rare`
   - warehouse candidate id: `e6983551-ad7e-4aa4-b641-863006a4ee1a`
2. `Zekrom ex | 034/086 | sv10.5b | play_pokemon_stamp`
   - source external id: `pokemon-prize-pack-series-cards-zekrom-ex-double-rare`
   - warehouse candidate id: `7209e21c-05e6-4fae-9904-91bcb177047c`

## Current Slot Occupants

### Reshiram ex — `sv10.5w` slot `020`

- base row: `928a3a4e-7c9e-463d-af00-94eb9043daa2` / `GV-PK-WHT-020`
- existing variant row: `270c5dd4-1783-48fe-88a6-b5b13ef47644` / `GV-PK-WHT-020-WHITE-FLARE-STAMP`

### Zekrom ex — `sv10.5b` slot `034`

- base row: `fb628e26-d01d-4788-abc8-aeb0f718bccc` / `GV-PK-BLK-034`
- existing variant row: `0fd2df5f-a69b-4019-ae90-20f06d27260b` / `GV-PK-BLK-034-BLACK-BOLT-STAMP`

## Coexistence Proof

Both slots satisfy the lawful coexistence shape:

- base row present with `variant_key = NULL`
- existing identity-bearing set-name stamp row present with a distinct `variant_key`
- incoming row carries explicit provenance-backed `variant_key = play_pokemon_stamp`
- incoming row is governed by `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- no unrelated same-number occupant exists in either slot

Therefore the block was not:

- duplicate exact variant
- unrelated name conflict
- ambiguous base proof

It was a missing contract-backed coexistence allowance.

## Contract Summary

Authored and indexed:

- `docs/contracts/VARIANT_COEXISTENCE_RULE_V1.md`

Rule outcome:

- same-name same-number rows may coexist only when each row carries a distinct, provenance-backed lawful identity signal and deterministic `variant_key`
- allowed example in this pass: base + set-name stamp + generic Play! Pokemon stamp
- duplicate `variant_key`, weak distinctions, and unrelated name conflicts remain blocked

## Runtime Adoption

Patched:

- `backend/identity/variant_coexistence_rule_v1.mjs`
- `backend/identity/identity_slot_audit_v1.mjs`

Audited but not patched:

- `backend/warehouse/classification_worker_v1.mjs`
- `backend/warehouse/promotion_executor_v1.mjs`

Why no further patch was needed:

- classification already promotes `VARIANT_IDENTITY` to `PROMOTE_VARIANT` and `CREATE_CARD_PRINT`
- executor duplicate detection is exact-variant keyed, so distinct `variant_key` rows do not collide there

## Focused Tests

Command:

```bash
node --test backend/identity/identity_slot_audit_v1.test.mjs
```

Result:

- `15 passed`
- `0 failed`

Added coverage:

- base + `white_flare_stamp` + `play_pokemon_stamp` allowed
- base + `black_bolt_stamp` + `play_pokemon_stamp` allowed
- duplicate same `variant_key` remains non-promotable
- weak distinction remains ambiguous
- unrelated name conflict remains blocked

## Post-Repair Dry Run

Dry-run reclassification of the two blocked candidates now returns:

### Reshiram ex

- `identity_audit_status = VARIANT_IDENTITY`
- `identity_resolution = PROMOTE_VARIANT`
- `proposed_action_type = CREATE_CARD_PRINT`
- `interpreter_reason_code = VARIANT_COEXISTENCE_ALLOWED`

### Zekrom ex

- `identity_audit_status = VARIANT_IDENTITY`
- `identity_resolution = PROMOTE_VARIANT`
- `proposed_action_type = CREATE_CARD_PRINT`
- `interpreter_reason_code = VARIANT_COEXISTENCE_ALLOWED`

## Resume Decision

Decision: `RESUME_PRIZE_PACK_2_ROW_RESIDUE`

The two blocked rows are now clean input for the normal founder-gated residue completion pass.
