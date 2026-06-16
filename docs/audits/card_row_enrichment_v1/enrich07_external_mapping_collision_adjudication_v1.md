# ENRICH-07 External Mapping Collision Adjudication V1

Read-only adjudication of the external mapping payload backfill rows blocked by active source/external-id collisions.

## Safety

- DB writes performed: false
- Migrations created: false
- No mapping inserts, transfers, parent writes, child writes, deletes, merges, or image writes were executed.
- This report is not apply authority.

## Summary

- Input package: `ENRICH-07-EXTERNAL-MAPPING-PAYLOAD-BACKFILL`
- Input package passed: false
- Input package fingerprint: `e9a1e6b7f09e7cca3694edd9702dd28077706605e4a80507b62e98070086b382`
- Target rows: 15
- Collision rows: 15
- Same core identity rows: 11
- Same modifier identity rows: 4
- Target empty rows: 0
- Target dependency-bearing rows: 15

## Classification Counts

| classification | rows |
| --- | --- |
| external_id_shared_across_modifier_or_variant_manual_review | 11 |
| external_id_conflicts_with_different_card_manual_review | 4 |

## Collision Rows

| source | external_id | target | owner | target deps | owner deps | classification |
| --- | --- | --- | --- | --- | --- | --- |
| pokemonapi | sv2-61 | sv02 61 Chien-Pao ex | sv02 61 Chien-Pao ex | 10 | 14 | external_id_shared_across_modifier_or_variant_manual_review |
| pokemonapi | swshp-SWSH167 | swshp SWSH167 Professor Burnet | swshp SWSH167 Professor Burnet | 4 | 7 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | bw1-53 | bw1 53 Whirlipede | bw1 53 Whirlipede | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | bw1-79 | bw1 79 Watchog | bw1 79 Watchog | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | bw1-81 | bw1 81 Lillipup | bw1 81 Lillipup | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | bw2-82 | bw2 82 Unfezant | bw2 82 Unfezant | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | bw3-32 | bw3 32 Cryogonal | bw3 32 Cryogonal | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | hgss1-39 | hgss1 39 Delibird | hgss1 39 Delibird | 4 | 9 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | sv03-086 | sv03 086 Espeon | sv03 086 Espeon | 4 | 8 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | sv05-123 | sv05 123 Raging Bolt ex | sv05 123 Raging Bolt ex | 4 | 7 | external_id_shared_across_modifier_or_variant_manual_review |
| tcgdex | sv08.5-122 | sv8pt5 122 Professor's Research | sv08.5 122 Professor's Research | 5 | 7 | external_id_conflicts_with_different_card_manual_review |
| tcgdex | sv08.5-123 | sv8pt5 123 Professor's Research | sv08.5 123 Professor's Research | 5 | 7 | external_id_conflicts_with_different_card_manual_review |
| tcgdex | sv08.5-124 | sv8pt5 124 Professor's Research | sv08.5 124 Professor's Research | 5 | 7 | external_id_conflicts_with_different_card_manual_review |
| tcgdex | sv08.5-125 | sv8pt5 125 Professor's Research | sv08.5 125 Professor's Research | 5 | 7 | external_id_conflicts_with_different_card_manual_review |
| tcgdex | swshp-SWSH167 | swshp SWSH167 Professor Burnet | swshp SWSH167 Professor Burnet | 4 | 7 | external_id_shared_across_modifier_or_variant_manual_review |

## Decision

ENRICH-07 remains blocked. These rows cannot be fixed by inserting new `external_mappings` rows because the active source/external IDs already belong to existing owners.

Fingerprint: `cc970890cf7d9acf606bfbf1a69cf127a2d062e471b328eab1be0d7655cf6c8e`
