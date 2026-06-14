# PKG-14 PL4 Identity Adjudication V1

Audit-only adjudication for the remaining PL4 parent identity blockers.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- source_rows: 2
- adjudicated_rows: 2
- fingerprint: `614bc605517a593a5f24939389a9baec1f9d5035a274d23e8d8e38c509f13f67`

| adjudication_status | rows |
| --- | --- |
| db_parent_name_and_mapping_transfer_ready | 2 |

| db_action | rows |
| --- | --- |
| prepare_guarded_zapdos_g_parent_name_update_and_mapping_transfer | 2 |

## Adjudicated Rows

| set | number | source_name | finish | canonical_name | status | db_action |
| --- | --- | --- | --- | --- | --- | --- |
| pl4 | 12 | Zapdos | holo | Zapdos G | db_parent_name_and_mapping_transfer_ready | prepare_guarded_zapdos_g_parent_name_update_and_mapping_transfer |
| pl4 | 12 | Zapdos | reverse | Zapdos G | db_parent_name_and_mapping_transfer_ready | prepare_guarded_zapdos_g_parent_name_update_and_mapping_transfer |

## Mapping Transfer Candidates

| source | external_id | from | to | reason |
| --- | --- | --- | --- | --- |
| tcgplayer | 90726 | 6b44fbe5-21e8-4ee9-9065-195f24d74eb8 | 8716f287-3497-49b2-a499-9c1e026a6a94 | TCGplayer product is Zapdos G #12, not Shinx SH12. |
| justtcg | pokemon-arceus-zapdos-g-holo-rare | 6b44fbe5-21e8-4ee9-9065-195f24d74eb8 | 8716f287-3497-49b2-a499-9c1e026a6a94 | JustTCG slug is Zapdos G holo rare, not Shinx SH12. |

## Decision

- PL4 #12 should become `Zapdos G` in the DB, and only the Zapdos-labelled mappings currently attached to Shinx SH12 should move to the Zapdos G parent.
- PL4 #26 and #53 should not update the DB. The DB already uses the supported SP names `Porygon-Z G` and `Beedrill G`; the Master Index/source-label lane needs correction or governed suppression.
- Shinx SH12 remains a distinct shiny subset identity and keeps its `tcgdex:pl4-SH12` mapping.
