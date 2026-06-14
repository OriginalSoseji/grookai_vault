# English Master Index Physical Recovery Exact Match V1

This is an audit-only feasibility check for physical TCG `missing_set_code` recovery candidates. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- candidate_card_prints: 802
- candidate_printing_rows: 1672

## Card Match Status

| status | card prints |
| --- | --- |
| exact_card_identity_match | 798 |
| number_missing_from_index | 4 |

## Finish Match Status

| status | card prints |
| --- | --- |
| all_finishes_master_verified_by_index | 422 |
| partial_finishes_supported_by_index | 373 |
| blocked_until_card_identity_match | 4 |
| no_finishes_supported_by_index | 3 |

## Top Sets

| set_key | card prints |
| --- | --- |
| sv08.5 | 180 |
| sv04.5 | 108 |
| me01 | 83 |
| svp | 73 |
| xyp | 61 |
| sv06.5 | 52 |
| pl2 | 37 |
| swsh10.5 | 34 |
| 2021swsh | 25 |
| bw11 | 25 |
| pl4 | 20 |
| xy4 | 16 |
| ecard3 | 15 |
| ecard2 | 13 |
| col1 | 11 |
| mep | 10 |
| pl1 | 9 |
| pl3 | 9 |
| dp7 | 8 |
| cel25 | 4 |
| ex10 | 3 |
| bw9 | 2 |
| swsh4.5 | 2 |
| swsh2 | 1 |
| xy9 | 1 |

## Sample Rows

| set | external_id | card | card_status | finish_status | candidate_finishes | supported | unsupported |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2021swsh | 2021swsh-1 | Bulbasaur | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-2 | Chikorita | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-3 | Treecko | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-4 | Turtwig | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-5 | Snivy | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-6 | Chespin | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-7 | Rowlet | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-8 | Grookey | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-9 | Charmander | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-10 | Cyndaquil | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-11 | Torchic | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-12 | Chimchar | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-13 | Tepig | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-14 | Fennekin | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-15 | Litten | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-16 | Scorbunny | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-17 | Squirtle | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-18 | Totodile | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-19 | Mudkip | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-20 | Piplup | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-21 | Oshawott | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-22 | Froakie | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-23 | Popplio | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-24 | Sobble | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| 2021swsh | 2021swsh-25 | Pikachu | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal | holo, normal |  |
| bw11 | bw11-2 | Tangrowth | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| bw11 | bw11-8 | Serperior | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, reverse | normal |
| bw11 | bw11-11 | Swadloon | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| bw11 | bw11-17 | Charmander | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| bw11 | bw11-25 | Tepig | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| bw11 | bw11-RC1 | Snivy | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC3 | Serperior | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC4 | Growlithe | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC5 | Torchic | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC6 | Piplup | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC7 | Pikachu | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC9 | Kirlia | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC10 | Gardevoir | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC12 | Stunfisk | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC13 | Purrloin | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC14 | Eevee | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC15 | Teddiursa | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC16 | Ursaring | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC18 | Minccino | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC19 | Cinccino | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC20 | Elesa | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC21 | Shaymin-EX | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC22 | Reshiram | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC23 | Emolga | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw11 | bw11-RC24 | Mew-EX | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo | normal, reverse |
| bw9 | bw9-40 | Nidoran♀ | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| bw9 | bw9-43 | Nidoran♂ | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | normal, reverse | holo |
| cel25 | cel25-15A1 | Venusaur | number_missing_from_index | blocked_until_card_identity_match | holo |  | holo |
| cel25 | cel25-15A2 | Here Comes Team Rocket! | number_missing_from_index | blocked_until_card_identity_match | holo |  | holo |
| cel25 | cel25-15A3 | Rocket's Zapdos | number_missing_from_index | blocked_until_card_identity_match | holo |  | holo |
| cel25 | cel25-15A4 | Claydol | number_missing_from_index | blocked_until_card_identity_match | holo |  | holo |
| col1 | col1-1 | Clefable | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, reverse | normal |
| col1 | col1-5 | Forretress | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, reverse | normal |
| col1 | col1-6 | Groudon | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal\|reverse | holo, normal, reverse |  |
| col1 | col1-8 | Hitmontop | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|normal\|reverse | holo, normal, reverse |  |
| col1 | col1-10 | Houndoom | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, reverse | normal |
| col1 | col1-SL2 | Dialga | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| col1 | col1-SL3 | Entei | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| col1 | col1-SL4 | Groudon | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| col1 | col1-SL7 | Lugia | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| col1 | col1-SL9 | Raikou | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| col1 | col1-SL11 | Suicune | exact_card_identity_match | partial_finishes_supported_by_index | holo\|normal\|reverse | holo, normal | reverse |
| dp7 | dp7-2 | Empoleon | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|reverse | holo, reverse |  |
| dp7 | dp7-3 | Infernape | exact_card_identity_match | all_finishes_master_verified_by_index | holo\|reverse | holo, reverse |  |
| dp7 | dp7-96 | Dusknoir | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| dp7 | dp7-97 | Heatran | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| dp7 | dp7-98 | Machamp | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| dp7 | dp7-99 | Raichu | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| dp7 | dp7-100 | Regigigas | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| dp7 | dp7-SH1 | Drifloon | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard2 | ecard2-11 | Espeon | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-12 | Exeggutor | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-13 | Exeggutor | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-15 | Houndoom | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-16 | Hypno | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |

## Guardrails

- exact card identity match is not DB recovery authority
- API-supported finish is not master truth without human-readable/checklist evidence
- unsupported finish rows must not be recovered
- no DB writes, migrations, cleanup, quarantine, or apply paths are allowed
