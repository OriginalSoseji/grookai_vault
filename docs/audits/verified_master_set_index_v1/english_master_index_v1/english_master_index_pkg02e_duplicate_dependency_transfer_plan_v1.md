# English Master Index PKG-02E Duplicate Dependency Transfer Plan V1

This is an audit-only dependency transfer plan for the 21 possible duplicate rows from PKG-02D.

No DB writes, migrations, cleanup, quarantine, merge, delete, or apply operation was performed.

## Result

- Status: `pkg02e_duplicate_dependency_transfer_plan_complete_no_write`
- Duplicate dependency rows reviewed: 21
- Parent FK surfaces checked: 45
- Child FK surfaces checked: 3
- DB writes performed: false
- Migrations created: false

## Readiness

| Readiness | Count |
| --- | ---: |
| dry_run_candidate_after_dependency_transfer_mapping | 21 |

## Set Summary

| Set | Rows | Transfer dry-run candidates | Simple delete candidates | Dependency blocked | Ownership/market blocked |
| --- | ---: | ---: | ---: | ---: | ---: |
| ex10 | 3 | 3 | 0 | 0 | 0 |
| mep | 10 | 10 | 0 | 0 | 0 |
| pl2 | 2 | 2 | 0 | 0 | 0 |
| pl4 | 6 | 6 | 0 | 0 | 0 |

## Pair Plans

| Readiness | Set | Target | Blocked deps | Child deps | Next step |
| --- | --- | --- | ---: | ---: | --- |
| dry_run_candidate_after_dependency_transfer_mapping | ex10 | 113 Entei ★ | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | ex10 | 114 Raikou ★ | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | ex10 | 115 Suicune ★ | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 001 Meganium | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 002 Inteleon | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 003 Alakazam | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 004 Lunatone | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 005 Drifloon | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 006 Drifblim | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 007 Psyduck | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 008 Golduck | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 009 Alakazam | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | mep | 010 Riolu | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl2 | 71 Nidoran ♀ | 6 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl2 | 72 Nidoran ♂ | 6 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 94 Arceus LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 95 Arceus LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 96 Arceus LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 97 Gengar LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 98 Salamence LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |
| dry_run_candidate_after_dependency_transfer_mapping | pl4 | 99 Tangrowth LV.X | 5 | 0 | prepare_dependency_transfer_dry_run_artifact_only |

## Safety

- No DB writes were performed.
- No migrations were created.
- No cleanup, quarantine, merge, delete, or apply path was executed.
- This report does not authorize dependency transfer.
- This report does not authorize deleting duplicate parents or child printings.
