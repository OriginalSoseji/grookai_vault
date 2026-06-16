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
| duplicate_groups | 169 |
| write_ready_groups | 0 |
| blocked_or_preserve_groups | 169 |
| preflight_debt_name | external_mappings_source_card_duplicates |

## Governance Classes

| class | groups |
| --- | --- |
| preserve_until_sidecar | 102 |
| suffix_alias_review | 51 |
| terminology_alias_review | 13 |
| manual_source_specific_review | 1 |
| pocket_alias_blocked | 1 |
| text_alias_review | 1 |

## Alias Kinds

| alias kind | groups |
| --- | --- |
| product_alias | 102 |
| suffix_alias | 51 |
| terminology_alias | 13 |
| manual_review_alias | 1 |
| pocket_product_alias | 1 |
| text_alias | 1 |

## Sources

| source | groups |
| --- | --- |
| justtcg | 117 |
| pokemonapi | 46 |
| tcgdex | 6 |

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
| justtcg | bw2 | 53 | Gigalith | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex12 | 45 | Tentacruel | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex3 | 19 | Salamence | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex5 | 50 | Swalot | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex7 | 37 | Dark Houndoom | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex8 | 38 | Manectric | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | ex9 | 29 | Grumpig | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | me01 | 104 | Mega Kangaskhan ex | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | sm1 | 119 | Great Ball | product_alias | preserve_in_product_alias_sidecar_before_deactivation |
| justtcg | sm1 | 120 | Hau | product_alias | preserve_in_product_alias_sidecar_before_deactivation |

### suffix_alias_review

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| pokemonapi | sm1 | 101a | Eevee | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm10 | 182a | Pokégear 3.0 | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm10 | 189a | Welder | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm10 | 195a | Dedenne-GX | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm11 | 191 | Cherish Ball | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm11 | 206 | Reset Stamp | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm11 | 79 | Jirachi-GX | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm12 | 143a | Togepi & Cleffa & Igglybuff-GX | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm2 | 121 | Choice Band | suffix_alias | adjudicate_source_owner_before_any_deactivation |
| pokemonapi | sm2 | 124 | Enhanced Hammer | suffix_alias | adjudicate_source_owner_before_any_deactivation |

### terminology_alias_review

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| justtcg | sm3 | 148 | Golisopod-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 149 | Tapu Bulu-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 150 | Charizard-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 151 | Salazzle-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 152 | Tapu Fini-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 153 | Necrozma-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 154 | Machamp-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 155 | Lycanroc-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 156 | Marshadow-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |
| justtcg | sm3 | 157 | Alolan Muk-GX | terminology_alias | preserve_source_terminology_alias_before_deactivation |

### manual_source_specific_review

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| tcgdex | cel25c | 15 | Venusaur | manual_review_alias | manual_review_before_any_deactivation |

### pocket_alias_blocked

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | pocket_product_alias | defer_to_pocket_product_governance |

### text_alias_review

| source | set | number | name | alias kind | action |
| --- | --- | --- | --- | --- | --- |
| justtcg | me02 | 054 | Gastly | text_alias | confirm_source_slug_policy_before_deactivation |

Recommended next step: `design_source_alias_sidecar_schema_or_accept_this_as_deferred_preflight_debt`

Fingerprint: `95de875d9f5a033de376ab2d4dcab61cd0bdf903386476e720e782110b369822`
