# ME01 Duplicate Ownership Pack - 2026-05-17

Status: no-write ownership evidence. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Investigate the `me01` Mega Evolution duplicate ownership lane from the number-normalization collision pack. All 83 `me01` collision rows looked like likely duplicate import rows; this pack proves the candidate side, incumbent side, source ownership, and user/market-reference blast radius before any future cleanup design.

## Source Inputs

- `docs/plans/pokemon_db_remediation_v1/number_normalization_collision_investigation_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_collision_investigation_matrix_20260517.json`
- `live_read_only_supabase_evidence_2026-05-17`
- live read-only Supabase queries inside `begin transaction read only`

## Set Summary

| Metric | Value |
| --- | --- |
| Set code | `me01` |
| Set name | Mega Evolution |
| Printed total | 132 |
| Total DB card_prints | 300 |
| Missing direct-number rows | 83 |
| Distinct direct numbers | 199 |

Active mapping sources in the full `me01` set:

| Source | Mapping rows | Mapped card_prints |
| --- | --- | --- |
| justtcg | 217 | 217 |
| tcgdex | 188 | 188 |
| tcgplayer | 187 | 187 |

## Ownership Summary

| Metric | Count |
| --- | --- |
| Duplicate pairs audited | 83 |
| Candidate rows missing number | 83 |
| Incumbent rows with direct number | 83 |
| Candidate rows with active TCGdex mapping only | 83 |
| Incumbent rows with JustTCG and TCGPlayer mappings | 83 |
| Pairs with same normalized name and number | 83 |
| Candidate rows with user/market refs | 2 |
| Candidate user/market reference rows | 6 |
| Recommended immediate writes | 0 |

## Ownership Classes

| Class | Count | Meaning |
| --- | --- | --- |
| DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | 81 | Duplicate-looking candidate row has no user/market refs; still no cleanup without a future ownership plan. |
| DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES | 2 | Duplicate-looking candidate row has user/market references and must become a hard-stop subcase. |

## User/Market Reference Hard Stops

| Candidate | Number | Candidate refs | Ref tables | Incumbent refs |
| --- | --- | --- | --- | --- |
| Mega Camerupt ex | 22 | 3 | pricing_watch.card_print_id, vault_item_instances.card_print_id, vault_items.card_id | 20 |
| Mega Lucario ex | 77 | 3 | pricing_watch.card_print_id, vault_item_instances.card_print_id, vault_items.card_id | 28 |

## Pair Matrix

| Number | Card | Class | Candidate sources | Incumbent sources | Candidate refs | Incumbent refs |
| --- | --- | --- | --- | --- | --- | --- |
| 56 | Alakazam | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 30 |
| 9 | Bayleef | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 1 | Bulbasaur | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 24 |
| 12 | Celebi | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 30 | Centiskorch | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 31 | Chi-Yu | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 8 | Chikorita | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 36 |
| 28 | Cinderace | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 37 | Clauncher | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 38 | Clawitzer | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 33 | Corphish | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 85 | Crawdaunt | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 18 | Dhelmise | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 40 | Drizzile | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 44 | Eiscue | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 49 | Electrike | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 4 | Exeggcute | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 43 | Frosmoth | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 99 | Gholdengo | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 67 | Gimmighoul | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 92 | Grafaiai | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 65 | Greavard | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 63 | Grumpig | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 73 | Hariyama | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 52 | Helioptile | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 66 | Houndstone | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 41 | Inteleon | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 57 | Jynx | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 59 | Kirlia | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 24 |
| 34 | Kyogre | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 23 | Litleo | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 45 | Magnemite | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 46 | Magneton | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 47 | Magnezone | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 72 | Makuhita | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 32 | Mantine | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 36 | Mega Abomasnow ex | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 22 | Mega Camerupt ex | DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES | tcgdex | justtcg, tcgplayer | 3 | 20 |
| 60 | Mega Gardevoir ex | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 77 | Mega Lucario ex | DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES | tcgdex | justtcg, tcgplayer | 3 | 28 |
| 50 | Mega Manectric ex | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 94 | Mega Mawile ex | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 10 | Meganium | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 28 |
| 82 | Nacli | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 83 | Naclstack | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 89 | Nickit | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 28 |
| 16 | Nincada | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 30 |
| 20 | Ninetales | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 17 | Ninjask | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 21 | Numel | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 14 | Nuzleaf | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 70 | Onix | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 51 | Pachirisu | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 27 | Raboot | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 58 | Ralts | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 35 |
| 76 | Riolu | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 69 | Sandslash | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 26 | Scorbunny | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 13 | Seedot | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 61 | Shedinja | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 15 | Shiftry | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 91 | Shroodle | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 11 | Shuckle | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 29 | Sizzlipede | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 42 | Snom | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 23 |
| 35 | Snover | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 39 | Sobble | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 75 | Solrock | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 24 |
| 87 | Spiritomb | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 93 | Steelix | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 81 | Stonjourner | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 23 |
| 6 | Tangela | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 24 |
| 7 | Tangrowth | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 90 | Thievul | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 96 | Tinkatink | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 98 | Tinkaton | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 97 | Tinkatuff | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 79 | Toxicroak | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 71 | Tyrogue | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 16 |
| 25 | Volcanion | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 19 | Vulpix | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 25 |
| 64 | Xerneas | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |
| 88 | Yveltal | DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS | tcgdex | justtcg, tcgplayer | 0 | 20 |

## Conclusions

- Do not number-normalize the 83 `me01` candidate rows. They collide one-for-one with incumbent numbered rows.
- The candidate side is the TCGdex-only side; the incumbent side is the numbered JustTCG/TCGPlayer side.
- The evidence supports treating most `me01` rows as duplicate import candidates, not missing-number rows.
- Mega Camerupt ex and Mega Lucario ex are hard-stop subcases because the TCGdex candidate rows already have vault/pricing references.
- Any future cleanup must be a separate duplicate-ownership plan with explicit preservation of user references, identities, traits, printings, mappings, and rollback checks. It must not be bundled into number normalization.

## Next No-Write Step

Draft a future duplicate-ownership write-plan shape only after deciding whether TCGdex mappings should be transferred to incumbent rows, whether candidate rows should remain as aliases/quarantine, and how user/market references on the two hard-stop rows would be preserved. No execution is authorized.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No card movement.
- No set changes.
- No identity rewrites.
- No mapping movement.
- No missing-card backfill.
- No variant changes.
