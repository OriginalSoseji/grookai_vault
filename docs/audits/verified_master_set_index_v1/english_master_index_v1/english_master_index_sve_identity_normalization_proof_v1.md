# English Master Index SVE Identity Normalization Proof V1

Audit-only proof for the Scarlet & Violet Energies identity normalization guard.

## Conclusion

stop_manual_review_required

## Global Metrics

| Metric | Baseline | Staged |
| --- | --- | --- |
| generated_at | 2026-05-31T01:16:35.875Z | 2026-05-29T02:27:55.983Z |
| master_verified_cards | 21511 | 21547 |
| master_verified_printings | 38520 | 38324 |
| candidate_printings | 0 | 72 |
| human_source_verified_printings | 325 | 451 |
| conflicts | 0 | 0 |
| evidence_rows | 232307 | 231538 |

## Delta Scope

| Metric | Value |
| --- | --- |
| removed_cards | 20 |
| added_cards | 65 |
| removed_printings | 56 |
| added_printings | 58 |
| removed_cards_by_set | {"mee":8,"exu":1,"pop5":2,"cel25c":1,"cel25":1,"wp":7} |
| added_cards_by_set | {"mee":8,"exu":1,"ex7":3,"ex8":3,"ex10":3,"ex11":3,"ex12":3,"ex13":3,"ex14":2,"ex15":2,"ex16":3,"pop5":2,"swshp":1,"cel25":26,"cel25c":1,"sv10.5b":1} |
| removed_printings_by_set | {"mee":16,"exu":1,"ex16":2,"pop5":2,"bw11":2,"swshp":1,"swsh4.5":2,"cel25":1,"cel25c":1,"sv01":1,"sv05":1,"sv06":1,"sv07":2,"sv10":2,"tk-bw-e":1,"tk-bw-z":1,"tk-dp-l":1,"tk-dp-m":1,"tk-sm-l":1,"tk-sm-r":1,"tk-xy-b":1,"tk-xy-latia":1,"tk-xy-latio":1,"tk-xy-n":1,"tk-xy-p":1,"tk-xy-su":1,"tk-xy-sy":1,"tk-xy-w":1,"wp":7} |
| added_printings_by_set | {"tk-bw-e":1,"tk-bw-z":1,"tk-dp-l":1,"tk-dp-m":1,"mee":8,"tk-sm-r":1,"tk-sm-l":1,"exu":1,"tk-xy-b":1,"tk-xy-latia":1,"tk-xy-latio":1,"tk-xy-n":1,"tk-xy-p":1,"tk-xy-su":1,"tk-xy-sy":1,"tk-xy-w":1,"ex7":3,"ex8":3,"ex10":3,"ex11":3,"ex12":3,"ex13":3,"ex14":2,"ex15":2,"ex16":5,"pop5":2,"col1":1,"swshp":1,"cel25":1,"cel25c":1,"sv10.5b":2} |
| non_sve_removed_cards | 20 |
| non_sve_added_cards | 65 |
| non_sve_removed_printings | 56 |
| non_sve_added_printings | 58 |

## SVE Status

| Metric | Baseline | Staged |
| --- | --- | --- |
| cards | 24 | 24 |
| printings | 79 | 79 |
| cards_by_status | {"master_verified":24} | {"master_verified":24} |
| printings_by_status | {"master_verified":67,"human_source_verified":12} | {"master_verified":47,"human_source_verified":32} |

## Safety Confirmation

```json
{
  "audit_only": true,
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false,
  "non_sve_card_changes": 85,
  "non_sve_printing_changes": 114,
  "conflicts": 0
}
```

## Guard For Promotion

```json
{
  "min_master_verified_printings": 38324,
  "min_master_verified_cards": 21547,
  "max_candidate_printings": 72,
  "max_conflicts": 0,
  "required_non_sve_card_changes": 0,
  "required_non_sve_printing_changes": 0
}
```
