# Card Row Enrichment Remaining Blocker Resolution Plan V1

Consolidated read-only plan for the enrichment rows that remain after the current guarded apply sequence.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Write-ready packages now: 0
- Remaining blocker lanes: 10
- Next best work: `governance_adjudication_for_core_identity_and_external_mapping_collisions`

## Blocker Lanes

| lane | rows | status | write_ready_now | next_action |
| --- | --- | --- | --- | --- |
| core_identity | 1 | blocked_governance_required | false | Split into Pocket cleanup/exclusion decision, collision ownership adjudication, and subset alias governance packages. |
| parent_gv_id | 126 | blocked_by_core_identity_and_collisions | false | Resolve core identity and duplicate/collision ownership before another parent GV-ID package. |
| child_printing_gv_id | 131 | blocked_by_parent_gv_id | false | Resume after parent GV-ID blockers are reduced. |
| active_identity | 0 | blocked_projection_or_duplicate_hash | false | Resolve identity projection readiness and duplicate hash ownership before insert package. |
| external_mapping | 706 | blocked_by_existing_owner_collision | false | Build source-specific transfer/adjudication plans; do not bulk insert mappings. |
| no_child_parent | 1087 | blocked_dependency_bearing | false | Resolve duplicate/mapping ownership first, then reassess whether a child insert or non-delete preservation package exists. |
| traits | 1091 | source_exhausted_for_current_rules | false | Add rule/source acquisition for unmapped trait gaps only where exact identity is preserved. |
| species | 3752 | rule_unmapped | false | Design a richer species extraction/adjudication rule; do not infer species from card names yet. |
| catalog_metadata | 139 | source_exhausted_for_current_rules | false | Find additional exact source mappings or payload evidence before another metadata package. |
| child_display_image | 229 | explicitly_deferred | false | Resume Image Truth separately. |

## Key Blocker Counts

- Core identity classifications: `{"blocked_proposed_identity_collision":1}`
- External payload readiness: `{"blocked_variant_source_id_owned_by_base_parent":11,"blocked_existing_source_external_owner":4}`
- No-child parent classifications: `{"dependency_bearing_childless_parent_manual_review":641,"mapping_transfer_or_duplicate_resolution_required":433,"vault_referenced_childless_parent_manual_review":1}`
- Active identity blockers: `{}`
- Parent GV-ID blockers: `{"proposed_gv_id_existing_collision":125,"missing_parent_set_code":1,"missing_printed_number":1}`
- Child GV-ID blockers: `{"missing_parent_gv_id":131}`

## Conclusion

No guarded write package is currently ready. The next phase should be governance/adjudication work, not another apply attempt.

Fingerprint: `f4f3322bdb87c84dedb79cd105c9530789761b44511600cdf3b71039a2cec54e`
