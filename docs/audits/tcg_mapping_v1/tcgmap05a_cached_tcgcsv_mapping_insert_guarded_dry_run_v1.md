# TCGMAP-05A-CACHED-TCGCSV-TCGPLAYER-MAPPING-INSERTS

Guarded rollback-only dry-run for cached TCGCSV-derived TCGplayer external mappings.

## Result

- pass: true
- readiness_fingerprint: `bee892d14f83b1a9ace7d35c4599b68f2ceb24d43ea010b7a4a19f104b98cbb7`
- target_fingerprint: `88874689034c1e4807322b6d5d64347a01964a80b89a22f40894f566bcb6e0b5`
- dry_run_proof: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` == `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- target rows: 153
- inserted inside transaction: 153

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
| blocked_existing_tcgplayer_external_id_collision | 244 | 244 | 42 |
| blocked_batch_duplicate_tcgplayer_id | 22 | 22 | 1 |

## Scope Sample

| set | number | name | card_print_id | tcgplayer |
| --- | --- | --- | --- | --- |
| base2 | 64 | Poké Ball | `89132b0b-a65f-41db-a6f7-de8d23661958` | `45167` |
| base4 | 102 | Imposter Professor Oak | `0da2772e-4ddd-421b-a5b4-96ab56363dbc` | `42552` |
| base4 | 105 | Pokémon Breeder | `940d75e0-2718-4ddd-b6b4-ffbd8617730a` | `42555` |
| base4 | 106 | Pokémon Trader | `8ef99ab6-dc33-4cd2-8fd5-2b670ef4e4c6` | `106358` |
| base4 | 114 | Pokémon Center | `1025562c-fc2e-447c-9cc5-feb58d205ace` | `106359` |
| base4 | 115 | Pokédex | `d627fea9-45ac-4cac-8195-0ade9f427cb8` | `106360` |
| base4 | 121 | Poké Ball | `15c7182b-18e4-4352-be8b-8b76b43f93d9` | `106361` |
| ex10 | 87 | Poké Ball | `c2ea72e9-452d-4672-81a1-9fc80abe61a5` | `88184` |
| ex10 | 88 | Pokémon Reversal | `093401fb-a48c-4d6e-8489-8616aa6a778f` | `88235` |
| ex4 | 79 | Team Aqua Technical Machine 01 | `95465425-e352-4b28-b0a1-13cfc30c06a7` | `89773` |
| ex4 | 84 | Team Magma Technical Machine 01 | `4d4e26bf-1914-45c1-98a0-04cf6120ac74` | `89817` |
| ex7 | 84 | Pokémon Retriever | `f90203f5-f02f-4818-9d34-2506b38e77d8` | `88234` |
| ex7 | 89 | Rocket's Poké Ball | `a9a37e78-6136-4fe7-b03a-74216741f13d` | `88784` |
| pl2 | RT2 | Frost Rotom | `f5ada689-45c1-4b23-ac62-6a9f0bc11c97` | `85576` |
| pl2 | RT4 | Mow Rotom | `949f5c1d-6d29-41cd-91c9-0be81e5360c5` | `87584` |
| pl2 | RT6 | Charon's Choice | `0a14f347-5dd0-425a-9c9c-ffd134a9de4f` | `84238` |
| pl3 | 1 | Absol G | `a5798f48-bf29-4650-93a3-75558a817afc` | `83457` |
| pl3 | 2 | Blaziken FB | `8d2ca1ec-3b80-4d17-87ad-bc4ed1b35024` | `83914` |
| pl3 | 3 | Drifblim FB | `bc5bd4b4-e4d5-49ae-ae15-59ac3fac28d4` | `84952` |
| pl3 | 4 | Electivire FB | `6675e9ee-5c7a-4327-858d-d50c36b5b28f` | `85125` |
| pl3 | 5 | Garchomp | `2b1d020a-02f8-4438-8163-10db7bfb1774` | `85623` |
| pl3 | 6 | Magmortar | `83fa0d94-4ce6-4d56-b766-21e9d923cbd5` | `87058` |
| pl3 | 7 | Metagross | `a8ea67dd-9667-4755-a523-d88dc44fb959` | `87339` |
| pl3 | 8 | Rayquaza C | `90740ca1-cb80-4c1a-acf8-80364a299cb5` | `88639` |
| pl3 | 9 | Regigigas FB | `940012d3-e7be-41e7-84f3-9e778341b750` | `88668` |

