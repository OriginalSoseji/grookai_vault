# Card Row Identity Provenance Plan V1

Read-only readiness plan for the remaining identity, GV-ID, active identity, and provenance enrichment gaps.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Child image printing work: deferred
- This report is not apply authority.

## Summary

| metric | value |
| --- | --- |
| english_physical_parent_rows | 23079 |
| english_physical_child_printing_rows | 38113 |
| parent_gv_id_candidates | 130 |
| parent_gv_id_ready | 0 |
| child_printing_gv_id_candidates | 143 |
| child_printing_gv_id_ready | 0 |
| active_identity_candidates | 0 |
| active_identity_ready | 0 |
| core_identity_gap_rows | 5 |
| child_provenance_gap_rows | 13428 |
| child_display_image_gap_rows_deferred | 229 |

## Readiness Lanes

| lane | status | candidates | ready | top blockers |
| --- | --- | --- | --- | --- |
| parent_gv_id | blocked_no_write_ready_rows | 130 | 0 | proposed_gv_id_existing_collision=125, missing_parent_set_code=5, missing_printed_number=5 |
| child_printing_gv_id | blocked_no_write_ready_rows | 143 | 0 | missing_parent_gv_id=143 |
| active_identity | not_applicable | 0 | 0 |  |
| core_identity | blocked_source_or_set_resolution_required | 5 | 0 | missing_number=5, missing_number_plain=5, missing_set_code=5 |
| child_provenance | deferred_enrichment_not_canon_blocker | 13428 | 0 | provenance_source_policy_needed=13428 |
| child_display_image | explicitly_deferred_by_current_scope | 229 | 0 | deferred_child_image_printing_work=229 |

## Dependency Order

1. core_identity
2. parent_gv_id
3. child_printing_gv_id
4. active_identity
5. external_mapping
6. traits_species_catalog_metadata
7. child_provenance
8. child_display_image_deferred

## Decisions

- printing_gv_id backfill is blocked until parent gv_id is stable.
- parent gv_id backfill is blocked when parent set_code/number is missing or the proposed gv_id collides.
- active identity inserts are blocked when the projection is not ready or identity hashes duplicate.
- child provenance is enrichment metadata, not evidence that the canonical printing is wrong.
- child display image cleanup remains deferred in this pass.

## Recommended Next Step

Next report-only package: `ENRICH-13-CORE-IDENTITY-SET-CODE-RESOLUTION-READINESS`.

Core identity is the upstream blocker for parent gv_id, child printing_gv_id, and some active identity residuals.

Fingerprint: `0555de9b3180cbc95f0c88bbffbd73dd83ff56e26d130b953b7f7340f55210ee`
