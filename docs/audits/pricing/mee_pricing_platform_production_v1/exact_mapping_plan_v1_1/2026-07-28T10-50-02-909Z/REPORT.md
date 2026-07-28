# TCGPlayer Exact Mapping Plan V1

- Status: `passed`
- Source products reviewed: `1042`
- Exact candidates: `276`
- Blocked: `766`
- Covered gap rows projected: `445`
- Database writes: `0`

## Candidate Lanes

- reviewed_group_set_authority: `99`
- unique_group_set_consensus: `177`

## Blocked Reasons

- missing_printed_number_evidence: `208`
- missing_unique_set_authority: `186`
- multiple_source_products_match_same_canonical_target: `54`
- no_exact_set_number_name_target: `185`
- target_already_has_active_tcgplayer_mapping: `13`
- target_missing_unique_active_standard_identity: `120`

## Boundary

This artifact is a read-only plan. It does not insert, update, deactivate,
or approve any canonical mapping. Every candidate requires one exact target,
one active standard identity, no existing source mapping, no target mapping
collision, and exact normalized name and collector-number evidence.
