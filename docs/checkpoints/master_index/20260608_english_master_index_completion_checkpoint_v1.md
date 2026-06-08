# English Master Index Completion Checkpoint V1

Generated: 2026-06-08

## Scope

Audit-only Master Index completion checkpoint.

No DB writes, migrations, cleanup, quarantine, public hiding, or Grookai reconciliation were performed.

## Result

The English physical Pokemon TCG Master Index is complete to the current governed standard for standard sets.

| metric | value |
| --- | --- |
| sets_in_registry | 201 |
| standard publishable-complete sets | 199 |
| non-standard reference lanes | 2 |
| source gap queue items | 0 |
| working card identity facts | 21520 |
| master-admissible card identity facts | 21520 |
| working printing facts | 38841 |
| master-admissible printing facts | 38841 |
| finish blocker boundary facts in working truth | 0 |
| adjudicated excluded printing facts | 5 |

## Chaos Rising

Chaos Rising is included as publishable-complete.

| field | value |
| --- | --- |
| set_key | me04 |
| set_name | Chaos Rising |
| cards | 122/122 |
| printings | 247/247 |
| finish counts | normal: 113, reverse: 76, holo: 58 |
| blocker summary | No current completion blocker |

## Non-Standard Lanes

`jumbo` and `sp` remain non-standard reference lanes. They are not counted as failed standard Master Index completion because they are not normal double-source set truth lanes.

## Adjudicated Exclusions

The final five finish-second-source blockers were not promoted. They were excluded from working Master Index truth and preserved in:

`docs/audits/english_master_index_completion_v1/english_master_index_adjudicated_excluded_printings_v1.json`

Excluded facts:

| set | number | card | finish | reason class |
| --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | finish_label_conflict |
| sm8 | 187 | Net Ball | stamped | card_number_conflict |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | finish_label_conflict |
| sv03.5 | 146 | Moltres | normal | finish_label_conflict |
| ex9 | 107 | Farfetch'd | normal | finish_label_conflict |

These exclusions are not deletion authority for Grookai. They only prevent unsupported or alias-conflicted facts from blocking or entering the publishable Master Index.

## Generated Artifacts

- `docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json`
- `docs/audits/english_master_index_completion_v1/english_master_index_set_completion_matrix_v1.json`
- `docs/audits/english_master_index_completion_v1/english_master_index_master_admissible_export_v1.json`
- `docs/audits/english_master_index_completion_v1/english_master_index_adjudicated_excluded_printings_v1.json`
- `docs/audits/english_master_index_publishable_v1/english_master_index_publishable_manifest_v1.json`
- `docs/audits/english_master_index_publishable_v1/sets/me04/summary.md`

## Safety Confirmation

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| grookai_reconciliation_performed | false |
