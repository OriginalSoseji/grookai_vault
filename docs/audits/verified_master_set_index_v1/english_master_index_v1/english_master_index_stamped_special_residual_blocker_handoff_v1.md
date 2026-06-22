# Stamped/Special Residual Blocker Handoff V1

Audit-only handoff for the remaining stamped/special rows after source exhaustion.

## Summary

| metric | value |
| --- | --- |
| residual_rows | 277 |
| write_ready_now | 0 |
| evidence_blocked_rows | 171 |
| no_write_governance_rows | 91 |
| dependency_blocked_rows | 15 |
| manual_adjudication_rows | 0 |
| future_dry_run_ready_rows | 0 |
| db_writes_performed | false |
| migrations_created | false |
| fingerprint_sha256 | `c026b76db21c3444da7ff175233f7d1e3ebd37b062558b16f9e574209f3af507` |

## What This Means

- These rows are not approved for DB writes.
- Generic `stamped` remains suppressed and is not canonical truth.
- Display-only metadata rows should not become card_print/card_printing rows unless new evidence proves a physical printing lane.
- Evidence-blocked rows need exact set + number + name + stamp/variant + finish evidence with source URL.

## Execution Groups

| group | rows | meaning |
| --- | --- | --- |
| dependency_blocked | 15 | A base parent, base finish, or existing dependency must be resolved first. |
| evidence_blocked | 171 | Exact source evidence is insufficient for a write package. |
| no_write_governance | 91 | Governance says this should not become a canonical printing row now. |

## Action Buckets

| bucket | rows | evidence needed | write path |
| --- | --- | --- | --- |
| display_metadata_no_write | 57 | No child-printing evidence needed; these belong outside canonical printings unless a source proves a distinct physical card lane. | No card_print/card_printing write. Optional future product/display metadata only. |
| league_finish_exact_source | 56 | Exact source tying the league placement/stamp variant to the specific finish for the exact set, number, and name. | Parent identity + active child printing only after exact finish proof. |
| prize_pack_second_source | 35 | Second independent source for Prize Pack stamp card/finish, not generic Prize Pack assumptions. | Parent identity + active child printing after second-source confirmation. |
| small_custom_stamp_exact_source | 31 | Exact event/stamp page or scan that proves the custom stamp exists on that exact card and finish. | Parent identity + active child printing after source-backed finish proof. |
| closed_stale_no_write | 19 | None currently. Row is stale/closed for write purposes. | No write. |
| event_staff_exact_source | 19 | Exact event/staff source proving stamp label and finish for the exact card. | Parent identity + active child printing after exact finish proof. |
| generic_stamped_suppressed_no_write | 15 | Specific stamp label and exact finish. Generic “stamped” is intentionally suppressed. | No write until generic stamped becomes a deterministic variant label. |
| prerelease_exact_finish_source | 10 | Exact prerelease/staff prerelease finish evidence for the card, not era or set assumptions. | Parent identity + active child printing after exact finish proof. |
| professor_program_exact_finish_source | 10 | Exact Professor Program stamp and finish evidence for the exact card. | Parent identity + active child printing after exact finish proof. |
| second_source_needed | 10 | One more independent source that agrees on exact set, number, name, stamp/variant, and finish. | Dry-run package only after second-source agreement. |
| base_parent_blocked_no_write | 9 | Resolve base parent/base finish dependency before variant parent can be safely modeled. | Dependency first; no variant write now. |
| halloween_base_parent_or_finish_resolution | 6 | Resolve whether the Halloween row is a product/display lane, base parent issue, or exact stamped printing with finish. | No write until lane and finish are deterministic. |

## Largest Set Clusters

| set | rows |
| --- | --- |
| swsh1 | 17 |
| swsh8 | 17 |
| swshp | 12 |
| bwp | 9 |
| sm115 | 9 |
| swsh5 | 9 |
| sm8 | 8 |
| swsh11 | 8 |
| swsh3 | 8 |
| sm1 | 7 |
| sv10 | 7 |
| wp | 7 |

## Largest Variant Clusters

| variant | rows |
| --- | --- |
| battle_academy_deck_mark | 62 |
| league_stamp | 48 |
| prize_pack_stamp | 40 |
| unknown | 20 |
| professor_program_stamp | 17 |
| prerelease_stamp | 10 |
| pikachu_jack_o_lantern_stamp | 9 |
| league_cup_staff_stamp | 8 |
| staff_stamp | 6 |
| play_pok_mon_thank_you_stamp | 5 |
| player_rewards_crosshatch_stamp | 4 |
| eb_games_stamp | 3 |

## Bucket Examples

### display_metadata_no_write

Rows: 57

Suggested sources: Product metadata model, variant-origin display copy

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| sm1 | 119 | Great Ball | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm1 | 120 | Hau | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm1 | 126 | Pokémon Catcher | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm1 | 127 | Potion | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm1 | 132 | Switch | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm10 | 189 | Welder | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 164 | Tauros | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 189 | Bug Catcher | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 34 | Salazzle | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 84 | Mesprit | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 87 | Cresselia | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |
| sm11 | 97 | Toxapex | battle_academy_deck_mark | Battle Academy Deck Mark | active_finish_required | Battle Academy marks are display metadata strategy, not printing inserts. |

### league_finish_exact_source

Rows: 56

Suggested sources: Pokumon card pages, PokeScope, sealed league/product evidence, clear front/back scan with source URL

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bw10 | 5 | Tropius | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw11 | 97 | Deino | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw3 | 11 | Shelmet | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw3 | 8 | Karrablast | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw5 | 12 | Flareon | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw5 | 4 | Scyther | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw7 | 38 | Delibird | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw8 | 118 | Colress | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw8 | 123 | Hypnotoxic Laser | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw9 | 11 | Leafeon | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| bw9 | 23 | Glaceon | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| dp1 | 3 | Electivire | league_stamp | League Stamp | active_finish_required | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |

### prize_pack_second_source

Rows: 35

Suggested sources: Official Prize Pack lists, Pokumon, TCGplayer product titles where exact, PriceCharting exact product rows

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bw2 | 95 | Pokémon Catcher | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| bw9 | 100 | Frozen City | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| sve | 13 | Basic Psychic Energy | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 117 | Galarian Zigzagoon | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 156 | Air Balloon | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 159 | Crushing Hammer | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 169 | Marnie | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 170 | Metal Saucer | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 171 | Ordinary Rod | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 180 | Rare Candy | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh1 | 186 | Aurora Energy | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| swsh2 | 109 | Falinks | prize_pack_stamp | Prize Pack Stamp | active_finish_required | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |

### small_custom_stamp_exact_source

Rows: 31

Suggested sources: Pokumon, collector references, tournament/event pages, authenticated listings with stable proof

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bw1 | 105 | Grass Energy | play_pokemon_stamp | Play! Pokemon Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| bw1 | 106 | Fire Energy | play_pokemon_stamp | Play! Pokemon Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| bw1 | 111 | Darkness Energy | play_pokemon_stamp | Play! Pokemon Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| bw1 | 15 | Tepig | player_rewards_crosshatch_stamp | Player Rewards Crosshatch Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| col1 | 88 | Grass Energy | player_rewards_crosshatch_stamp | Player Rewards Crosshatch Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex10 | 29 | Lugia | pokemon_rocks_america_stamped_2005 | Pokemon Rocks America Stamped; 2005 | active_finish_required_with_dependency_awareness | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex11 | 61 | Ditto | origins_game_fair_stamped_200 | Origins Game Fair Stamped; 200 | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex11 | 64 | Ditto | games_expo_stamped_2007 | Games Expo Stamped; 2007 | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex12 | 5 | Gengar | gym_challenge_stamped_2006_2007 | Gym Challenge Stamped; 2006 2007 | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex9 | 60 | Pikachu | san_diego_comic_con_international_stamped_2005 | San Diego Comic Con International Stamped; 2005 | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| ex9 | 70 | Treecko | indianapolis_gencon_stamped_2005 | Indianapolis GenCon Stamped; 2005 | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| hgss1 | 40 | Donphan | player_rewards_crosshatch_stamp | Player Rewards Crosshatch Stamp | active_finish_required | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |

### closed_stale_no_write

Rows: 19

Suggested sources: none

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| me01 | 87 | Spiritomb | stamped | Stamped | base_parent_ambiguous | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv03.5 | 100 | Voltorb | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv06.5 | 61 | Night Stretcher | prize_pack_stamp | Prize Pack Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 109 | Friends in Paldea | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 116 | Max Rod | prize_pack_stamp | Prize Pack Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 122 | Professor's Research | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 123 | Professor's Research | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 124 | Professor's Research | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| sv08.5 | 125 | Professor's Research | professor_program_stamp | Professor Program Stamp | base_parent_missing | Already closed or stale relative to current canonical rows; keep out of write planning. |
| swsh11 | 17 | Trevenant | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | base_parent_ambiguous | Already closed or stale relative to current canonical rows; keep out of write planning. |
| swsh11 | 26 | Chandelure | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | base_parent_ambiguous | Already closed or stale relative to current canonical rows; keep out of write planning. |
| swsh11 | 64 | Gastly | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | base_parent_ambiguous | Already closed or stale relative to current canonical rows; keep out of write planning. |

### event_staff_exact_source

Rows: 19

Suggested sources: Pokumon, event archives, collector references, PSA/CGC pop or cert pages only with exact visible front

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bwp | BW50 | Tropical Beach | finalist_stamp | Finalist Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| bwp | BW95 | Champions Festival | quarter_finalist_stamp | Quarter Finalist Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| dp6 | 130 | Buck's Training | staff_stamp | Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| dp6 | 2 | Dragonite | staff_stamp | Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| dpp | DP25 | Tropical Wind | finalist_stamp | Finalist Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| sm3 | 115 | Guzma | world_championships_stamp | World Championships Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| sm8 | 188 | Professor Elm's Lecture | regional_championships_staff_stamp | Regional Championships Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| smp | SM231 | Champions Festival | quarter_finalist_stamp | Quarter Finalist Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| sv10 | 34 | Ethan's Typhlosion | staff_stamp | Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| sv10 | 49 | Misty's Gyarados | staff_stamp | Staff Stamp | active_finish_required_with_dependency_awareness | Target event/staff stamped sources with exact stamp label and active finish. |
| sv10 | 87 | Team Rocket's Mimikyu | staff_stamp | Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |
| sv10 | 96 | Team Rocket's Tyranitar | staff_stamp | Staff Stamp | active_finish_required | Target event/staff stamped sources with exact stamp label and active finish. |

### generic_stamped_suppressed_no_write

Rows: 15

Suggested sources: Exact stamp family pages, source image labels, product checklists

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bog | 4 | Rocket's Scizor |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bog | 5 | Rocket's Sneasel |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW29 | Victory Cup |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW30 | Victory Cup |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW31 | Victory Cup |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW53 | Flygon |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW84 | Porygon-Z |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| bwp | BW96 | Tornadus-EX |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| smp | SM199 | Psyduck |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| smp | SM200 | Snubbull |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| smp | SM78 | Champions Festival |  |  | stamp_identity_label_needed | Generic stamped claims remain suppressed unless exact stamp label is discovered. |
| svp | 72 | Great Tusk ex | stamped | Stamped | active_finish_required | Generic stamped claims remain suppressed unless exact stamp label is discovered. |

### prerelease_exact_finish_source

Rows: 10

Suggested sources: Prerelease product/source pages, Pokumon, PokeScope, verified scans

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bwp | BW75 | Metagross | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| ex4 | 24 | Team Aqua's Cacnea | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH185 | Moltres | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH186 | Lucario | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH187 | Liepard | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH188 | Bibarel | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH205 | Hisuian Basculegion | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH206 | Wyrdeer | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH207 | Hisuian Samurott | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |
| swshp | SWSH208 | Magnezone | prerelease_stamp | Prerelease Stamp | active_finish_required | Target prerelease pages/products that prove exact stamped card and active finish. |

### professor_program_exact_finish_source

Rows: 10

Suggested sources: Professor Program references, Pokumon, collector checklists, verified scans

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| dp3 | 122 | Professor Oak's Visit | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| ex15 | 79 | Professor Elm's Training Method | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| ex6 | 98 | Prof. Oak's Research | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| hgss1 | 100 | Professor Elm's Training Method | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| sv02 | 66 | Voltorb | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| swsh1 | 175 | Pokémon Catcher | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| swsh1 | 177 | Potion | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| swsh8 | 29 | Vulpix | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| swsh8 | 46 | Sizzlipede | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |
| swsh9 | 147 | Professor's Research | professor_program_stamp | Professor Program Stamp | active_finish_required | Target Professor Program checklist/product sources that prove exact active finish. |

### second_source_needed

Rows: 10

Suggested sources: Different collector reference than the existing source, official/checklist source, stable marketplace product page with exact title/image proof

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | National Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| bw5 | 25 | Vaporeon | states_championships_staff_stamp | States Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| bw5 | 37 | Jolteon | regional_championships_staff_stamp | Regional Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| bw5 | 84 | Eevee | city_championships_staff_stamp | City Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| dp1 | 52 | Luxio | staff_prerelease_stamp | Staff Prerelease Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| dp1 | 52 | Luxio | states_championships_staff_stamp | States Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| me02 | 26 | Suicune | eb_games_stamp | EB Games Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| sm6 | 102 | Beast Ring | league_staff_stamp | League Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| xy10 | 94 | Chaos Tower | national_championships_staff_stamp | National Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |
| xy8 | 145 | Parallel City | city_championships_staff_stamp | City Championships Staff Stamp | blocked_second_independent_source_needed | Find one more independent exact source for rows already supported by a single source. |

### base_parent_blocked_no_write

Rows: 9

Suggested sources: Master Index base-card evidence, canonical DB dependency audit

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| sm7.5 | 3 | Charizard | battle_academy_deck_mark | Battle Academy Deck Mark | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| sm7.5 | 55 | Kangaskhan | battle_academy_deck_mark | Battle Academy Deck Mark | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR B2 63 | Wartortle |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR FO 50 | Kabuto |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR GC 37 | Brock's Vulpix |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR GH 54 | Misty's Psyduck |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR JU 60 | Pikachu |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR TR 19 | Dark Arbok |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| wp | WPR TR 32 | Dark Charmeleon |  |  | base_parent_missing | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |

### halloween_base_parent_or_finish_resolution

Rows: 6

Suggested sources: Trick or Trade product/checklist evidence, sealed product evidence, exact card scans

| set | number | card | variant | stamp | status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| sv05 | 77 | Scream Tail | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
| svp | 75 | Mimikyu | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
| swsh11 | 16 | Phantump | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
| swsh11 | 24 | Litwick | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
| swsh11 | 25 | Lampent | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
| swsh11 | 65 | Haunter | pikachu_jack_o_lantern_stamp | Pikachu Jack-o'-Lantern Stamp | active_finish_required | Resolve missing base parent/target child finish before using Halloween product evidence. |
