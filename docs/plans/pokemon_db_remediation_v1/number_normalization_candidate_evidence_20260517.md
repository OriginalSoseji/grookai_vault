# Number Normalization Candidate Evidence - 2026-05-17

Status: no-write candidate evidence. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Convert the earlier broad number-normalization evidence into a row-level Lane A safety matrix for numeric, non-hard-stop, missing-number rows. This is the last proof step before any future write-plan draft can be considered.

## Source Inputs

- `docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_dry_run_implementation_plan_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/pokemon_db_remediation_v1_checkpoint_20260517.md`
- live read-only Supabase queries inside `begin transaction read only`

## Summary

| Metric | Count |
| --- | --- |
| Missing-number rows audited | 997 |
| Hard-stop blocked rows | 374 |
| Review-stop blocked rows | 0 |
| Lane A numeric non-hard-stop candidates | 504 |
| Clean future write-plan candidates | 248 |
| Blocked Lane A candidates | 256 |
| Existing number collision rows | 263 |
| Duplicate candidate groups | 0 |
| Active identity conflict rows | 0 |
| Missing required TCGdex carrier pair rows | 0 |
| Recommended immediate writes | 0 |

Result: 248 Lane A rows are clean enough to become a future write-plan candidate set, but this artifact still approves zero writes. 256 Lane A rows remain blocked from any future bulk write plan.

## Lane Counts

| Lane | Rows |
| --- | --- |
| complex_source_candidate_non_hard_stop | 5 |
| hard_stop_set_blocked | 374 |
| lane_a_numeric_non_hard_stop | 504 |
| prefixed_source_candidate_non_hard_stop | 114 |

## Set Breakdown

| Set | Name | Candidates | Clean | Blocked | Candidate range |
| --- | --- | --- | --- | --- | --- |
| `A3a` | Extradimensional Crisis | 103 | 103 | 0 | 1-103 |
| `P-A` | Promos-A | 100 | 100 | 0 | 1-100 |
| `me01` | Mega Evolution | 83 | 0 | 83 | 1-99 |
| `svp` | Scarlet & Violet Black Star Promos | 73 | 1 | 72 | 1-99 |
| `pl2` | Rising Rivals | 34 | 0 | 34 | 1-111 |
| `2021swsh` | Macdonald's Collection 2021 | 25 | 25 | 0 | 1-25 |
| `xy4` | Phantom Forces | 15 | 0 | 15 | 23-122 |
| `pl4` | Arceus | 12 | 0 | 12 | 1-99 |
| `mep` | MEP Black Star Promos | 10 | 10 | 0 | 1-10 |
| `dp7` | Stormfront | 7 | 0 | 7 | 2-100 |
| `pl1` | Platinum | 7 | 0 | 7 | 6-127 |
| `pl3` | Supreme Victors | 7 | 0 | 7 | 141-147 |
| `bw11` | Legendary Treasures | 5 | 0 | 5 | 2-25 |
| `col1` | Call of Legends | 5 | 0 | 5 | 1-10 |
| `fut2020` | Pokémon Futsal 2020 | 5 | 5 | 0 | 1-5 |
| `ecard3` | Skyridge | 4 | 4 | 0 | 4-9 |
| `ex10` | Unseen Forces | 3 | 0 | 3 | 113-115 |
| `bw9` | Plasma Freeze | 2 | 0 | 2 | 40-43 |
| `swsh4.5` | Shining Fates | 2 | 0 | 2 | 58-60 |
| `swsh2` | Rebel Clash | 1 | 0 | 1 | 154-154 |
| `xy9` | BREAKpoint | 1 | 0 | 1 | 98-98 |

## Safety Gates

- Hard-stop and review-stop codes are excluded from Lane A.
- Candidate rows must still have both `card_prints.number` and `card_prints.number_plain` null or blank.
- Candidate rows must have exactly one source-derived TCGdex local number.
- Candidate rows must be numeric only; prefixed and complex suffix rows remain policy/manual review.
- Candidate rows must have both `external_ids.tcgdex` and an active `external_mappings` TCGdex carrier.
- Candidate rows must not collide with an existing same-set `number` or `number_plain`.
- Candidate rows must not duplicate another Lane A candidate in the same set.
- Candidate rows must not conflict with an active `card_print_identity.printed_number`.
- FK references are inventoried only; a future number update must remain ID-stable.

## Blocker Queues

| Card print | Set | Card | Proposed number | Blockers |
| --- | --- | --- | --- | --- |
| `bef9f1a1-27d7-4e71-ab9e-64aab82e30bf` | `bw11` | Charmander | 17 | existing number collision in same set |
| `b958ef86-132a-4849-9db7-a69ed8fcbb1c` | `bw11` | Serperior | 8 | existing number collision in same set |
| `875181b8-83c3-45b2-b15d-31aa05e0c615` | `bw11` | Swadloon | 11 | existing number collision in same set |
| `16dfca86-c445-4969-9552-15e2185096fc` | `bw11` | Tangrowth | 2 | existing number collision in same set |
| `e0d286dc-607f-4abd-9b3e-d4a0c386c9d5` | `bw11` | Tepig | 25 | existing number collision in same set |
| `7df8528c-c8f8-4110-890d-0fb32bc0fbf3` | `bw9` | Nidoran♀ | 40 | existing number collision in same set |
| `c0b41c1b-2d6f-4c5f-bf85-ccae2c731d46` | `bw9` | Nidoran♂ | 43 | existing number collision in same set |
| `57560dcd-655d-4dc8-bef2-d5e453b97029` | `col1` | Clefable | 1 | existing number collision in same set |
| `d74643a3-162e-47e2-9c82-79f9a297156f` | `col1` | Forretress | 5 | existing number collision in same set |
| `2180d1db-0948-4cfc-9a98-da7629c2811a` | `col1` | Groudon | 6 | existing number collision in same set |
| `922f2b4f-eb6f-492c-89a7-8b4f313509e2` | `col1` | Hitmontop | 8 | existing number collision in same set |
| `a9203bf3-0a2f-4ef5-af3f-3dbdc6bf8bce` | `col1` | Houndoom | 10 | existing number collision in same set |
| `d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff` | `dp7` | Dusknoir | 96 | existing number collision in same set |
| `62f77935-5749-4d26-87e6-06bbca565b22` | `dp7` | Empoleon | 2 | existing number collision in same set |
| `7c211bf2-ab9e-489d-842f-65c896270783` | `dp7` | Heatran | 97 | existing number collision in same set |
| `665ee2b0-4a22-43d5-bf8e-8ff22a990384` | `dp7` | Infernape | 3 | existing number collision in same set |
| `6f49c231-0a53-4c0c-9db1-6d4c36aa460e` | `dp7` | Machamp | 98 | existing number collision in same set |
| `7a0dbe87-8ffb-4939-a5c0-371a0a21b302` | `dp7` | Raichu | 99 | existing number collision in same set |
| `687811f7-e3d2-41bb-b37d-1e73882551d2` | `dp7` | Regigigas | 100 | existing number collision in same set |
| `2fdd39c8-7afa-4031-be84-649ac28a7b72` | `ex10` | Entei Star | 113 | existing number collision in same set |
| `043dbc47-0815-4ef4-b31d-2027f70f2338` | `ex10` | Raikou Star | 114 | existing number collision in same set |
| `584c31ad-d7ac-4356-b9cc-4de3152511b2` | `ex10` | Suicune Star | 115 | existing number collision in same set |
| `9b837cfd-0f7f-4bd1-ab75-c9b8c14ba027` | `me01` | Alakazam | 56 | existing number collision in same set |
| `493cbe02-e42b-4ca0-97cb-f9b75584c66f` | `me01` | Bayleef | 9 | existing number collision in same set |
| `35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb` | `me01` | Bulbasaur | 1 | existing number collision in same set |
| `a2aae959-98c0-453d-a3e5-196b774acf77` | `me01` | Celebi | 12 | existing number collision in same set |
| `3bdab7d9-494e-429a-85c4-5bc4f60b56a5` | `me01` | Centiskorch | 30 | existing number collision in same set |
| `9458269b-b01d-48a1-a299-ee775da3f6b8` | `me01` | Chi-Yu | 31 | existing number collision in same set |
| `7d4af188-1b3c-4c6b-8a9b-cb426f11d87b` | `me01` | Chikorita | 8 | existing number collision in same set |
| `f7c0bdb9-b762-4c56-b698-4907376db02d` | `me01` | Cinderace | 28 | existing number collision in same set |
| `03253b6e-c0ca-420e-9b5c-548142b39f81` | `me01` | Clauncher | 37 | existing number collision in same set |
| `994a32c6-4774-400e-ad94-ef39aaba0836` | `me01` | Clawitzer | 38 | existing number collision in same set |
| `d6783e4a-9296-4fec-a85a-98f170b8ecdb` | `me01` | Corphish | 33 | existing number collision in same set |
| `cea4de22-3921-46bf-a88a-41a60978a936` | `me01` | Crawdaunt | 85 | existing number collision in same set |
| `b01f0f86-df22-4b41-b8ad-e4d1053d6812` | `me01` | Dhelmise | 18 | existing number collision in same set |
| `cc6e8e9a-0505-49f6-917f-782f106de7f4` | `me01` | Drizzile | 40 | existing number collision in same set |
| `079a15ab-610e-4d7e-b8ba-f4dff5ac97c9` | `me01` | Eiscue | 44 | existing number collision in same set |
| `4b121129-bf0a-4835-8af6-dbed0c23b962` | `me01` | Electrike | 49 | existing number collision in same set |
| `9de52da6-5c3c-4621-8cec-b01a9db1e4d7` | `me01` | Exeggcute | 4 | existing number collision in same set |
| `4b1ec036-6918-451c-b8d8-504347b96fa1` | `me01` | Frosmoth | 43 | existing number collision in same set |
| `20f18283-9337-47d2-a807-37f019221717` | `me01` | Gholdengo | 99 | existing number collision in same set |
| `952acdf6-f707-4bac-a111-133a2d456207` | `me01` | Gimmighoul | 67 | existing number collision in same set |
| `2fbd7a5a-fb64-4dda-889d-ff2ba59aac7e` | `me01` | Grafaiai | 92 | existing number collision in same set |
| `33096065-fff0-42f9-9df2-52516e55cd04` | `me01` | Greavard | 65 | existing number collision in same set |
| `99d7e313-27de-4da7-a10e-3d2bb898ebcd` | `me01` | Grumpig | 63 | existing number collision in same set |
| `4faab1bd-e8ce-4fe8-8fda-cd2167875850` | `me01` | Hariyama | 73 | existing number collision in same set |
| `007c91d0-6e49-4654-b88e-da105cd4bac9` | `me01` | Helioptile | 52 | existing number collision in same set |
| `56611277-9b14-49e5-b71a-4fc1c675f973` | `me01` | Houndstone | 66 | existing number collision in same set |
| `b23ef0b8-9ab7-4333-9ec7-10555b8ae142` | `me01` | Inteleon | 41 | existing number collision in same set |
| `91eba394-d9a1-4e7e-926f-381d2abd8a32` | `me01` | Jynx | 57 | existing number collision in same set |
| `4800e647-2f2b-4ebc-931e-ef4b672788e2` | `me01` | Kirlia | 59 | existing number collision in same set |
| `36d01240-1013-435a-8216-4b9b333a8281` | `me01` | Kyogre | 34 | existing number collision in same set |
| `3a300a8d-7e5c-4744-9b3b-2961adcd57a2` | `me01` | Litleo | 23 | existing number collision in same set |
| `c910f0c6-98f9-48c9-9a97-44a7d766a91c` | `me01` | Magnemite | 45 | existing number collision in same set |
| `61df2e14-a9e4-4741-a957-4fef75468dee` | `me01` | Magneton | 46 | existing number collision in same set |
| `a4240ebf-2820-4455-90a5-5e24c780758d` | `me01` | Magnezone | 47 | existing number collision in same set |
| `38d96ab4-73b8-4a03-9b2a-2d0439e3effc` | `me01` | Makuhita | 72 | existing number collision in same set |
| `46bb2c65-85ca-4e54-82c8-bd4dc9709d3d` | `me01` | Mantine | 32 | existing number collision in same set |
| `6041ea6e-d598-45cd-82d5-43ff9af86265` | `me01` | Mega Abomasnow ex | 36 | existing number collision in same set |
| `d13cd05f-d7f8-47c1-92bf-76196414895f` | `me01` | Mega Camerupt ex | 22 | existing number collision in same set |
| `addfd1d7-c1cc-42e4-a4c2-ffddbba89022` | `me01` | Mega Gardevoir ex | 60 | existing number collision in same set |
| `f6c13207-e0b4-413d-a54d-f7eab7cdeadb` | `me01` | Mega Lucario ex | 77 | existing number collision in same set |
| `df1a84f9-7a7c-44a6-bce2-b6a21947ac8f` | `me01` | Mega Manectric ex | 50 | existing number collision in same set |
| `d05ad932-fbfe-40b6-b812-2097add0e93c` | `me01` | Mega Mawile ex | 94 | existing number collision in same set |
| `711a2789-6c0b-4c7b-8e5a-15c865deb444` | `me01` | Meganium | 10 | existing number collision in same set |
| `1b68a134-7b27-448d-b27d-bd6c792e1cf1` | `me01` | Nacli | 82 | existing number collision in same set |
| `4e4b3fa7-31fc-4740-a617-5be4d5ad453e` | `me01` | Naclstack | 83 | existing number collision in same set |
| `c1d12a78-15fd-4101-92b1-d03e06aab576` | `me01` | Nickit | 89 | existing number collision in same set |
| `5e8491ad-fbc4-4e97-b73f-03b6666ffff5` | `me01` | Nincada | 16 | existing number collision in same set |
| `728642b0-10e0-47fe-902e-acc0cc0f7c6f` | `me01` | Ninetales | 20 | existing number collision in same set |
| `756b62e3-5bf9-4aa7-9204-5682cb5f312c` | `me01` | Ninjask | 17 | existing number collision in same set |
| `e4ccbd91-a03c-416d-969a-af1c8faa7d0f` | `me01` | Numel | 21 | existing number collision in same set |
| `ab5d40b5-ae91-40cd-a3b2-c085eb226c15` | `me01` | Nuzleaf | 14 | existing number collision in same set |
| `b522fb51-1555-4d51-94a4-359988bbbe5f` | `me01` | Onix | 70 | existing number collision in same set |
| `a3c9641f-5152-4bc9-aec6-f7f5f836a5b6` | `me01` | Pachirisu | 51 | existing number collision in same set |
| `d7e33cc1-581b-4b4c-8497-be10892dbe0f` | `me01` | Raboot | 27 | existing number collision in same set |
| `569f605f-b7e2-4e7d-9182-459287edda7a` | `me01` | Ralts | 58 | existing number collision in same set |
| `6a389901-dd1b-480a-88fc-ca3d1ee02128` | `me01` | Riolu | 76 | existing number collision in same set |
| `29cd9592-1684-425b-9102-000c335f53b5` | `me01` | Sandslash | 69 | existing number collision in same set |
| `f2a6ce1c-3b4b-4b21-a367-25c6c9a4e2fd` | `me01` | Scorbunny | 26 | existing number collision in same set |

Additional blockers omitted from Markdown: 176. See JSON matrix.

## FK Blast-Radius Inventory

| Table.column | Reference rows | Referenced candidate rows | Safety note |
| --- | --- | --- | --- |
| `card_print_identity.card_print_id` | 504 | 504 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `card_print_traits.card_print_id` | 504 | 504 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `card_printings.card_print_id` | 1274 | 504 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `external_mappings.card_print_id` | 505 | 504 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `justtcg_variant_price_snapshots.card_print_id` | 5 | 1 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `justtcg_variant_prices_latest.card_print_id` | 5 | 1 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `justtcg_variants.card_print_id` | 5 | 1 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `pricing_watch.card_print_id` | 3 | 3 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `shared_cards.card_id` | 1 | 1 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `slab_certs.card_print_id` | 1 | 1 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `vault_item_instances.card_print_id` | 4 | 3 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |
| `vault_items.card_id` | 5 | 3 | ID-stable number update would not move this FK; inventory is blast-radius evidence only. |

## Candidate Sample

| Set | Card | Proposed number | Source carriers | Status |
| --- | --- | --- | --- | --- |
| `2021swsh` | Bulbasaur | 1 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Charmander | 9 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Chespin | 6 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Chikorita | 2 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Chimchar | 12 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Cyndaquil | 10 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Fennekin | 14 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Froakie | 22 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Grookey | 8 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Litten | 15 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Mudkip | 19 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Oshawott | 21 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Pikachu | 25 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Piplup | 20 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Popplio | 23 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Rowlet | 7 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Scorbunny | 16 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Snivy | 5 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Sobble | 24 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Squirtle | 17 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Tepig | 13 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Torchic | 11 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Totodile | 18 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Treecko | 3 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `2021swsh` | Turtwig | 4 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Aerodactyl | 98 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Aerodactyl ex | 101 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Aggron | 50 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Diglett | 46 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Dugtrio ex | 87 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Dugtrio ex | 47 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Dugtrio ex | 80 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Meowth | 73 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Meowth | 37 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Alolan Persian | 38 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Arcanine | 90 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Arcanine ex | 100 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Aron | 48 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Baltoy | 30 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Beast Wall | 63 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Beastite | 66 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Bewear | 58 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Blacephalon | 72 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Blacephalon | 9 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Blitzle | 16 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Buzzwole ex | 88 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Buzzwole ex | 6 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Buzzwole ex | 76 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Carvanha | 11 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Celebi ex | 99 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Celesteela | 62 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Celesteela | 75 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Claydol | 31 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Clefable | 23 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Clefairy | 22 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Dartrix | 4 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Decidueye | 5 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Electrical Cord | 65 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Emolga | 18 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |
| `A3a` | Ferroseed | 51 | external_ids.tcgdex, external_mappings.tcgdex | FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE |

Additional candidates omitted from Markdown: 444. See JSON matrix.

## Conclusion

The Lane A candidate set is not clean enough for a bulk future write-plan draft. Resolve or exclude blockers first, then regenerate this evidence.

No prefixed, complex, hard-stop, review-stop, existing-number conflict, missing-card, or variant work is authorized by this evidence pack.

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
