# English Master Index Physical Recovery Priority V1

This is an audit-only priority map for `missing_set_code` rows with matched physical TCG source aliases. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- physical_candidate_sets: 25
- physical_candidate_card_prints: 802
- physical_candidate_printing_rows: 1672

## Readiness Lanes

| lane | card prints |
| --- | --- |
| proof_loop_candidate_after_card_match | 343 |
| source_acquisition_required | 276 |
| legacy_caution_review | 104 |
| promo_family_caution_review | 77 |
| manual_priority_review | 2 |

## Era Lanes

| era_lane | card prints |
| --- | --- |
| modern | 460 |
| legacy | 169 |
| promo_or_special | 148 |
| other | 25 |

## Ranked Sets

| rank | set_key | set_name | era | score | readiness_lane | card_prints | printing_rows | source_aliases |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sv04.5 | Paldean Fates | modern | 100 | proof_loop_candidate_after_card_match | 108 | 148 | sv04.5 |
| 2 | sv06.5 | Shrouded Fable | modern | 100 | proof_loop_candidate_after_card_match | 52 | 69 | sv06.5 |
| 3 | me01 | Mega Evolution | modern | 96.2 | proof_loop_candidate_after_card_match | 83 | 168 | me01 |
| 4 | swsh10.5 | Pokémon GO | modern | 95.21 | proof_loop_candidate_after_card_match | 34 | 42 | swsh10.5 |
| 5 | swsh2 | Rebel Clash | modern | 87.97 | proof_loop_candidate_after_card_match | 1 | 2 | swsh2 |
| 6 | ecard3 | Skyridge | legacy | 87.46 | proof_loop_candidate_after_card_match | 15 | 19 | ecard3 |
| 7 | ecard2 | Aquapolis | legacy | 86.97 | proof_loop_candidate_after_card_match | 13 | 26 | ecard2 |
| 8 | dp7 | Stormfront | legacy | 85.48 | proof_loop_candidate_after_card_match | 8 | 10 | dp7 |
| 9 | pl1 | Platinum | legacy | 82.97 | proof_loop_candidate_after_card_match | 9 | 10 | pl1 |
| 10 | svp | Scarlet & Violet Black Star Promos | promo_or_special | 78.9 | promo_family_caution_review | 73 | 219 | svp |
| 11 | pl2 | Rising Rivals | legacy | 77.28 | legacy_caution_review | 37 | 64 | pl2 |
| 12 | xy4 | Phantom Forces | legacy | 77.04 | legacy_caution_review | 16 | 48 | xy4 |
| 13 | swsh4.5 | Shining Fates | modern | 75.71 | manual_priority_review | 2 | 4 | swsh4.5 |
| 14 | pl4 | Arceus | legacy | 75.56 | proof_loop_candidate_after_card_match | 20 | 27 | pl4 |
| 15 | 2021swsh | McDonald's Collection 2021 | other | 74.48 | source_acquisition_required | 25 | 50 | 2021swsh |
| 16 | cel25 | Celebrations | promo_or_special | 74.46 | promo_family_caution_review | 4 | 4 | cel25 |
| 17 | sv08.5 | Prismatic Evolutions | modern | 71.5 | source_acquisition_required | 180 | 440 | sv08.5 |
| 18 | bw11 | Legendary Treasures | legacy | 70.71 | legacy_caution_review | 25 | 75 | bw11 |
| 19 | ex10 | Unseen Forces | legacy | 69.67 | legacy_caution_review | 3 | 3 | ex10 |
| 20 | pl3 | Supreme Victors | legacy | 67.98 | legacy_caution_review | 9 | 9 | pl3 |
| 21 | bw9 | Plasma Freeze | legacy | 67.24 | legacy_caution_review | 2 | 6 | bw9 |
| 22 | col1 | Call of Legends | legacy | 64.86 | legacy_caution_review | 11 | 33 | col1 |
| 23 | xy9 | BREAKpoint | legacy | 61.91 | legacy_caution_review | 1 | 3 | xy9 |
| 24 | mep | MEP Black Star Promos | promo_or_special | 60.5 | source_acquisition_required | 10 | 10 | mep |
| 25 | xyp | XY Black Star Promos | promo_or_special | 54.98 | source_acquisition_required | 61 | 183 | xyp |

## Guardrails

- physical recovery candidate is not canonical truth
- source aliases are recovery leads only
- exact card-number/name/finish agreement is still required
- human-readable/checklist evidence is still required for finish truth
- no DB writes, migrations, cleanup, quarantine, or apply paths are allowed
