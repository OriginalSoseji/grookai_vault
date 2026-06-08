# English Master Index Physical Recovery Priority V1

This is an audit-only priority map for `missing_set_code` rows with matched physical TCG source aliases. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- physical_candidate_sets: 26
- physical_candidate_card_prints: 807
- physical_candidate_printing_rows: 1685

## Readiness Lanes

| lane | card prints |
| --- | --- |
| proof_loop_candidate_after_card_match | 285 |
| high_volume_recovery_candidate | 180 |
| source_acquisition_required | 161 |
| legacy_caution_review | 104 |
| promo_family_caution_review | 77 |

## Era Lanes

| era_lane | card prints |
| --- | --- |
| modern | 426 |
| promo_or_special | 212 |
| legacy | 169 |

## Ranked Sets

| rank | set_key | set_name | era | score | readiness_lane | card_prints | printing_rows | source_aliases |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sv4pt5 | Paldean Fates | modern | 100 | proof_loop_candidate_after_card_match | 108 | 148 | sv04.5 |
| 2 | sv6pt5 | Shrouded Fable | modern | 100 | proof_loop_candidate_after_card_match | 52 | 69 | sv06.5 |
| 3 | mcd21 | McDonald's Collection 2021 | promo_or_special | 99.98 | proof_loop_candidate_after_card_match | 25 | 50 | 2021swsh |
| 4 | sv8pt5 | Prismatic Evolutions | modern | 96.62 | high_volume_recovery_candidate | 180 | 440 | sv08.5 |
| 5 | pgo | Pokémon GO | promo_or_special | 88.59 | proof_loop_candidate_after_card_match | 34 | 42 | swsh10.5 |
| 6 | swsh2 | Rebel Clash | modern | 87.97 | proof_loop_candidate_after_card_match | 1 | 2 | swsh2 |
| 7 | ecard3 | Skyridge | legacy | 87.46 | proof_loop_candidate_after_card_match | 15 | 19 | ecard3 |
| 8 | ecard2 | Aquapolis | legacy | 86.89 | proof_loop_candidate_after_card_match | 13 | 26 | ecard2 |
| 9 | dp7 | Stormfront | legacy | 85.48 | proof_loop_candidate_after_card_match | 8 | 10 | dp7 |
| 10 | pl1 | Platinum | legacy | 82.97 | proof_loop_candidate_after_card_match | 9 | 10 | pl1 |
| 11 | svp | Scarlet & Violet Black Star Promos | promo_or_special | 78.9 | promo_family_caution_review | 73 | 219 | svp |
| 12 | pl2 | Rising Rivals | legacy | 77.28 | legacy_caution_review | 37 | 64 | pl2 |
| 13 | xy4 | Phantom Forces | legacy | 77.04 | legacy_caution_review | 16 | 48 | xy4 |
| 14 | pl4 | Arceus | legacy | 75.56 | proof_loop_candidate_after_card_match | 20 | 27 | pl4 |
| 15 | cel25 | Celebrations | promo_or_special | 74.24 | promo_family_caution_review | 4 | 4 | cel25 |
| 16 | bw11 | Legendary Treasures | legacy | 70.71 | legacy_caution_review | 25 | 75 | bw11 |
| 17 | ex10 | Unseen Forces | legacy | 69.67 | legacy_caution_review | 3 | 3 | ex10 |
| 18 | pl3 | Supreme Victors | legacy | 67.98 | legacy_caution_review | 9 | 9 | pl3 |
| 19 | bw9 | Plasma Freeze | legacy | 67.24 | legacy_caution_review | 2 | 6 | bw9 |
| 20 | col1 | Call of Legends | legacy | 64.86 | legacy_caution_review | 11 | 33 | col1 |
| 21 | xy9 | BREAKpoint | legacy | 61.91 | legacy_caution_review | 1 | 3 | xy9 |
| 22 | mep | MEP Black Star Promos | promo_or_special | 60.5 | source_acquisition_required | 10 | 10 | mep |
| 23 | xyp | XY Black Star Promos | promo_or_special | 54.98 | source_acquisition_required | 61 | 183 | xyp |
| 24 | fut2020 | Pokémon Futsal 2020 | promo_or_special | 50.55 | source_acquisition_required | 5 | 13 | fut2020 |
| 25 | me1 | Mega Evolution | modern | 11 | source_acquisition_required | 83 | 168 | me01 |
| 26 | swsh45 | Shining Fates | modern | 4.82 | source_acquisition_required | 2 | 4 | swsh4.5 |

## Guardrails

- physical recovery candidate is not canonical truth
- source aliases are recovery leads only
- exact card-number/name/finish agreement is still required
- human-readable/checklist evidence is still required for finish truth
- no DB writes, migrations, cleanup, quarantine, or apply paths are allowed
