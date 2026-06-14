# SV03 Bulbapedia Additional Stamped Active Finish V1

Generated: 2026-06-12T16:31:00.624Z

Audit-only acquisition against Bulbapedia Obsidian Flames Additional Cards. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| target_rows | 18 |
| bulbapedia_entries_matched | 18 |
| accepted_active_finish_identity_candidates | 4 |
| identity_only_no_active_finish | 14 |
| active_finish_only_identity_not_proven | 1 |
| blocked_jumbo_or_display_only_no_active_finish | 0 |
| source_entry_missing | 0 |
| fixture_records_generated | 4 |
| fingerprint_sha256 | `20c8bfaaa462c9800069c13e22f5afcea2fe55d19f07edec121a8dba8b00806e` |

## Source Rule

Bulbapedia rows are accepted only when the same Additional Cards entry explicitly proves both an active finish and a stamped/product identity. Stamp-only rows remain blocked because `stamped` is not a child finish key.

Source: https://bulbapedia.bulbagarden.net/wiki/Obsidian_Flames_(TCG)

## Results

| number | card | status | active_finish | identity | evidence_label |
| --- | --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | identity_only_no_active_finish |  | play_pokemon_stamp, pokemon_tcg_gym_present_pack_stamp | Pokémon TCG Gym stamped Present Pack exclusive (Malaysia/Singapore) \| "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive |
| 40 | Larvesta | identity_only_no_active_finish |  | battle_academy_deck_stamp | "31" Armarouge Deck stamp Battle Academy 2024 exclusive \| "44" Armarouge Deck stamp Battle Academy 2024 exclusive |
| 41 | Volcarona | identity_only_no_active_finish |  | battle_academy_deck_stamp | "46" Armarouge Deck stamp Battle Academy 2024 exclusive |
| 42 | Eiscue ex | identity_only_no_active_finish |  | snowflake_symbol | Snowflake Symbol Holiday Calendar 2024 exclusive |
| 66 | Tyranitar ex | identity_only_no_active_finish |  | play_pokemon_stamp | "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive |
| 92 | Lunatone | identity_only_no_active_finish |  | play_pokemon_stamp | "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive |
| 95 | Claydol | identity_only_no_active_finish |  | play_pokemon_stamp | "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive |
| 125 | Charizard ex | identity_only_no_active_finish |  | jumbo_stamp, play_pokemon_stamp | Jumbo "Obsidian Flames" stamp gift with purchase exclusive (Europe) \| "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive; "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Five exclusive; "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Six exclusive |
| 131 | Houndour | identity_only_no_active_finish |  | pikachu_jack_o_lantern_stamp | Pikachu jack-o'-lantern stamp Trick or Trade BOOster Bundle 2024 exclusive |
| 133 | Houndoom | identity_only_no_active_finish |  | pikachu_jack_o_lantern_stamp | Pikachu jack-o'-lantern stamp Trick or Trade BOOster Bundle 2024 exclusive |
| 136 | Darkrai | accepted_active_finish_and_stamped_identity_review_candidate | cosmos | pikachu_jack_o_lantern_stamp | Cosmos Holo Triple Whammy Tins Exclusive \| Cosmos Holo Pikachu jack-o'-lantern stamp Trick or Trade BOOster Bundle 2024 exclusive |
| 139 | Salandit | identity_only_no_active_finish |  | battle_academy_deck_stamp | Darkrai Deck stamp Battle Academy 2024 exclusive |
| 140 | Salazzle | identity_only_no_active_finish |  | battle_academy_deck_stamp | Darkrai Deck stamp Battle Academy 2024 exclusive |
| 141 | Scizor | active_finish_only_identity_not_proven |  | pokemon_tcg_gym_present_pack_stamp | Pokémon TCG Gym stamped Present Pack exclusive (Malaysia/Singapore) \| Cosmos Holo Meddling Sparks Premium Collection exclusive |
| 164 | Pidgeot ex | identity_only_no_active_finish |  | great_ball_league_promo, play_pokemon_stamp, pokemon_tcg_gym_present_pack_stamp | Pokémon TCG Gym stamped Present Pack exclusive (Malaysia/Singapore) \| Great Ball League Promo (Malaysia/Singapore/Philippines) \| "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive; "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Five exclusive; "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Six exclusive |
| 188 | Geeta | accepted_active_finish_and_stamped_identity_review_candidate | reverse | regionals_2023_promo, regionals_2023_staff_promo | Reverse Holo Regionals 2023 promo \| Reverse Holo Regionals 2023 Staff promo |
| 189 | Letter of Encouragement | identity_only_no_active_finish |  | play_pokemon_stamp, pokemon_tcg_gym_present_pack_stamp | Pokémon TCG Gym stamped Present Pack exclusive (Malaysia/Singapore) \| "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Four exclusive |
| 196 | Town Store | accepted_active_finish_and_stamped_identity_review_candidate | cosmos | play_pokemon_stamp | Cosmos Holo "Play! Pokémon" Stamp Play! Pokémon Prize Pack Series Six exclusive |
