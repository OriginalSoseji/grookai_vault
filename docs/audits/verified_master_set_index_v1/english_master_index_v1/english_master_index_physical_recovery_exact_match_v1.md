# English Master Index Physical Recovery Exact Match V1

This is an audit-only feasibility check for physical TCG `missing_set_code` recovery candidates. It does not assign set identity and does not authorize mutation.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- candidate_card_prints: 807
- candidate_printing_rows: 1685

## Card Match Status

| status | card prints |
| --- | --- |
| number_missing_from_index | 488 |
| exact_card_identity_match | 319 |

## Finish Match Status

| status | card prints |
| --- | --- |
| blocked_until_card_identity_match | 488 |
| partial_finishes_supported_by_index | 210 |
| all_finishes_master_verified_by_index | 106 |
| no_finishes_supported_by_index | 3 |

## Top Sets

| set_key | card prints |
| --- | --- |
| sv8pt5 | 180 |
| sv4pt5 | 108 |
| me1 | 83 |
| svp | 73 |
| xyp | 61 |
| sv6pt5 | 52 |
| pl2 | 37 |
| pgo | 34 |
| bw11 | 25 |
| mcd21 | 25 |
| pl4 | 20 |
| xy4 | 16 |
| ecard3 | 15 |
| ecard2 | 13 |
| col1 | 11 |
| mep | 10 |
| pl1 | 9 |
| pl3 | 9 |
| dp7 | 8 |
| fut2020 | 5 |
| cel25 | 4 |
| ex10 | 3 |
| bw9 | 2 |
| swsh45 | 2 |
| swsh2 | 1 |
| xy9 | 1 |

## Sample Rows

| set | external_id | card | card_status | finish_status | candidate_finishes | supported | unsupported |
| --- | --- | --- | --- | --- | --- | --- | --- |
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
| ecard2 | ecard2-17 | Jumpluff | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-18 | Jynx | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-19 | Kingdra | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-20 | Lanturn | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-25 | Ninetales | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-28 | Porygon2 | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-30 | Quagsire | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard2 | ecard2-32 | Scizor | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard3 | ecard3-4 | Articuno | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard3 | ecard3-6 | Crobat | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard3 | ecard3-8 | Flareon | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard3 | ecard3-9 | Forretress | exact_card_identity_match | all_finishes_master_verified_by_index | normal\|reverse | normal, reverse |  |
| ecard3 | ecard3-H13 | Kabutops | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H14 | Ledian | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H16 | Magcargo | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H17 | Magcargo | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H18 | Magneton | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H22 | Piloswine | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H23 | Politoed | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H24 | Poliwrath | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H27 | Rhydon | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H30 | Umbreon | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ecard3 | ecard3-H31 | Vaporeon | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ex10 | ex10-113 | Entei Star | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |
| ex10 | ex10-114 | Raikou Star | exact_card_identity_match | all_finishes_master_verified_by_index | holo | holo |  |

## Guardrails

- exact card identity match is not DB recovery authority
- API-supported finish is not master truth without human-readable/checklist evidence
- unsupported finish rows must not be recovered
- no DB writes, migrations, cleanup, quarantine, or apply paths are allowed
