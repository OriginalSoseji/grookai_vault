# IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1

## Why This Audit Exists
This audit tests whether the parsed legacy supported null-parent surface can be assigned to an identity domain using only live stored set/card evidence. It is read-only and classification-only.

## Input Surfaces Used
- `docs/checkpoints/identity_audit_results_v1.json`
- `docs/checkpoints/full_db_audit_v1/11_domain_distribution.json`
- `docs/checkpoints/full_db_audit_v1/15_number_field_provenance.json`
- live remote `sets`, `card_prints`, `external_mappings`, and `card_printings` read-only queries

## Allowed Evidence
- `pokemon_ba` only when stored set/card evidence explicitly proves BA lineage.
- `pokemon_eng_special_print` only when stored evidence explicitly proves promo or special-print family membership.
- `pokemon_jpn` only when stored metadata explicitly marks a Japanese domain or language surface.
- `pokemon_eng_standard` only when stored evidence affirmatively marks the row as English standard; null or absent domain data is not proof.
- `tcg_pocket` is excluded only when stored source-domain evidence explicitly says `tcg_pocket`.

## Disallowed Evidence
- Null or blank `sets.source->>domain` may not default to `pokemon_eng_standard`.
- Historical memory outside stored DB/checkpoint evidence may not assign BA lineage.
- Unrecorded promo knowledge may not assign `pokemon_eng_special_print`.
- Guessed set-code families may not assign `pokemon_jpn`.
- No row may be written to `card_print_identity` in this phase.

## What Was Provably Classifiable
- parsed input rows: 10613
- supported target surface: 10620
- pokemon_eng_special_print: 1230

## What Remains Blocked
- BLOCKED_UNKNOWN_DOMAIN: 9383
- blocked set count: 82

## Whether `pokemon_eng_standard` Can Be Assigned Lawfully On This Legacy Surface
No. The current stored evidence does not affirmatively prove `pokemon_eng_standard` for the unresolved majority. Null or blank source-domain metadata remains insufficient.

## Set-Level Classification Counts
- BLOCKED_UNKNOWN_DOMAIN: 82
- pokemon_eng_special_print: 36

## Exact Next Step
STOP_DOMAIN_GOVERNANCE_REQUIRED. Governance or stored-domain evidence must be added before any domain injection proceeds on the blocked rows.
