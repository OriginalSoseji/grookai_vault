# ENRICH-13F Suffix Variant Collision Governance V1

Read-only governance plan for number-suffix collision blockers.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Target rows: 4
- Duplicate suffix dependency-transfer candidates: 0
- Base-number versus suffix collision rows: 4
- Manual-review rows: 0
- Write-ready now: false
- Recommended strategy: `split_suffix_parent_governance_from_duplicate_suffix_dependency_transfer`

## Precedent

- Checkpoint: `docs/checkpoints/master_index/20260610_pkg08m_suffix_parent_split_real_apply_checkpoint_v1.md`
- Rule: Existing base parents were preserved while suffix parents were introduced separately.

## Lane Counts

| lane | rows |
| --- | --- |
| base_number_collides_with_suffix_parent_requires_split_governance | 4 |

## Set Counts

| set_code | rows |
| --- | --- |
| xyp | 2 |
| xy4 | 1 |
| xy9 | 1 |

## Dependency Totals

| lane | side | dependency | rows |
| --- | --- | --- | --- |
| base_number_collides_with_suffix_parent_requires_split_governance | source | child_count | 12 |
| base_number_collides_with_suffix_parent_requires_split_governance | source | active_identity_count | 4 |
| base_number_collides_with_suffix_parent_requires_split_governance | source | active_mapping_count | 4 |
| base_number_collides_with_suffix_parent_requires_split_governance | source | trait_count | 4 |
| base_number_collides_with_suffix_parent_requires_split_governance | source | species_count | 3 |
| base_number_collides_with_suffix_parent_requires_split_governance | source | vault_instance_count | 0 |
| base_number_collides_with_suffix_parent_requires_split_governance | owner | child_count | 11 |
| base_number_collides_with_suffix_parent_requires_split_governance | owner | active_identity_count | 4 |
| base_number_collides_with_suffix_parent_requires_split_governance | owner | active_mapping_count | 10 |

## Governance Decision

Decision: `suffix_letter_is_identity_bearing_when_source_backed`

A printed number suffix such as 65a or XY150a is not a decorative spelling difference. Base-number rows and suffix-number rows must not be merged unless a later source audit proves one side is invalid.

Deterministic lanes:

- duplicate suffix rows can become dependency-transfer candidates only when proposed number equals existing suffix owner number
- base-number rows colliding with suffix owners require split governance and source proof before write planning

Forbidden:

- do not merge base rows into suffix owners
- do not delete suffix owners while base rows exist
- do not overwrite suffix owner parent identity
- do not mint or backfill GV IDs until suffix identity uniqueness is proven
- do not include these rows in 13D or 13E duplicate-transfer packages

## Duplicate Suffix Rows

_None._

## Base Number Versus Suffix Rows

| set | base_number | name | suffix_owner_number | suffix_owner_name | source_id | strategy |
| --- | --- | --- | --- | --- | --- | --- |
| xy4 | 65 | Aegislash EX | 65a | Aegislash-EX | xy4-65 | base_number_preserved_separate_from_number_suffix:a |
| xy9 | 98 | Delinquent | 98a | Delinquent | xy9-98 | base_number_preserved_separate_from_number_suffix:a |
| xyp | XY150 | Yveltal EX | XY150a | Yveltal-EX | xyp-XY150 | base_number_preserved_separate_from_number_suffix:a |
| xyp | XY198 | M Camerupt-EX | XY198a | M Camerupt-EX | xyp-XY198 | base_number_preserved_separate_from_number_suffix:a |

## Future Package Shape

Package: `ENRICH-13F1-SUFFIX-VARIANT-SPLIT-AND-DUPLICATE-DRY-RUN`

Current status: `not_write_ready_dry_run_required`

Required before real apply:

- fresh dependency snapshot
- source proof that base and suffix are distinct or one side is invalid
- guarded rollback-only dry-run
- rollback artifact
- post-dry-run identity uniqueness proof

## Conclusion

Suffix collisions are not safe to collapse generically. The safe path is a modifier-aware dry-run that preserves base and suffix identities unless source proof says one side is invalid.

Fingerprint: `6a5171e7d93c0266ff3a7a18bebb34fda335c0a58cc1553241f99312b91826d5`
