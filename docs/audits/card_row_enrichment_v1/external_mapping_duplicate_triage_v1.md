# External Mapping Duplicate Triage V1

Read-only triage for the preflight `external_mappings_source_card_duplicates` deferred debt.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false

## Totals

| metric | value |
| --- | --- |
| duplicate_source_card_groups | 5 |
| duplicate_mapping_rows_in_groups | 13 |
| english_physical_groups | 4 |
| pocket_groups | 1 |

## By Source

| source | groups |
| --- | --- |
| justtcg | 4 |
| tcgdex | 1 |

## By Classification

| classification | groups |
| --- | --- |
| source_specific_alias_review | 3 |
| pocket_domain_review | 1 |
| tcgdex_multiple_ids_same_card_review | 1 |

## Sample Groups

| source | set | number | name | domain | count | classification |
| --- | --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | tcg_pocket_excluded | 2 | pocket_domain_review |
| justtcg | svp | 107 | Mareep | pokemon_eng_standard | 4 | source_specific_alias_review |
| justtcg | svp | 108 | Flaaffy | pokemon_eng_standard | 3 | source_specific_alias_review |
| justtcg | svp | 109 | Ampharos | pokemon_eng_standard | 2 | source_specific_alias_review |
| tcgdex | cel25c | 15 | Venusaur | pokemon_eng_standard | 2 | tcgdex_multiple_ids_same_card_review |

Recommended next step: `source_specific_readiness_rules_before_any_external_mapping_deactivation`

Fingerprint: `815215fe8f47aa25ddbfe21ff1f445776e925b8fbe9ab651a46c962b519f08ca`
