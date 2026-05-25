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
| source_acquisition_required | 807 |

## Era Lanes

| era_lane | card prints |
| --- | --- |
| modern | 426 |
| promo_or_special | 212 |
| legacy | 169 |

## Ranked Sets

| rank | set_key | set_name | era | score | readiness_lane | card_prints | printing_rows | source_aliases |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sv4pt5 | Paldean Fates | modern | 94.61 | source_acquisition_required | 108 | 148 | sv04.5 |
| 2 | sv6pt5 | Shrouded Fable | modern | 86.21 | source_acquisition_required | 52 | 69 | sv06.5 |
| 3 | sv8pt5 | Prismatic Evolutions | modern | 84.56 | source_acquisition_required | 180 | 440 | sv08.5 |
| 4 | swsh2 | Rebel Clash | modern | 76.45 | source_acquisition_required | 1 | 2 | swsh2 |
| 5 | mcd21 | McDonald's Collection 2021 | promo_or_special | 76.1 | source_acquisition_required | 25 | 50 | 2021swsh |
| 6 | pgo | Pokémon GO | promo_or_special | 74.43 | source_acquisition_required | 34 | 42 | swsh10.5 |
| 7 | ecard3 | Skyridge | legacy | 74.4 | source_acquisition_required | 15 | 19 | ecard3 |
| 8 | ecard2 | Aquapolis | legacy | 73.64 | source_acquisition_required | 13 | 26 | ecard2 |
| 9 | svp | Scarlet & Violet Black Star Promos | promo_or_special | 69.35 | source_acquisition_required | 73 | 219 | svp |
| 10 | me1 | Mega Evolution | modern | 67.5 | source_acquisition_required | 83 | 168 | me01 |
| 11 | swsh45 | Shining Fates | modern | 61.32 | source_acquisition_required | 2 | 4 | swsh4.5 |
| 12 | xy4 | Phantom Forces | legacy | 60.83 | source_acquisition_required | 16 | 48 | xy4 |
| 13 | mep | MEP Black Star Promos | promo_or_special | 60.5 | source_acquisition_required | 10 | 10 | mep |
| 14 | ex10 | Unseen Forces | legacy | 60.21 | source_acquisition_required | 3 | 3 | ex10 |
| 15 | xyp | XY Black Star Promos | promo_or_special | 56.34 | source_acquisition_required | 61 | 183 | xyp |
| 16 | fut2020 | Pokémon Futsal 2020 | promo_or_special | 50.55 | source_acquisition_required | 5 | 13 | fut2020 |
| 17 | bw9 | Plasma Freeze | legacy | 50 | source_acquisition_required | 2 | 6 | bw9 |
| 18 | dp7 | Stormfront | legacy | 47.84 | source_acquisition_required | 8 | 10 | dp7 |
| 19 | xy9 | BREAKpoint | legacy | 46.2 | source_acquisition_required | 1 | 3 | xy9 |
| 20 | pl1 | Platinum | legacy | 45.04 | source_acquisition_required | 9 | 10 | pl1 |
| 21 | cel25 | Celebrations | promo_or_special | 41.58 | source_acquisition_required | 4 | 4 | cel25 |
| 22 | pl3 | Supreme Victors | legacy | 41.27 | source_acquisition_required | 9 | 9 | pl3 |
| 23 | pl4 | Arceus | legacy | 40.91 | source_acquisition_required | 20 | 27 | pl4 |
| 24 | pl2 | Rising Rivals | legacy | 40.24 | source_acquisition_required | 37 | 64 | pl2 |
| 25 | bw11 | Legendary Treasures | legacy | 36.98 | source_acquisition_required | 25 | 75 | bw11 |
| 26 | col1 | Call of Legends | legacy | 33.44 | source_acquisition_required | 11 | 33 | col1 |

## Guardrails

- physical recovery candidate is not canonical truth
- source aliases are recovery leads only
- exact card-number/name/finish agreement is still required
- human-readable/checklist evidence is still required for finish truth
- no DB writes, migrations, cleanup, quarantine, or apply paths are allowed
