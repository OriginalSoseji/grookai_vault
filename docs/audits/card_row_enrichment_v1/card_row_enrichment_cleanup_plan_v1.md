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
| english_physical_parent_rows | 22791 |
| parent_gv_id_candidates | 0 |
| parent_gv_id_ready | 0 |
| child_printing_gv_id_candidates | 0 |
| child_printing_gv_id_ready | 0 |
| active_identity_candidates | 0 |
| active_identity_ready | 0 |
| core_identity_gap_rows | 0 |
| external_mapping_gap_rows | 675 |
| no_child_printing_parent_rows | 1083 |
| trait_gaps | 831 |
| species_gaps | 3740 |
| catalog_metadata_gaps | 139 |

## Recommended Package Plan

| package | status | candidate rows | later writes if approved |
| --- | --- | --- | --- |
| ENRICH-01-PARENT-GV-ID-BACKFILL | no_ready_rows | 0 | card_prints.gv_id |
| ENRICH-02-CHILD-PRINTING-GV-ID-BACKFILL | no_ready_rows | 0 | card_printings.printing_gv_id |
| ENRICH-03-ACTIVE-IDENTITY-BACKFILL | no_ready_rows | 0 | card_print_identity inserts |
| ENRICH-04-EXTERNAL-MAPPING-BACKFILL-REVIEW | needs_source_specific_plan | 675 | external_mappings inserts only after source validation |
| ENRICH-05-TRAITS-SPECIES-CATALOG-ENRICHMENT | needs_source_specific_plan | 3740 | card_print_traits/card_print_species/card_prints metadata fields |

## Deterministic Ready Buckets

- Parent GV-ID backfill ready rows: 0
- Child printing GV-ID backfill ready rows: 0
- Active identity backfill ready rows: 0

## Blocked Or Source-Needed Buckets

- Core identity gap rows: 0
- External mapping gap rows: 675
- Parents with no child printings: 1083
- Trait gaps: 831
- Species gaps: 3740
- Catalog metadata gaps: 139

## Important Notes

- `cracked_ice` child rows are not assigned a new `printing_gv_id` suffix in this plan because no existing suffix convention is present in the DB. That must be a governed suffix decision.
- Parent rows with no child printings are not automatically fixed. They may be stale parents or may require Master Index comparison.
- External mappings are source-specific and are not safe to bulk insert from arbitrary payloads without source validation.

Fingerprint: `353e07816436eca30cb5405768d31469ae26836ef27f545f2b61a0b218aec710`
