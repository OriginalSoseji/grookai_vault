# TCGMAP-04A-STAGING-TCGPLAYER-MAPPING-INSERTS

Guarded rollback-only dry-run for staging-resolved TCGplayer external mappings.

## Result

- pass: true
- readiness_fingerprint: `3013734055a13e51c4c3f1f517caa2c6d713becb126f0d8b30c339641aba4001`
- target_fingerprint: `cad93b765851870f1eaedb2f75c1c55a12ab7c5a0be8ff4a84d72e24520d7119`
- dry_run_proof: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` == `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- target rows: 728
- inserted inside transaction: 728

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
| blocked_multi_staging_rows_for_parent | 23 | 5 | 2 |
| blocked_existing_tcgplayer_external_id_collision | 1 | 1 | 1 |

## Scope Sample

| set | number | name | card_print_id | tcgplayer | staging |
| --- | --- | --- | --- | --- | --- |
| base1 | 76 | Pokémon Breeder | `f98caa3b-27ea-44a0-93ed-f4ad3f0a83cf` | `42422` | justtcg |
| base1 | 77 | Pokémon Trader | `14461f2b-6d79-4dda-b89b-ad0407c47f9d` | `108648` | justtcg |
| base1 | 85 | Pokémon Center | `52fcff43-7ce6-48f5-a6a1-8be27285b7a8` | `108646` | justtcg |
| base1 | 86 | Pokémon Flute | `86021d6c-d977-419b-90f1-5940931d541c` | `108647` | justtcg |
| base1 | 87 | Pokédex | `a142d45d-9269-4507-9564-8ecaf5cd14e6` | `108645` | justtcg |
| base6 | 102 | Pokémon Breeder | `edf32d07-d0fe-4bad-b703-808d3d1dea26` | `88207` | justtcg |
| base6 | 103 | Pokémon Trader | `f40cdad0-2bfc-432a-9a95-f7a5262a9ccf` | `88242` | justtcg |
| bw1 | 97 | Poké Ball | `980ae554-7986-4605-a6d1-7ca7aacbd1ce` | `88192` | justtcg |
| bw1 | 98 | Pokédex | `5b795eed-84fd-409c-b573-958f6055823c` | `88200` | justtcg |
| bw1 | 99 | Pokémon Communication | `369edd87-8c42-47e5-a0a3-d87d1611fa3e` | `88223` | justtcg |
| bw10 | 30 | Kyurem-EX | `171389e7-dc32-4a58-b9d5-4105ba1dfb45` | `86568` | justtcg |
| bw10 | 60 | Jirachi-EX | `e39e3687-1de8-467d-acc3-b3c8d394cb87` | `86333` | justtcg |
| bw10 | 83 | Pokémon Catcher | `d4caa467-1580-4339-83f7-c4cfa3196313` | `88210` | justtcg |
| bw10 | 9 | Virizion-EX | `6d443d20-dce5-4bf0-8c05-632331723d42` | `90393` | justtcg |
| bw11 | 100 | Black Kyurem-EX | `1c215b16-1c8b-4fbe-a175-78bd81c5b451` | `83856` | justtcg |
| bw11 | 101 | White Kyurem-EX | `601f0767-738d-4583-aca0-6f042d667043` | `90591` | justtcg |
| bw11 | 24 | Victini-EX | `3ab9ecf5-ecc3-4905-91de-fac0dbe034d2` | `90351` | justtcg |
| bw11 | 29 | Reshiram-EX | `00d095b4-d0d1-40cb-abfe-1a49f473cbe6` | `88715` | justtcg |
| bw11 | 44 | Kyurem-EX | `cde0e0d4-4526-4e41-8cd9-8fb528760a00` | `86569` | justtcg |
| bw11 | 45 | Keldeo-EX | `bd874f98-086b-4333-a664-8ba643bfb82c` | `86438` | justtcg |
| bw11 | 52 | Zekrom-EX | `2a1fdb37-89d7-4fa0-b866-c377bb9ad4fb` | `90742` | justtcg |
| bw11 | 54 | Mewtwo-EX | `7b0ca972-0496-481e-a66d-a5f1771c26da` | `87431` | justtcg |
| bw11 | 77 | Chandelure-EX | `3b6ba2ea-e17f-4b7c-96c8-8fcd9350f718` | `84168` | justtcg |
| bw11 | 82 | Excadrill-EX | `3e39af23-b1d8-4103-9bb4-a6d8b53cd97e` | `85340` | justtcg |
| bw11 | 88 | Darkrai-EX | `86eb5ffa-aae3-4a6c-8370-fd3e14df3331` | `84708` | justtcg |

