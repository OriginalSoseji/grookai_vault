# English Master Index Set Alias Normalization V1

Evidence set aliases are canonicalized before suppression and classification only when an alias resolves to exactly one configured English set.

This is an audit-only evidence canonicalization report. No DB writes, migrations, cleanup, or quarantine were performed.

## Summary

| metric | count |
| --- | --- |
| evidence_rows_examined | 304368 |
| evidence_rows_after_dedupe | 234268 |
| evidence_rows_remapped | 908 |
| duplicate_rows_collapsed | 70100 |
| unresolved_evidence_rows | 0 |
| ambiguous_aliases | 0 |
| source_availability_rows_remapped | 0 |

## Remaps

| from_set_key | from_set_name | to_set_key | to_set_name | evidence_rows |
| --- | --- | --- | --- | --- |
| me4 | Chaos Rising | me04 | Chaos Rising | 183 |
| sv3 | Obsidian Flames | sv03 | Obsidian Flames | 164 |
| swsh45 | Shining Fates | swsh4.5 | Shining Fates | 151 |
| sv3pt5 | 151 | sv03.5 | 151 | 145 |
| cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 46 |
| sm75 | Dragon Majesty | sm7.5 | Dragon Majesty | 39 |
| sv2 | Paldea Evolved | sv02 | Paldea Evolved | 31 |
| sv8pt5 | Prismatic Evolutions | sv08.5 | Prismatic Evolutions | 24 |
| sv5 | Temporal Forces | sv05 | Temporal Forces | 21 |
| sm35 | Shining Legends | sm3.5 | Shining Legends | 20 |
| sv9 | Journey Together | sv09 | Journey Together | 17 |
| sv7 | Stellar Crown | sv07 | Stellar Crown | 14 |
| me1 | Mega Evolution | me01 | Mega Evolution | 9 |
| sv6pt5 | Shrouded Fable | sv06.5 | Shrouded Fable | 7 |
| bp | Best of Game | bog | Best of Game | 6 |
| sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 5 |
| me2 | Phantasmal Flames | me02 | Phantasmal Flames | 4 |
| pgo | Pokémon GO | swsh10.5 | Pokémon GO | 3 |
| sv1 | Scarlet & Violet | sv01 | Scarlet & Violet | 3 |
| sv8 | Surging Sparks | sv08 | Surging Sparks | 3 |
| hsp | HGSS Black Star Promos | hgssp | HGSS Black Star Promos | 2 |
| zsv10pt5 | Black Bolt | sv10.5b | Black Bolt | 2 |
| hgss2 | HS-Unleashed | hgss2 | HS—Unleashed | 1 |
| hgss4 | HS-Triumphant | hgss4 | HS—Triumphant | 1 |
| rsv10pt5 | White Flare | sv10.5w | White Flare | 1 |
| swsh12pt5 | Crown Zenith | swsh12.5 | Crown Zenith | 1 |
| swsh35 | Champion's Path | swsh3.5 | Champion's Path | 1 |
| tk1a | EX Trainer Kit Latias | tk-ex-latia | EX Trainer Kit Latias | 1 |
| tk1b | EX Trainer Kit Latios | tk-ex-latio | EX Trainer Kit Latios | 1 |
| tk2a | EX Trainer Kit 2 Plusle | tk-ex-p | EX Trainer Kit 2 Plusle | 1 |
| tk2b | EX Trainer Kit 2 Minun | tk-ex-m | EX Trainer Kit 2 Minun | 1 |

## Remap Samples

| source | evidence_type | original_key | original_name | canonical_key | canonical_name | number | card | finish |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 2 | Blastoise |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 4 | Charizard |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 8 | Dark Gyarados |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 9 | Team Magma's Groudon |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 15 | Venusaur |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 15 | Here Comes Team Rocket! |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 15 | Rocket's Zapdos |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 15 | Claydol |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 17 | Umbreon Star |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 20 | Cleffa |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 24 | _____'s Pikachu |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 54 | Mewtwo EX |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 60 | Tapu Lele GX |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 66 | Shining Magikarp |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 73 | Imposter Professor Oak |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 76 | M Rayquaza EX |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 86 | Rocket's Admin. |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 88 | Mew ex |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 93 | Gardevoir ex |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 97 | Xerneas EX |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 107 | Donphan |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 109 | Luxray GL LV.X |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 113 | Reshiram |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 114 | Zekrom |  |
| tcgdex | card_identity | cel25 | Celebrations | cel25c | Celebrations: Classic Collection | 145 | Garchomp C LV.X |  |
| binderbuilder_set_variant | finish_presence | hsp | HGSS Black Star Promos | hgssp | HGSS Black Star Promos | HGSS10 | Latias | cosmos |
| binderbuilder_set_variant | finish_presence | hsp | HGSS Black Star Promos | hgssp | HGSS Black Star Promos | HGSS11 | Latios | cracked_ice |
| binderbuilder_set_variant | finish_presence | pgo | Pokémon GO | swsh10.5 | Pokémon GO | 27 | Pikachu | holo |
| binderbuilder_set_variant | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 16 | Pidgey | stamped |
| bulbapedia_build_battle_product | finish_presence | me2 | Phantasmal Flames | me02 | Phantasmal Flames | 045 | Zacian | normal |
| bulbapedia_build_battle_product | finish_presence | me2 | Phantasmal Flames | me02 | Phantasmal Flames | 053 | Flygon | normal |
| bulbapedia_build_battle_product | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 013 | Delphox | normal |
| bulbapedia_build_battle_product | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 029 | Ampharos | normal |
| bulbapedia_build_battle_product | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 051 | Crobat | normal |
| bulbapedia_build_battle_product | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 068 | Goodra | normal |
| bulbapedia_build_battle_product | finish_presence | sv1 | Scarlet & Violet | sv01 | Scarlet & Violet | 190 | Professor's Research | normal |
| bulbapedia_build_battle_product | finish_presence | sv1 | Scarlet & Violet | sv01 | Scarlet & Violet | 190 | Professor's Research | normal |
| bulbapedia_build_battle_product | finish_presence | sv1 | Scarlet & Violet | sv01 | Scarlet & Violet | 190 | Professor's Research | normal |
| bulbapedia_build_battle_product | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 21 | Lokix | normal |
| bulbapedia_build_battle_product | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 60 | Baxcalibur | normal |
| bulbapedia_build_battle_product | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 105 | Tinkaton | normal |
| bulbapedia_build_battle_product | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 172 | Boss's Orders (Ghetsis) | normal |
| bulbapedia_build_battle_product | finish_presence | sv3 | Obsidian Flames | sv03 | Obsidian Flames | 062 | Palafin | normal |
| bulbapedia_build_battle_product | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 78 | Flutter Mane | normal |
| bulbapedia_build_battle_product | finish_presence | sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 033 | Infernape | normal |
| bulbapedia_build_battle_product | finish_presence | sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 053 | Froslass | normal |
| bulbapedia_build_battle_product | finish_presence | sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 095 | Munkidori | normal |
| bulbapedia_build_battle_product | finish_presence | sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 096 | Fezandipiti | normal |
| bulbapedia_build_battle_product | finish_presence | sv6 | Twilight Masquerade | sv06 | Twilight Masquerade | 111 | Okidogi | normal |
| bulbapedia_build_battle_product | finish_presence | sv8 | Surging Sparks | sv08 | Surging Sparks | 014 | Rabsca | normal |
| bulbapedia_build_battle_product | finish_presence | sv8 | Surging Sparks | sv08 | Surging Sparks | 038 | Gouging Fire | normal |
| bulbapedia_build_battle_product | finish_presence | sv8 | Surging Sparks | sv08 | Surging Sparks | 065 | Tapu Koko | normal |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 1 | Electabuzz | stamped |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 2 | Hitmonchan | stamped |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 4 | Rocket's Scizor | stamped |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 5 | Rocket's Sneasel | stamped |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 6 | Dark Ivysaur | stamped |
| bulbapedia_card_page_release_info | finish_presence | bp | Best of Game | bog | Best of Game | 7 | Dark Venusaur | stamped |
| bulbapedia_card_page_release_info | finish_presence | me1 | Mega Evolution | me01 | Mega Evolution | 74 | Lunatone | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 12 | Sprigatito | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 50 | Quaxly | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 60 | Baxcalibur | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 61 | Chien-Pao ex | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 62 | Pikachu | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 63 | Pikachu ex | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 88 | Mismagius | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 97 | Mimikyu | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 131 | Murkrow | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 137 | Seviper | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 151 | Orthworm | normal |
| bulbapedia_card_page_release_info | finish_presence | sv2 | Paldea Evolved | sv02 | Paldea Evolved | 159 | Pelipper | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 25 | Pikachu | cosmos |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 63 | Abra | cosmos |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 64 | Kadabra | cosmos |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 125 | Electabuzz | cosmos |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 132 | Ditto | normal |
| bulbapedia_card_page_release_info | finish_presence | sv3pt5 | 151 | sv03.5 | 151 | 133 | Eevee | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 41 | Feraligatr | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 51 | Pikachu | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 78 | Flutter Mane | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 102 | Gastly | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 103 | Haunter | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 114 | Metang | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv5 | Temporal Forces | sv05 | Temporal Forces | 139 | Iron Jugulis | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv7 | Stellar Crown | sv07 | Stellar Crown | 3 | Ledian | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv7 | Stellar Crown | sv07 | Stellar Crown | 115 | Noctowl | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv7 | Stellar Crown | sv07 | Stellar Crown | 119 | Bouffalant | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv7 | Stellar Crown | sv07 | Stellar Crown | 149 | Crabominable | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv8pt5 | Prismatic Evolutions | sv08.5 | Prismatic Evolutions | 74 | Eevee | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv9 | Journey Together | sv09 | Journey Together | 27 | N's Darmanitan | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv9 | Journey Together | sv09 | Journey Together | 55 | Iono's Kilowattrel | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv9 | Journey Together | sv09 | Journey Together | 67 | Lillie's Ribombee | stamped |
| bulbapedia_card_page_release_info | finish_presence | sv9 | Journey Together | sv09 | Journey Together | 116 | N's Reshiram | stamped |
| bulbapedia_card_page_release_info | finish_presence | swsh35 | Champion's Path | swsh3.5 | Champion's Path | 18 | Hatenna | stamped |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 003 | Beedrill ex | normal |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 015 | Mega Pyroar ex | normal |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 022 | Mega Greninja ex | normal |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 035 | Mega Floette ex | normal |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 041 | Gourgeist ex | normal |
| cardtrader_blueprint_index | finish_presence | me4 | Chaos Rising | me04 | Chaos Rising | 048 | Mega Gallade ex | normal |

## Unresolved Samples

No unresolved evidence rows.

## Ambiguous Aliases

No ambiguous aliases detected.