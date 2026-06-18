# External Mapping Alias Sidecar Policy V1

Audit-only governance report for the remaining source-card duplicate `external_mappings` groups.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false

## Current State

| metric | value |
| --- | --- |
| duplicate_groups | 5 |
| write_ready_groups | 0 |
| blocked_or_preserve_groups | 5 |
| preflight_debt_name | external_mappings_source_card_duplicates |

## Governance Classes

| class | groups |
| --- | --- |
| preserve_until_sidecar | 3 |
| manual_source_specific_review | 1 |
| pocket_alias_blocked | 1 |

## Alias Kinds

| alias kind | groups |
| --- | --- |
| product_alias | 3 |
| manual_review_alias | 1 |
| pocket_product_alias | 1 |

## Sources

| source | groups |
| --- | --- |
| justtcg | 4 |
| tcgdex | 1 |

## Policy

`external_mappings` is the canonical source ownership bridge. Product, deck, prize-pack, suffix/base, terminology, text, and Pocket aliases should move to a sidecar before any destructive cleanup.

Allowed cleanup without sidecar:

- formatting_duplicate_ready

Blocked cleanup until sidecar or explicit adjudication:

- preserve_until_sidecar
- suffix_alias_review
- terminology_alias_review
- text_alias_review
- pocket_alias_blocked
- manual_source_specific_review

## Future Sidecar Shape

```text
canonical_card_print_id
canonical_external_mapping_id
source
alias_external_id
alias_kind
alias_status
source_domain
evidence_reason
preserved_from_mapping_id
created_from_audit
active
```

## Sample Groups

### preserve_until_sidecar

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| justtcg | svp | 107 | Mareep | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | svp | 108 | Flaaffy | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | svp | 109 | Ampharos | product_alias | preserve_in_product_alias_sidecar_before_deactivation |

### manual_source_specific_review

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| tcgdex | cel25c | 15 | Venusaur | manual_review_alias | manual_review_before_any_deactivation |

### pocket_alias_blocked

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | pocket_product_alias | defer_to_pocket_product_governance |

Recommended next step: `design_source_alias_sidecar_schema_or_accept_this_as_deferred_preflight_debt`

Fingerprint: `11f07f0fdd6097e4c27286b8bc134260d0713a06f1ef2f11385b132ddcf6eb2c`
