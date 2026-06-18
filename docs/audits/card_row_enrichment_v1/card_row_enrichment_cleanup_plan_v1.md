# Card Row Enrichment Cleanup Plan V1

Read-only cleanup plan for English physical card row enrichment gaps.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Child image printing cleanup: deferred and excluded
- This report is not apply authority. Each write package still needs guarded dry-run proof and explicit approval.

## Totals

| metric | value |
| --- | --- |
| english_physical_parent_rows | 22859 |
| parent_gv_id_candidates | 0 |
| parent_gv_id_ready | 0 |
| child_printing_gv_id_candidates | 0 |
| child_printing_gv_id_ready | 0 |
| active_identity_candidates | 0 |
| active_identity_ready | 0 |
| core_identity_gap_rows | 0 |
| external_mapping_gap_rows | 743 |
| no_child_printing_parent_rows | 1067 |
| trait_gaps | 899 |
| species_gaps | 3741 |
| catalog_metadata_gaps | 45 |

## Recommended Package Plan

| package | status | candidate rows | later writes if approved |
| --- | --- | --- | --- |
| ENRICH-01-PARENT-GV-ID-BACKFILL | no_ready_rows | 0 | card_prints.gv_id |
| ENRICH-02-CHILD-PRINTING-GV-ID-BACKFILL | no_ready_rows | 0 | card_printings.printing_gv_id |
| ENRICH-03-ACTIVE-IDENTITY-BACKFILL | no_ready_rows | 0 | card_print_identity inserts |
| ENRICH-04-EXTERNAL-MAPPING-BACKFILL-REVIEW | needs_source_specific_plan | 743 | external_mappings inserts only after source validation |
| ENRICH-05-TRAITS-SPECIES-CATALOG-ENRICHMENT | needs_source_specific_plan | 3741 | card_print_traits/card_print_species/card_prints metadata fields |

## Deterministic Ready Buckets

- Parent GV-ID backfill ready rows: 0
- Child printing GV-ID backfill ready rows: 0
- Active identity backfill ready rows: 0

## Blocked Or Source-Needed Buckets

- Core identity gap rows: 0
- External mapping gap rows: 743
- Parents with no child printings: 1067
- Trait gaps: 899
- Species gaps: 3741
- Catalog metadata gaps: 45

## Important Notes

- `cracked_ice` child rows are not assigned a new `printing_gv_id` suffix in this plan because no existing suffix convention is present in the DB. That must be a governed suffix decision.
- Parent rows with no child printings are not automatically fixed. They may be stale parents or may require Master Index comparison.
- External mappings are source-specific and are not safe to bulk insert from arbitrary payloads without source validation.

Fingerprint: `dd426386a96b4e07fd04be95f22146cb3a8953d69941c00f49e3bc9f2ffdc091`
