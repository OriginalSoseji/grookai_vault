# PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1

## Context

This audit covers the dominant blocked family isolated by `PRINT_IDENTITY_KEY_BLOCKED_SURFACE_AUDIT_V1`:

- total blocked rows = 1332
- dominant family = `FAMILY_1_NUMBERLESS_MODERN_MAINSET_BATCH`
- family row count = 1125

These rows are canonical modern main-set cards where:

- set identity is already known
- names are valid
- `number` is missing
- `number_plain` is missing
- `print_identity_key` derivation is blocked only because the number surface is absent locally

## Missing Number Problem

The live family is bounded to these modern set lanes:

- `sv02`
- `sv04`
- `sv04.5`
- `sv06`
- `sv06.5`
- `sv07`
- `sv08`
- `sv09`
- `sv10`
- `swsh10.5`

The gap is not random row corruption. It is a systematic ingestion defect where canonical rows exist without their printed-number surface.

## Recovery Attempts

### Existing Number Field

- recoverable from current `number` field = 0

This family is truly numberless in local canonical storage.

### External Mapping Recovery

Live result:

- `tcgdex` mappings present = 1125 / 1125
- matching `raw_imports` hits = 1125 / 1125
- numeric `payload.card.localId` present = 1125 / 1125
- `external_id` suffix agrees with `localId` = 1125 / 1125
- raw card name matches canonical name = 1125 / 1125
- raw set id matches canonical set code = 1125 / 1125

Conclusion:

- `number_recoverable_count = 1125`
- `number_not_present_count = 0`

This is authoritative recovery, not heuristic recovery.

### Set Ordering Patterns

Set ordering is not safe as a replacement for a real number surface.

Live test:

- rows where alphabetical order matched authoritative numeric order = 6
- rows where alphabetical order differed from authoritative numeric order = 1119

Conclusion:

- guessed ordering is not stable
- number fabrication from set order is prohibited

### Same-Set Canonical Peers

Same-set name matching can provide corroboration, but it is not safe as a primary recovery rule.

Distribution:

- no same-set numbered peer = 432 rows
- exactly one same-set numbered peer = 488 rows
- multiple same-set numbered peers = 205 rows

Examples of multi-target ambiguity:

- `sv02 / Chien-Pao ex` -> candidate numbers `61`, `236`, `261`, `274`
- `sv02 / Paldean Tauros` -> candidate numbers `28`, `41`, `108`, `218`
- `sv10 / Team Rocket's Mewtwo ex` -> candidate numbers `81`, `213`, `231`, `240`

Conclusion:

- same-set canon is corroborative evidence only
- it must not be used as the primary recovery source

## Collision Analysis

Option C from the prompt was tested directly:

- proposed hybrid identity = `set_code + normalized_name + variant_key`

Live result:

- `collision_count_under_option_c = 119`
- `ambiguity_count = 252`

Representative collision families:

- `sv04.5 / Paldean Student` -> 4 rows
- `sv06.5 / Pecharunt ex` -> 4 rows
- `swsh10.5 / Mewtwo VSTAR` -> 3 rows
- `sv02 / Bramblin` -> 2 rows

Conclusion:

- hybrid name-only derivation is unsafe for this family
- relaxing identity away from printed number would collapse lawful distinct cards inside the same set

## Chosen Rule

Selected contract strategy:

- `AUTHORITATIVE_TCGDEX_NUMBER_RECOVERY_THEN_STANDARD_DERIVATION`

Operational rule:

1. If `number_plain` already exists:
   - use standard derivation
2. If `number_plain` is missing but authoritative `tcgdex` evidence exists:
   - recover `number` from `payload.card.localId`
   - recover `number_plain` from the numeric form of that `localId`
   - then use standard derivation
3. If authoritative source evidence does not exist:
   - remain `DERIVATION_BLOCKED`

This keeps the current strict identity model. It does not introduce a name-only fallback.

## Decision

- `number_recoverable_count = 1125`
- `number_not_present_count = 0`
- `collision_count_under_option_c = 119`
- `selected_contract_strategy = AUTHORITATIVE_TCGDEX_NUMBER_RECOVERY_THEN_STANDARD_DERIVATION`
- `safe_to_derive_numberless_rows = yes`

Interpretation:

- these rows are safe to derive only after bounded authoritative number recovery
- they are not safe to derive directly as numberless identities

## Risks

- using guessed set ordering would assign false numbers to 1119 rows
- using same-set canonical peers as the primary source would introduce multi-target ambiguity
- adopting the hybrid name-only identity lane would collapse 252 rows across 119 collision groups
- any future execution must remain bounded to the 1125-row modern family only

## Next Execution Recommendation

- `next_execution_unit = PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1`

Why this is the safest next step:

- the recovery source is already deterministic and complete
- no schema change is required
- no identity relaxation is required
- the next unit can repair the missing `number` surface first, then unlock standard `print_identity_key` backfill without inventing a new identity model
