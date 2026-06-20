# TCGMAP-07B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS

Guarded rollback-only dry-run for fresh TCGCSV-derived TCGplayer external mappings.

## Result

- pass: true
- readiness_fingerprint: `ad94f08cbd4de9332f3597e658e3c7b83f57b41f44b88d7ae9a0cd16ceeb6ec3`
- target_fingerprint: `9b02b163ed7883a2856b0efd9d46be9a3a2827d88fe4e79754108ba90e3a30ad`
- dry_run_proof: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` == `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- target rows: 371
- inserted inside transaction: 371

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
| blocked_existing_tcgplayer_external_id_collision | 1120 | 1120 | 55 |
| blocked_multi_products_for_parent | 928 | 414 | 14 |
| blocked_batch_duplicate_tcgplayer_id | 198 | 198 | 2 |

## Scope Sample

| set | number | name | card_print_id | tcgplayer |
| --- | --- | --- | --- | --- |
| 2023sv | 1 | Sprigatito | `4091ae25-3624-4f56-a455-7bd3d4beb154` | `516512` |
| 2023sv | 2 | Fuecoco | `451748ac-012e-4d67-9912-d04534a05817` | `516513` |
| 2023sv | 3 | Quaxly | `3a769557-0102-4fd2-b79e-8eef05b52e60` | `516514` |
| 2023sv | 4 | Cetoddle | `98500b36-36d3-470f-9d15-099865980b07` | `516515` |
| 2023sv | 5 | Cetitan | `e22e07fa-71e2-46aa-9951-829e339f8763` | `516516` |
| 2023sv | 6 | Pikachu | `ee8c68fc-626c-42db-b7ef-fc869fe07ae8` | `516517` |
| 2023sv | 7 | Pawmi | `1dc8d631-789a-4857-a1fd-d72efea4d614` | `516518` |
| 2023sv | 8 | Kilowattrel | `31b28128-2bba-420a-acee-4962caf0514c` | `516519` |
| 2023sv | 9 | Flittle | `c9372355-e4ff-46a7-8172-94fe7d8a28be` | `516520` |
| 2023sv | 10 | Sandaconda | `6e7a29e1-3b5b-4c27-86b3-1e63c99f576a` | `516521` |
| 2023sv | 11 | Klawf | `fae05233-f9c5-4860-aa86-49a942613ff5` | `516522` |
| 2023sv | 12 | Blissey | `3ed79a65-c672-451a-afd7-e47a68ae2c53` | `516523` |
| 2023sv | 13 | Tandemaus | `2dd83d5b-2476-4b63-9fbe-c849c2d56aa7` | `516524` |
| 2023sv | 14 | Cyclizar | `1df85310-35da-4070-a3bd-a01a96d39e1c` | `516525` |
| 2023sv | 15 | Kirlia | `fb3bc199-9149-402e-8342-265eceecf120` | `516526` |
| 2024sv | 1 | Charizard | `43e51937-5821-449d-adf5-7cfc30d135b9` | `614370` |
| 2024sv | 2 | Pikachu | `2ff72f10-b4cd-4e26-998c-87b1ca181028` | `614371` |
| 2024sv | 3 | Miraidon | `afa60d30-57c3-44ec-9964-fdf2a2bd7690` | `614372` |
| 2024sv | 4 | Jigglypuff | `7fe87152-ff37-4a8b-8b56-1338ca39751b` | `614373` |
| 2024sv | 5 | Hatenna | `9218afd1-f370-4698-902d-2e60140f127c` | `614374` |
| 2024sv | 6 | Dragapult | `0a81032c-548d-438c-a091-5b2924557771` | `614375` |
| 2024sv | 7 | Quagsire | `24b6d461-b043-4768-ae3a-1cf43442c7d6` | `614376` |
| 2024sv | 8 | Koraidon | `2d9108f8-f23d-49f6-8557-19553332e9eb` | `614377` |
| 2024sv | 9 | Umbreon | `5d51ef4f-5f17-4b8e-b9fc-2ae31f955022` | `614378` |
| 2024sv | 10 | Hydreigon | `d3e549c3-b31d-4368-b7b4-e34b28b41c1d` | `614379` |

