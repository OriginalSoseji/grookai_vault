# PRINT_IDENTITY_KEY_BLOCKED_SURFACE_REAUDIT_V2

## Context

The blocker surface has materially changed since the earlier decomposition:

- original blockers = `1363`
- shadow rows removed = `693`
- promo rows backfilled = `181`
- remaining blocked rows = `458`

This checkpoint replaces the old family split for decision-making. The prior
classification is no longer authoritative because the two largest previously
audited families have already been processed.

## Re-Audit Result

Live re-audit of the remaining `458` rows produces a clean, exhaustive split:

- `SET_CLASSIFICATION_EDGE = 238`
- `VARIANT_AMBIGUITY = 194`
- `LEGACY_NAME_EDGE = 26`
- `AMBIGUOUS_NUMBER = 0`
- `NUMBERLESS_NO_SOURCE = 0`

Important live facts:

- every remaining blocker still has `print_identity_key is null`
- every remaining blocker still lacks mirrored `set_code` and `number_plain`
- every remaining blocker has an active authoritative `tcgdex` mapping
- there is no remaining no-source lane in this surface

## Family Breakdown

### SET_CLASSIFICATION_EDGE

- row_count = `238`
- dominant set breakdown:
  - `sv04.5 = 137`
  - `swsh10.5 = 54`
  - `sv06.5 = 47`
- contract meaning:
  - row has authoritative numeric `tcgdex` localId
  - normalized name is unique within its set
  - blocker is now mechanical: missing mirrored set/number surface rather than
    unresolved identity ambiguity

Representative rows:

- `sv04.5 / Abomasnow / tcgdex_local_id = 101`
- `sv04.5 / Abra / tcgdex_local_id = 148`
- `sv04.5 / Alakazam ex / tcgdex_local_id = 215`

### VARIANT_AMBIGUITY

- row_count = `194`
- dominant set breakdown:
  - `sv04.5 = 108`
  - `sv06.5 = 52`
  - `swsh10.5 = 34`
- contract meaning:
  - same normalized name appears more than once inside the same special set
  - upstream `tcgdex` localId exists, but number mirroring is required before
    lawful derivation because name alone is not unique

Representative rows:

- `sv04.5 / Annihilape / 047 and 171`
- `sv04.5 / Armarouge / 015 and 115`
- `sv04.5 / Clive / 078, 227, 236`

### LEGACY_NAME_EDGE

- row_count = `26`
- set breakdown:
  - `ecard3 = 15`
  - `col1 = 11`
- contract meaning:
  - legacy numbering semantics mix plain numeric and prefixed localId forms
    such as `H13` and `SL2`
  - this lane must remain isolated under a legacy contract instead of being
    folded into the special-set mirror lane

Representative rows:

- `col1 / Dialga / SL2`
- `col1 / Groudon / 6 and SL4`
- `ecard3 / Magcargo / H16 and H17`

## What Disappeared

- `NUMBERLESS_NO_SOURCE = 0`
  - there is no longer any remaining blocker without authoritative source
    mapping
- `AMBIGUOUS_NUMBER = 0`
  - non-standard localId shapes still exist, but they are fully contained
    inside the isolated legacy lane rather than forming a standalone family

## Dominant Family

- `dominant_family = SET_CLASSIFICATION_EDGE`

Why it is dominant:

- it is the largest remaining family at `238` rows
- it has the cleanest bounded shape
- it does not depend on unresolved promo or modern shadow-row behavior
- it is smaller-risk than opening the same-name multi-row ambiguity lane first

## Next Execution Plan

Recommended sequence:

1. `PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1`
2. `PRINT_IDENTITY_KEY_VARIANT_AMBIGUITY_CONTRACT_AUDIT_V1`
3. `PRINT_IDENTITY_KEY_LEGACY_NAME_EDGE_CONTRACT_AUDIT_V1`

Why this order:

- the dominant family is now a mechanical special-set mirror lane
- the `VARIANT_AMBIGUITY` family is large, but it is contractually stricter
  because same-name repeated identities need an explicit distinction rule
- the legacy lane is smallest and should stay isolated until the modern
  special-set lanes are fully defined

## Final Decision

- `blocker_row_count = 458`
- `dominant_family = SET_CLASSIFICATION_EDGE`
- `next_execution_unit = PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1`
- `audit_status = passed`

The system is re-grounded on live state again. The remaining work is no longer
the old mixed blocker mass; it is three bounded post-cleanup families with one
clear next execution lane.
