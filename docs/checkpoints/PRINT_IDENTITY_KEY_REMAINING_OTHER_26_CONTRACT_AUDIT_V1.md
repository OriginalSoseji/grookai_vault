# PRINT_IDENTITY_KEY_REMAINING_OTHER_26_CONTRACT_AUDIT_V1

## Context

This audit covers the final blocked surface after all bulk families were
resolved:

- original blockers = `1363`
- shadow rows resolved = `693`
- promo rows resolved = `181`
- set-classification edge resolved = `238`
- same-name multi-variant mirror resolved = `194`
- remaining blocked rows = `26`

The prior label `OTHER` was provisional. Live state now shows the remaining 26
are not miscellaneous residue. They are a single legacy exact-token lane spread
across two already-known historical numbering families:

- `col1` mixed numeric + `SL#`
- `ecard3` mixed numeric + `H#`

## Family Breakdown

Final exhaustive family assignment:

- `LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE = 26`
- `PRINTED_IDENTITY_MODIFIER_REQUIRED = 0`
- `VARIANT_KEY_REQUIRED_BUT_MISSING = 0`
- `PROMO_NUMBER_FORMAT_EDGE = 0`
- `SAME_SET_SAME_NUMBER_MULTI_NAME_IDENTITY_GAP = 0`
- `CHILD_PRINTING_CONTRACT_REQUIRED = 0`
- `OTHER = 0`
- `UNCLASSIFIED = 0`

Set and token subpatterns inside the legacy family:

- `col1 / numeric = 5`
- `col1 / SL# = 6`
- `ecard3 / numeric = 4`
- `ecard3 / H# = 11`

Representative rows:

- `col1 / Dialga / SL2 / GV-PK-COL-SL2`
- `col1 / Groudon / 6 and SL4 / GV-PK-COL-6 / GV-PK-COL-SL4`
- `ecard3 / Magcargo / H16 and H17 / GV-PK-SK-H16 / GV-PK-SK-H17`

Important live fact:

- every remaining row already has a lawful canonical `gv_id`
- every remaining row has authoritative `tcgdex.localId`
- every remaining row is blocked only because `print_identity_key` is still null

## Derivation Safety

Safe derivation result:

- `safe_to_derive_now_counts = { yes: 26, no: 0 }`
- simulated internal collisions = `0`
- simulated external collisions = `0`
- `requires_new_contract_count = 0`

Lawful derivation rule for the final 26:

```text
print_identity_key =
lower(concat_ws(':',
  effective_set_code,
  tcgdex_local_id,
  normalized_name_token
))
```

Why this is safe:

- `tcgdex.localId` already carries the exact printed token needed for the final
  blocked rows
- that exact token already agrees with the live canonical `gv_id`
- collision simulation is clean across all 26 rows
- no modifier or variant expansion is needed

Important nuance:

- `ecard3` holo tokens such as `H16` are compatible with the live
  `number_plain` generator if a future workflow ever mirrors them into
  `number`
- `col1` shiny-legend tokens such as `SL2` must **not** be digit-collapsed for
  identity purposes
- therefore the final apply should backfill `print_identity_key` directly from
  exact `tcgdex.localId` and should not rely on bulk `number` mirroring for the
  `SL#` subset

## Execution Roadmap

Exact next unit:

1. `PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1`

Why this is the correct move:

- the remaining surface is fully explained
- no row requires another identity-model contract
- all 26 rows are collision-free under the exact-token localId derivation
- one bounded apply can finish `print_identity_key` coverage

## Closure Outlook

Closure status:

- `closure_readiness_status = full_coverage_reachable_without_schema_change_after_one_bounded_legacy_apply`

Interpretation:

- full `print_identity_key` coverage is now in sight
- no additional schema change is required for this final coverage step
- the remaining work is operational, not exploratory

## Final Decision

- `remaining_row_count = 26`
- `family_counts = {"LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE":26,"PRINTED_IDENTITY_MODIFIER_REQUIRED":0,"VARIANT_KEY_REQUIRED_BUT_MISSING":0,"PROMO_NUMBER_FORMAT_EDGE":0,"SAME_SET_SAME_NUMBER_MULTI_NAME_IDENTITY_GAP":0,"CHILD_PRINTING_CONTRACT_REQUIRED":0,"OTHER":0,"UNCLASSIFIED":0}`
- `safe_to_derive_now_counts = {"yes":26,"no":0}`
- `requires_new_contract_count = 0`
- `next_execution_unit = PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1`
- `closure_readiness_status = full_coverage_reachable_without_schema_change_after_one_bounded_legacy_apply`
- `audit_status = passed`
