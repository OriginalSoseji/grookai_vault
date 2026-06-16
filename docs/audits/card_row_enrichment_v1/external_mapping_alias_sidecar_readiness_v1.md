# External Mapping Alias Sidecar Readiness V1

Audit-only projection for preserving useful source aliases before any future external mapping deactivation.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false

## Totals

| metric | value |
| --- | --- |
| duplicate_groups | 169 |
| sidecar_ready_groups | 99 |
| blocked_groups | 70 |
| projected_sidecar_alias_rows | 214 |
| projected_canonical_mapping_deactivations_after_sidecar | 214 |

## Sidecar Readiness

| readiness | groups |
| --- | --- |
| sidecar_ready_product_alias | 99 |
| blocked_source_owner_policy_needed | 52 |
| blocked_not_product_alias | 14 |
| blocked_canonical_source_id_not_unique | 3 |
| blocked_pocket_domain | 1 |

## Projected Alias Kinds

| alias kind | projected rows |
| --- | --- |
| battle_academy_alias | 168 |
| prize_pack_alias | 34 |
| prerelease_alias | 6 |
| product_alias | 4 |
| league_alias | 2 |

## Ready Group Samples

| source | set | number | name | keep active | alias rows |
| --- | --- | --- | --- | --- | --- |
| justtcg | bw2 | 53 | Gigalith | pokemon-emerging-powers-gigalith-rare | 1 |
| justtcg | ex12 | 45 | Tentacruel | pokemon-legend-maker-tentacruel-uncommon | 1 |
| justtcg | ex3 | 19 | Salamence | pokemon-dragon-salamence-19-97-rare | 2 |
| justtcg | ex5 | 50 | Swalot | pokemon-hidden-legends-swalot-uncommon | 1 |
| justtcg | ex7 | 37 | Dark Houndoom | pokemon-team-rocket-returns-dark-houndoom-037-109-uncommon | 1 |
| justtcg | ex8 | 38 | Manectric | pokemon-deoxys-manectric-uncommon | 1 |
| justtcg | ex9 | 29 | Grumpig | pokemon-emerald-grumpig-029-106-uncommon | 1 |
| justtcg | me01 | 104 | Mega Kangaskhan ex | pokemon-me01-mega-evolution-mega-kangaskhan-ex-104-132-double-rare | 1 |
| justtcg | sm1 | 119 | Great Ball | pokemon-sm-base-set-great-ball-uncommon | 9 |
| justtcg | sm1 | 120 | Hau | pokemon-sm-base-set-hau-uncommon | 9 |
| justtcg | sm1 | 132 | Switch | pokemon-sm-base-set-switch-uncommon | 5 |
| justtcg | sm10 | 189a | Welder | pokemon-sm-unbroken-bonds-welder-uncommon | 1 |
| justtcg | sm11 | 164 | Tauros | pokemon-sm-unified-minds-tauros-uncommon | 2 |
| justtcg | sm11 | 189 | Bug Catcher | pokemon-sm-unified-minds-bug-catcher-uncommon | 7 |
| justtcg | sm5 | 119a | Cynthia | pokemon-sm-ultra-prism-cynthia-uncommon | 7 |
| justtcg | sm8 | 105 | Mareanie | pokemon-sm-lost-thunder-mareanie-105-common | 1 |
| justtcg | sm8 | 172 | Electropower | pokemon-sm-lost-thunder-electropower-uncommon | 1 |
| justtcg | sv01 | 033 | Houndour | pokemon-sv01-scarlet-violet-base-set-houndour-033-198-common | 3 |
| justtcg | sv01 | 034 | Houndoom | pokemon-sv01-scarlet-violet-base-set-houndoom-034-198-common | 2 |
| justtcg | sv01 | 035 | Torkoal | pokemon-sv01-scarlet-violet-base-set-torkoal-uncommon | 2 |
| justtcg | sv01 | 038 | Skeledirge | pokemon-sv01-scarlet-violet-base-set-skeledirge-rare | 1 |
| justtcg | sv01 | 039 | Charcadet | pokemon-sv01-scarlet-violet-base-set-charcadet-039-198-common | 3 |
| justtcg | sv01 | 054 | Quaquaval | pokemon-sv01-scarlet-violet-base-set-quaquaval-rare | 1 |
| justtcg | sv01 | 061 | Dondozo | pokemon-sv01-scarlet-violet-base-set-dondozo-061-198-rare | 1 |
| justtcg | sv01 | 069 | Rotom | pokemon-sv01-scarlet-violet-base-set-rotom-069-198-common | 1 |
| justtcg | sv01 | 076 | Pawmot | pokemon-sv01-scarlet-violet-base-set-pawmot-076-198-rare | 1 |
| justtcg | sv01 | 077 | Wattrel | pokemon-sv01-scarlet-violet-base-set-wattrel-077-198-common | 2 |
| justtcg | sv01 | 096 | Klefki | pokemon-sv01-scarlet-violet-base-set-klefki-rare | 1 |
| justtcg | sv01 | 109 | Annihilape | pokemon-sv01-scarlet-violet-base-set-annihilape-rare | 1 |
| justtcg | sv01 | 118 | Hawlucha | pokemon-sv01-scarlet-violet-base-set-hawlucha-rare | 1 |
| justtcg | sv01 | 164 | Cyclizar | pokemon-sv01-scarlet-violet-base-set-cyclizar-164-198-rare | 1 |
| justtcg | sv01 | 170 | Electric Generator | pokemon-sv01-scarlet-violet-base-set-electric-generator-uncommon | 1 |
| justtcg | sv01 | 175 | Jacq | pokemon-sv01-scarlet-violet-base-set-jacq-175-198-uncommon | 3 |
| justtcg | sv01 | 180 | Nemona | pokemon-sv01-scarlet-violet-base-set-nemona-common | 9 |
| justtcg | sv01 | 181 | Nest Ball | pokemon-sv01-scarlet-violet-base-set-nest-ball-181-198-uncommon | 3 |
| justtcg | sv01 | 188 | Potion | pokemon-sv01-scarlet-violet-base-set-potion-common | 5 |
| justtcg | sv01 | 194 | Switch | pokemon-sv01-scarlet-violet-base-set-switch-common | 5 |
| justtcg | sv01 | 198 | Youngster | pokemon-sv01-scarlet-violet-base-set-youngster-uncommon | 7 |
| justtcg | sv02 | 135 | Tyranitar | pokemon-sv02-paldea-evolved-tyranitar-135-193-rare | 1 |
| justtcg | sv02 | 137 | Seviper | pokemon-sv02-paldea-evolved-seviper-uncommon | 1 |
| justtcg | sv02 | 172 | Boss's Orders (Ghetsis) | pokemon-sv02-paldea-evolved-boss-s-orders-172-193-rare | 1 |
| justtcg | sv02 | 183 | Great Ball | pokemon-sv02-paldea-evolved-great-ball-common | 9 |
| justtcg | sv03 | 040 | Larvesta | pokemon-sv03-obsidian-flames-larvesta-common | 2 |
| justtcg | sv03 | 041 | Volcarona | pokemon-sv03-obsidian-flames-volcarona-uncommon | 1 |
| justtcg | sv03 | 139 | Salandit | pokemon-sv03-obsidian-flames-salandit-common | 1 |
| justtcg | sv03 | 140 | Salazzle | pokemon-sv03-obsidian-flames-salazzle-uncommon | 1 |
| justtcg | sv03.5 | 132 | Ditto | pokemon-sv-scarlet-violet-151-ditto-rare | 1 |
| justtcg | sv04 | 104 | Garganacl | pokemon-sv04-paradox-rift-garganacl-104-182-rare | 1 |
| justtcg | sv04 | 118 | Yveltal | pokemon-sv04-paradox-rift-yveltal-118-182-rare | 1 |
| justtcg | sv04 | 123 | Brute Bonnet | pokemon-sv04-paradox-rift-brute-bonnet-123-182-rare | 1 |

## Blocked Group Samples

| source | set | number | name | readiness | reason |
| --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | blocked_pocket_domain | Pocket product aliases require Pocket-specific sidecar governance. |
| justtcg | me02 | 054 | Gastly | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 148 | Golisopod-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 149 | Tapu Bulu-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 150 | Charizard-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 151 | Salazzle-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 152 | Tapu Fini-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 153 | Necrozma-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 154 | Machamp-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 155 | Lycanroc-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 156 | Marshadow-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 157 | Alolan Muk-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 158 | Darkrai-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 159 | Gardevoir-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | sm3 | 160 | Noivern-GX | blocked_not_product_alias | No deterministic product alias marker found. |
| justtcg | svp | 107 | Mareep | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| justtcg | svp | 108 | Flaaffy | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| justtcg | svp | 109 | Ampharos | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| pokemonapi | sm1 | 101a | Eevee | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm10 | 182a | Pokégear 3.0 | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm10 | 189a | Welder | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm10 | 195a | Dedenne-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm11 | 191 | Cherish Ball | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm11 | 206 | Reset Stamp | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm11 | 79 | Jirachi-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm12 | 143a | Togepi & Cleffa & Igglybuff-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 121 | Choice Band | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 124 | Enhanced Hammer | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 125 | Field Blower | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 128a | Max Potion | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 130a | Rescue Stretcher | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 157a | Metagross-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 19a | Alolan Sandshrew | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 21a | Alolan Vulpix | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 51 | Garbodor | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 60 | Tapu Lele-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm2 | 92 | Sylveon-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm6 | 102a | Beast Ring | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm6 | 112 | Metal Frying Pan | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm6 | 113 | Mysterious Treasure | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm6 | 2 | Alolan Exeggutor | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm7 | 10a | Sceptile | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm7 | 123 | Acro Bike | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm7 | 148a | Tate & Liza | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm7 | 177 | Rayquaza-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm8 | 172 | Electropower | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm8 | 187 | Net Ball | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm8 | 188a | Professor Elm's Lecture | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | sm8 | 189 | Sightseer | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |
| pokemonapi | smp | SM103 | Lunala-GX | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |

## Guardrails

- Do not create schema in this pass.
- Do not deactivate external_mappings until projected alias rows are preserved.
- Do not project suffix/base aliases without source-specific owner policy.
- Do not project Pocket aliases into English physical sidecar.
- Do not treat product aliases as canonical card identity.

Recommended next step: `prepare_no-write_sidecar_schema_migration_plan_and_guarded_dry_run_for_product_alias_preservation`

Fingerprint: `6502d9d3941d71cbb1578034f72896b172055cf2afb297525b5c37fb8777092f`
