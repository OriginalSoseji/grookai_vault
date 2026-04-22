# buildCardPrintGvIdV1

## 1. Purpose

`buildCardPrintGvIdV1.mjs` builds deterministic public `gv_id` values for canonical `card_prints`. In Prize Pack execution it is the helper that turns the routed base set token, printed number, and `play_pokemon_stamp` variant into stable stamped ids such as `GV-PK-SSH-014-PLAY-POKEMON-STAMP`.

## 2. Why it exists

Stamped rows must be reproducible and collision-safe. Manual string construction would allow suffix drift, number normalization mistakes, and inconsistent variant token handling. This helper applies the active GV ID rules in one place.

## 3. Inputs

- In-process function input, not a CLI worker.
- Required identity fields include set code or printed set token, printed number, and optional `variantKey`.
- Prize Pack stamped input uses the routed base set code and `variantKey = play_pokemon_stamp`.

## 4. Outputs

- Deterministic `gv_id` string.
- Namespace decisions for special set families where the helper emits them.
- No DB writes.
- No file writes.

## 5. Safe usage

- Use through promotion executor or tests.
- Use the routed canonical set code, not the external source family string.
- Preserve printed number identity before variant suffix construction.
- Let controlled suffix logic normalize `play_pokemon_stamp`.

## 6. Unsafe usage

- Manually constructing Prize Pack GV IDs in checkpoint scripts.
- Passing the source family as the set code.
- Removing leading zeroes from numbers when the canonical identity expects them.
- Treating a missing variant as equivalent to a stamped variant.

## 7. Governing contracts

- `GV_ID_ASSIGNMENT_V1`
- `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked.json`

## 9. Common failure modes

- `gv_id_number_token_missing`.
- Wrong set token because the source family was used instead of effective routed set code.
- Missing variant suffix for a stamped row.
- Collision with an existing stamped target.

## 10. Verification checklist

- GV ID matches the expected routed set token and printed number.
- Prize Pack stamped GV IDs include the `PLAY-POKEMON-STAMP` suffix.
- Base rows keep their original GV IDs.
- Executor dry-run confirms no duplicate target before apply.
