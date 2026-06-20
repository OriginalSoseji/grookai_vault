# TCGMAP-08B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS

Guarded rollback-only dry-run for fresh TCGCSV-derived TCGplayer external mappings.

## Result

- pass: true
- readiness_fingerprint: `36880bc60c2a7c07dc6928ca6275554c4c08c1b4b073c84b66def28a67d737bb`
- target_fingerprint: `7faae7a3102682c3ca22ac7bcda5a8297eace7dce2198d92080c3edbf88de8c0`
- dry_run_proof: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` == `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- target rows: 71
- inserted inside transaction: 71

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- pricing_writes_performed: false
- image_writes_performed: false
- rollback_only: true
- blocked readiness rows excluded: true

## Blocked Rows Excluded

| classification | rows | parents | sets |
| --- | --- | --- | --- |
| blocked_existing_tcgplayer_external_id_collision | 1252 | 1252 | 87 |
| blocked_multi_products_for_parent | 925 | 415 | 15 |
| blocked_batch_duplicate_tcgplayer_id | 198 | 198 | 2 |

## Scope Sample

| set | number | name | card_print_id | tcgplayer |
| --- | --- | --- | --- | --- |
| bw10 | 11 | Genesect-EX | `b1f06e7e-92fe-4c4e-bf83-6e5c0156c456` | `85665` |
| bw10 | 65 | Dialga-EX | `4c49ad35-c8cd-45b1-b62d-528552a43c1b` | `84808` |
| bw10 | 66 | Palkia-EX | `4c5d95e5-8283-40cc-a5cc-2d1c0bf7e178` | `87915` |
| bw10 | 96 | Virizion-EX | `5fbb6250-59a9-4b16-b562-5f30583a78d8` | `90394` |
| bw10 | 97 | Genesect-EX | `7279e676-367e-404d-b2fe-a439da968dd1` | `85666` |
| bw10 | 98 | Jirachi-EX | `ab147151-2e37-45f8-b4b2-e8bac96e10b6` | `86334` |
| bw10 | 99 | Dialga-EX | `bc029e15-32f3-4372-b463-e7981d8ca619` | `84809` |
| bw10 | 100 | Palkia-EX | `75d15537-f15e-41a0-a2f3-34ce31df611d` | `87916` |
| bw4 | 94 | Shaymin-EX | `6e6b045f-96c9-4be4-b483-70c94a1ec1a2` | `89112` |
| bw4 | 95 | Reshiram-EX | `27b796c6-68ca-49df-9e0a-48ccf37aa532` | `88716` |
| bw4 | 96 | Kyurem-EX | `2535521d-7064-4fa2-a210-d42852d2d96b` | `86570` |
| bw4 | 97 | Zekrom-EX | `fdd6085d-61ff-4fb9-adb2-2f5093b6bf27` | `90743` |
| bw4 | 98 | Mewtwo-EX | `215fcb26-dee4-49ac-a07b-d9bb37d57100` | `87432` |
| bw4 | 99 | Regigigas-EX | `a402b34f-2ad3-41d4-83d2-f94283241932` | `88667` |
| bw7 | 141 | Celebi-EX | `eb963ca2-1c2e-4937-b736-bd5846711cf7` | `84153` |
| bw7 | 142 | Keldeo-EX | `0f8c13a9-e5c8-448f-8b73-0f7ceeb85379` | `86439` |
| bw7 | 143 | Cresselia-EX | `67d283be-0f93-4227-93e9-000b341824e4` | `84471` |
| bw7 | 144 | Landorus-EX | `f5acbdf7-1d62-47cd-84ad-48932d8d277c` | `86596` |
| bw7 | 145 | Black Kyurem-EX | `823c7066-a38f-4c13-816f-144f32ba98e0` | `83857` |
| bw7 | 146 | White Kyurem-EX | `a99d6813-ea66-4a40-88a7-9aab998e299f` | `90592` |
| bw8 | 14 | Moltres-EX | `92679c0c-6597-4dd8-b406-8c2d3fc16d29` | `87568` |
| bw8 | 25 | Articuno-EX | `f3d5c187-f6e2-46be-89e6-34d5ce55f915` | `83656` |
| bw8 | 48 | Zapdos-EX | `6a6a5a79-5727-4f3b-a9c8-fbde752e9cb6` | `90725` |
| bw8 | 108 | Lugia-EX | `31b7a41e-31ce-4fca-bbae-18969e9bf94e` | `86913` |
| bw8 | 131 | Victini-EX | `061725ed-7d0d-4d10-9a78-53ffd8623636` | `90352` |

