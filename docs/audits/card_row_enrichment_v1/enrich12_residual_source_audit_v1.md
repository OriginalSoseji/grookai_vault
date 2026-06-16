# ENRICH-12 Residual Source Audit V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `398bf069e935ecf83bf43d568c9d2875918db60d0fcaf4db6f34dd58079e8d4e`

## Totals

| metric | rows |
| --- | --- |
| english_physical_parent_rows | 23078 |
| trait_gaps | 1090 |
| species_gaps | 3752 |
| catalog_metadata_gaps | 139 |
| external_mapping_gaps | 706 |

## Trait Gaps

| classification | rows |
| --- | --- |
| non_trait_source_mapping_present | 1000 |
| no_source_reference_available | 55 |
| non_trait_payload_present | 31 |
| external_ids_payload_conversion_candidate | 4 |

## Species Gaps

| classification | rows |
| --- | --- |
| trainer_not_species_applicable | 3002 |
| energy_not_species_applicable | 544 |
| blocked_missing_traits | 205 |
| fossil_object_not_species_applicable | 1 |

## Catalog Metadata Gaps

| classification | rows |
| --- | --- |
| non_catalog_source_available | 139 |

## External Mapping Gaps

| classification | rows |
| --- | --- |
| non_primary_payload_mapping_candidate | 622 |
| no_external_id_payload | 70 |
| structured_payload_mapping_candidate | 14 |

## Recommended Next Packages

| package | status | candidate rows | writes if approved |
| --- | --- | --- | --- |
| ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY | no_active_mapping_trait_retry_rows | 0 | card_print_traits inserts only |
| ENRICH-12B-EXTERNAL-ID-PAYLOAD-MAPPING-READINESS | needs_readiness_view | 14 | external_mappings inserts only after exact source validation |
| ENRICH-12C-CATALOG-METADATA-RETRY | no_source_mapped_catalog_rows | 0 | null-only card_prints metadata updates |
| ENRICH-12D-SPECIES-RULE-REVIEW | no_species_rule_review_rows | 0 | card_print_species inserts only after deterministic rule exists |
