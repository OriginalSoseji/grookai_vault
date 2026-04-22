# STAMPED_BASE_REPAIR_V4

- Workflow: `STAMPED_BASE_REPAIR_V4`
- Status: `COMPLETE`
- Scope: promo-family slash-number routing and identity resolution only

## Root Cause

The live runtime only rerouted slash-number stamped rows when the declared family was BW promos.
That left DPP and Nintendo promo-family slash-number rows in the declared promo set instead of their proven underlying expansion set.

## Repair

- Added `resolveUnderlyingBaseFromPrintedNumberV1` in `backend/warehouse/source_identity_contract_v1.mjs`.
- Generalized the reroute decision to any promo-family slash-number row with a `PROVEN` underlying base set that differs from the declared set.
- Kept slot audit aligned by adding an explicit `underlying_base_set_code` fallback in `backend/identity/identity_slot_audit_v1.mjs`.
- Left `classification_worker_v1.mjs` and `buildCardPrintGvIdV1.mjs` unchanged because they already consume routed identity from the shared source-backed contract.

## Verification

- `node --test backend/warehouse/source_identity_contract_v1.test.mjs`: PASS (6/6)
- `node --test backend/identity/identity_slot_audit_v1.test.mjs`: PASS (10/10)
- Exact 48-row dry run: 48/48 rows now resolve cleanly as `READY_TO_BRIDGE`
- Routing: 48/48 runtime `set_code` values match the audited expected target set
- Identity audit: 48/48 rows resolve as `VARIANT_IDENTITY`
- Proposed action: 48/48 rows resolve to `CREATE_CARD_PRINT`

## Representative Rows

| batch_index | source_set_id | name | printed_number | variant_key | stamp_label | declared_set_code | runtime_set_code | identity_audit_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | black-and-white-promos-pokemon | Tropical Beach | BW50 | worlds_12_stamp | Worlds 12 Stamp | bwp | bwp | VARIANT_IDENTITY |
| 3 | diamond-and-pearl-promos-pokemon | Tropical Wind | DP05 | worlds_07_stamp | Worlds 07 Stamp | dpp | dpp | VARIANT_IDENTITY |
| 4 | diamond-and-pearl-promos-pokemon | Gabite | 48/123 | staff_prerelease_stamp | Staff Prerelease Stamp | dpp | dp2 | VARIANT_IDENTITY |
| 5 | diamond-and-pearl-promos-pokemon | Lucario | 53/127 | staff_prerelease_stamp | Staff Prerelease Stamp | dpp | pl1 | VARIANT_IDENTITY |
| 10 | nintendo-promos-pokemon | Tropical Tidal Wave | 036 | 2006_world_championships_staff_stamp | 2006 World Championships Staff Stamp | np | np | VARIANT_IDENTITY |
| 11 | nintendo-promos-pokemon | Leafeon | 17/90 | staff_prerelease_stamp | Staff Prerelease Stamp | np | hgss3 | VARIANT_IDENTITY |
| 12 | nintendo-promos-pokemon | Dark Houndoom | 37/109 | prerelease_stamp | Prerelease Stamp | np | ex7 | VARIANT_IDENTITY |
| 24 | nintendo-promos-pokemon | Combusken | 009 | e_league_winner_stamp | E-league Winner Stamp | np | np | VARIANT_IDENTITY |
| 33 | nintendo-promos-pokemon | Tentacruel | 45/92 | prerelease_stamp | Prerelease Stamp | np | ex12 | VARIANT_IDENTITY |
| 41 | sm-promos-pokemon | Charizard | SM158 | staff_stamp | Staff Stamp | smp | smp | VARIANT_IDENTITY |
| 48 | sm-promos-pokemon | Snubbull | SM200 | detective_pikachu_stamp | Detective Pikachu Stamp | smp | smp | VARIANT_IDENTITY |

## Outcome

- Remainder batch clean input: YES
- Remaining routing regressions in the exact 48-row pool: 0
- Recommended next step: `STAMPED_READY_REMAINDER_BATCH_V1_48`
