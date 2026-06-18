# ENRICH-12 Residual Source Audit V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `0e9263272d186d2aa8f2ae13b9aad1c9735b6ef6a5dbd6f17d3a4f818b8964be`

## Totals

| metric | rows |
| --- | --- |
| english_physical_parent_rows | 22859 |
| trait_gaps | 899 |
| species_gaps | 3741 |
| catalog_metadata_gaps | 45 |
| external_mapping_gaps | 743 |

## Trait Gaps

| classification | rows |
| --- | --- |
| non_trait_source_mapping_present | 745 |
| external_ids_payload_conversion_candidate | 58 |
| non_trait_payload_present | 45 |
| source_mapped_retry_candidate | 27 |
| no_source_reference_available | 24 |

## Species Gaps

| classification | rows |
| --- | --- |
| trainer_not_species_applicable | 3001 |
| energy_not_species_applicable | 544 |
| blocked_missing_traits | 195 |
| fossil_object_not_species_applicable | 1 |

## Catalog Metadata Gaps

| classification | rows |
| --- | --- |
| non_catalog_source_available | 45 |

## External Mapping Gaps

| classification | rows |
| --- | --- |
| non_primary_payload_mapping_candidate | 636 |
| structured_payload_mapping_candidate | 68 |
| no_external_id_payload | 39 |

## Recommended Next Packages

| package | status | candidate rows | writes if approved |
| --- | --- | --- | --- |
| ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY | ready_for_bounded_dry_run | 27 | card_print_traits inserts only |
| ENRICH-12B-EXTERNAL-ID-PAYLOAD-MAPPING-READINESS | needs_readiness_view | 68 | external_mappings inserts only after exact source validation |
| ENRICH-12C-CATALOG-METADATA-RETRY | no_source_mapped_catalog_rows | 0 | null-only card_prints metadata updates |
| ENRICH-12D-SPECIES-RULE-REVIEW | no_species_rule_review_rows | 0 | card_print_species inserts only after deterministic rule exists |
