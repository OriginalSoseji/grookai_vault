# English Master Index Grookai Audit V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Grookai printing rows read: 59614
Index printing facts: 38932

## Status Summary

| status | count |
| --- | --- |
| human_source_verified_by_index | 17 |
| master_verified_by_index | 36651 |
| missing_from_grookai | 4564 |
| name_mismatch_needs_review | 176 |
| set_unmapped | 10462 |
| unsupported_by_current_index | 12308 |

## Status By Finish

| status | finish | count |
| --- | --- | --- |
| human_source_verified_by_index | cosmos | 1 |
| human_source_verified_by_index | holo | 1 |
| human_source_verified_by_index | normal | 15 |
| master_verified_by_index | cosmos | 350 |
| master_verified_by_index | cracked_ice | 127 |
| master_verified_by_index | holo | 7418 |
| master_verified_by_index | normal | 15353 |
| master_verified_by_index | pokeball | 130 |
| master_verified_by_index | reverse | 13263 |
| master_verified_by_index | rocket_reverse | 10 |
| missing_from_grookai | cosmos | 25 |
| missing_from_grookai | cracked_ice | 4 |
| missing_from_grookai | first_edition_holo | 180 |
| missing_from_grookai | first_edition_normal | 762 |
| missing_from_grookai | holo | 1876 |
| missing_from_grookai | normal | 252 |
| missing_from_grookai | reverse | 74 |
| missing_from_grookai | stamped | 1391 |
| name_mismatch_needs_review | holo | 77 |
| name_mismatch_needs_review | normal | 30 |
| name_mismatch_needs_review | reverse | 69 |
| set_unmapped | holo | 3497 |
| set_unmapped | normal | 3451 |
| set_unmapped | reverse | 3514 |
| unsupported_by_current_index | cosmos | 38 |
| unsupported_by_current_index | cracked_ice | 4 |
| unsupported_by_current_index | holo | 6738 |
| unsupported_by_current_index | masterball | 67 |
| unsupported_by_current_index | normal | 2328 |
| unsupported_by_current_index | pokeball | 100 |
| unsupported_by_current_index | reverse | 3033 |

## Issue Sample

| set | number | name | finish | status | note |
| --- | --- | --- | --- | --- | --- |
| mcd22 | 4 | Growlithe | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| legacy_orphan | 48 | Raikou | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| me03 | 080 | Poke Ball | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| me03 | 081 | Poke Pad | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| me03 | 082 | Pokemon Catcher | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| B1 | 194 | Delcatty | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 205 | Braviary | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 266 | Marlon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 295 | Poliwag | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 117 | Swirlix | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| swsh12tg | 11 | Altaria | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 28 | Sordward & Shielbert | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 24 | Gordie | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 27 | Raihan | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 29 | Rayquaza VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 30 | Duraludon VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 071 | Froakie | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| swsh12tg | 10 | Smeargle | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 13 | Serperior V | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 15 | Blaziken VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 16 | Zeraora V | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 17 | Mawile V | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 18 | Corviknight V | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 19 | Corviknight VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 20 | Rayquaza VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 21 | Duraludon VMAX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 26 | Professor Burnet | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 22 | Blissey V | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| legacy_orphan | 80 | Marshadow | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| legacy_orphan | 24 | Pyroar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| legacy_orphan | 68 | Sandshrew | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| legacy_orphan | 74 | Lunatone | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| legacy_orphan | 95 | Dialga | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| legacy_orphan | 5 | Exeggutor | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| cel25c | 97 | Xerneas-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 4 | Charizard | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| dp1 | 120 | Empoleon LV.X | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 193 | Skitty | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bwp | 15 | Pidove | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 19 | Zoroark | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 33 | Riolu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 18 | Darumaka | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 75 | Metagross | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 84 | Porygon-Z | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 92 | Espeon | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A4 | 055 | Remoraid | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 059 | Suicune | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 054 | Corsola | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 056 | Octillery | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 057 | Delibird | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| hsp | 18 | Tropical Tidal Wave | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A4 | 078 | Togepi | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 082 | Xatu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 076 | Jynx | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 101 | Tyrogue | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 103 | Larvitar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 127 | Klang | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 147 | Stantler | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 156 | Will | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 219 | Heavy Helmet | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 193 | Umbreon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bwp | 01 | Snivy | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 03 | Oshawott | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 06 | Snivy | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| g1 | 26 | Floral Crown | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 19 | Charizard | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2b | 085 | Paldean Clodsire ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 086 | Tinkaton ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 087 | Bibarel ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 088 | Iono | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 089 | Pokémon Center Lady | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 090 | Red | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 091 | Team Rocket Grunt | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 093 | Paldean Clodsire ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 071 | Red | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 073 | Meowscarada | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 074 | Buizel | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 075 | Tatsugiri | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 076 | Grafaiai | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 077 | Gholdengo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 078 | Wigglytuff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 079 | Beedrill ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 080 | Charizard ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 091 | Snorlax ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 092 | Eevee ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 093 | Pinsir | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 094 | Lapras | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 095 | Voltorb | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 089 | Sylveon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 096 | Electrode | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 097 | Ralts | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 098 | Kirlia | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 099 | Gardevoir | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 044 | Sableye | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 038 | Barboach | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 046 | Liepard | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 084 | Snorlax ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 085 | Hau | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 086 | Penny | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 088 | Primarina ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 082 | Dragonite ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 090 | Dragonite ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 100 | Ekans | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 101 | Arbok | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 102 | Farfetch'd | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 104 | Articuno ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 105 | Zapdos ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 106 | Gallade ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 107 | Eevee Bag | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 022 | Milotic | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 023 | Mantyke | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 024 | Cryogonal | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 026 | Tynamo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 027 | Eelektrik | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 028 | Eelektross | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 031 | Boltund | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 032 | Misdreavus | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 033 | Mismagius | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 029 | Clefairy | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 040 | Pupitar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 052 | Toxicroak | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 060 | Origin Forme Dialga | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 075 | Adaman | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 081 | Shaymin | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 002 | Burmy | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 003 | Mothim | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 004 | Combee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 005 | Vespiquen | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| sm11 | 7 | Sewaddle | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2a | 020 | Snover | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 031 | Gastly | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 042 | Nosepass | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 053 | Magnemite | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2a | 064 | Hoothoot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| sm11 | 70 | Xurkitree | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm11 | 71 | Mewtwo & Mew-GX | reverse | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm11 | 72 | Espeon & Deoxys-GX | reverse | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1a | 002 | Exeggutor | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 024 | Cramorant | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 049 | Koffing | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 050 | Weezing | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 051 | Purrloin | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 052 | Liepard | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 053 | Venipede | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 054 | Whirlipede | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 056 | Druddigon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 057 | Pidgey | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 059 | Pidgeot ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 060 | Tauros | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 061 | Eevee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 062 | Chatot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 063 | Old Amber | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| pgo | 28 | Pikachu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| svp | 137 | Horsea | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| svp | 21 | Murkrow | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 210 | Bulbasaur | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 211 | Ivysaur | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 213 | Exeggcute | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 215 | Squirtle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 216 | Wartortle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 217 | Blastoise | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 218 | Staryu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 219 | Starmie | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 220 | Gastly | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 221 | Haunter | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 222 | Gengar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 223 | Machop | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 224 | Machoke | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 225 | Machamp | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 226 | Cubone | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 203 | Lickilicky ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 044 | Snover | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 149 | Ilima | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 050 | Manaphy | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 051 | Magnemite | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 052 | Magneton | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 080 | Rhyhorn | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 096 | Murkrow | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 099 | Weavile ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 100 | Poochyena | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 101 | Mightyena | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 098 | Sneasel | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 107 | Croagunk | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 184 | Mismagius ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 191 | Team Galactic Grunt | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 185 | Gallade ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 186 | Weavile ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 187 | Darkrai ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 019 | Carnivine | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 015 | Burmy | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 018 | Vespiquen | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 033 | Mamoswine | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 074 | Marshadow | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 075 | Celebi ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 076 | Gyarados ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 077 | Mew ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 078 | Aerodactyl ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 079 | Pidgeot ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 081 | Blue | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 083 | Mew ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 084 | Aerodactyl ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 085 | Celebi ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 086 | Mew ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1a | 001 | Exeggcute | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 191 | Spearow | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2 | 177 | Bidoof | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 041 | Arcanine ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 084 | Articuno ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| xyp | 200 | M Sharpedo-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2b | 058 | Rattata | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 059 | Raticate | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 060 | Jigglypuff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 061 | Wigglytuff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 062 | Lickitung | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 063 | Lickilicky | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 061 | Audino | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 062 | Minccino | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 063 | Cinccino | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 064 | Skwovet | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 065 | Greedent | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 066 | Eevee Bag | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 060 | Chatot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 068 | Hau | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 069 | Penny | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 177 | Goomy | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4a | 067 | Inflatable Boat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw4 | 41 | Zapdos | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2 | 035 | Piplup | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 206 | Eevee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 264 | Marowak ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 139 | Crabrawler | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 302 | Zapdos | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bp | 2 | Hitmonchan | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2a | 073 | Celestic Town Elder | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| mcd17 | 12 | Yungoos | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd17 | 2 | Grubbin | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1 | 091 | Bruxish | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| exu | ? | Unown | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 88 | Mew ex | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 15 | Venusaur | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 2 | Blastoise | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 20 | Cleffa | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 54 | Mewtwo-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 60 | Tapu Lele-GX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 76 | M Rayquaza-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 114 | Zekrom | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd14 | 1 | Weedle | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd14 | 4 | Froakie | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 211 | Wooloo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw1 | 26 | Reshiram | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd14 | 9 | Swirlix | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd16 | 6 | Pikachu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd17 | 11 | Pikipek | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd18 | 10 | Chansey | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bp | 1 | Electabuzz | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| basep | 13 | Venusaur | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 036 | Salazzle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 030 | Litten | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw4 | 27 | Articuno | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw4 | 33 | Vanilluxe | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 073 | Lunatone | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw7 | 94 | Scizor | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 074 | Shuppet | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| cel25c | 17 | Umbreon ★ | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25c | 93 | Gardevoir ex δ | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 099 | Rockruff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 100 | Lycanroc | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 101 | Lycanroc | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 102 | Mudbray | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 103 | Mudsdale | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 104 | Passimian ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 105 | Minior | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 106 | Alolan Rattata | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw5 | 90 | Tornadus-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw6 | 46 | Mew-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 288 | Weepinbell | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bwp | 47 | Rayquaza-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| legacy_orphan | 84 | Garganacl | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw11 | 11 | Meloetta-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 2 | Servine | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 8 | Ralts | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw11 | 17 | Audino | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bwp | 08 | Oshawott | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 09 | Zoroark | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 10 | Axew | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 16 | Axew | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1 | 134 | Swoobat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| cel25c | 109 | Luxray GL LV.X | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| g1 | 6 | Flareon-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bp | 9 | Rocket's Hitmonchan | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| ecard3 | H4 | Beedrill | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| ecard3 | H6 | Dewgong | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw6 | 67 | Gigalith | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw7 | 138 | Crystal Edge | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm11 | 57 | Alolan Raichu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm8 | 48 | Heatran | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm8 | 180 | Life Forest ◇ | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| dp2 | 124 | Time-Space Distortion | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd17 | 7 | Crabrawler | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| g1 | 32 | Sylveon-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 9 | Raichu | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 22 | Diancie | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 11 | Wobbuffet | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw3 | 74 | Landorus | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A4 | 075 | Smoochum | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw6 | 19 | Ninetales | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A4 | 225 | Nidoqueen | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| np | 12 | Pikachu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw6 | 103 | Slaking | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1 | 245 | Pidgeot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| swsh12tg | 02 | Milotic | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 257 | Jolteon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 010 | Shiftry | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| swsh12tg | 03 | Flaaffy | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm10 | 157 | Porygon-Z | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 04 | Jynx | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 05 | Gardevoir | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 06 | Malamar | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 08 | Passimian | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 12 | Kricketune V | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 14 | Blaziken V | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 23 | Friends in Galar | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 25 | Judge | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 171 | Doublade | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 217 | Dome Fossil | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 138 | Pancham | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 166 | Ferroseed | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 001 | Oddish | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 002 | Gloom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 003 | Bellossom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 004 | Tangela | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 005 | Tangrowth | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 006 | Scyther | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 007 | Pinsir | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 008 | Chikorita | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 009 | Bayleef | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 011 | Ledyba | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 036 | Darmanitan | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 037 | Heatmor | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 038 | Poliwag | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 098 | Mamoswine | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 222 | Primeape | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 223 | Nidoran♀ | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A4 | 224 | Nidorina | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| sm115 | 18 | Vaporeon | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm115 | 63 | Misty's Water Command | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A2b | 003 | Beedrill ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 017 | Floatzel | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 072 | Team Rocket Grunt | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 092 | Pikachu ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 106 | Revavroom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 001 | Weedle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 002 | Kakuna | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 004 | Pinsir | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 005 | Sprigatito | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 006 | Floragato | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 007 | Meowscarada | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 008 | Charmander | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 009 | Charmeleon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 010 | Charizard ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 011 | Magmar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 012 | Magmortar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 013 | Paldean Tauros | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 014 | Tentacool | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 015 | Tentacruel | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 016 | Buizel | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 018 | Wiglett | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 019 | Wugtrio ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 020 | Dondozo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 021 | Tatsugiri | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 022 | Pikachu ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 023 | Voltorb | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 024 | Electrode | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 025 | Pachirisu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 026 | Pawmi | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 027 | Pawmo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 028 | Pawmot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 029 | Abra | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 030 | Kadabra | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 031 | Alakazam | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 032 | Mr. Mime | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 033 | Drifloon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 034 | Drifblim | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 035 | Giratina ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 036 | Gimmighoul | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 037 | Machop | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 038 | Machoke | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 039 | Machamp | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 040 | Hitmonlee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 041 | Hitmonchan | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 042 | Riolu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 043 | Lucario ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 044 | Flamigo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 045 | Ekans | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 046 | Arbok | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 047 | Paldean Wooper | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 048 | Paldean Clodsire ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 049 | Spiritomb | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 050 | Shroodle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 051 | Grafaiai | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 052 | Tinkatink | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 053 | Tinkatuff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 054 | Tinkaton ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 055 | Varoom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 056 | Revavroom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 057 | Gholdengo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 064 | Bidoof | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 065 | Bibarel ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 066 | Buneary | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 067 | Lopunny | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 068 | Cyclizar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 069 | Iono | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 070 | Pokémon Center Lady | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 081 | Wugtrio ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 082 | Pikachu ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 083 | Giratina ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 084 | Lucario ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 094 | Tinkaton ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 095 | Bibarel ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 096 | Giratina ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 099 | Charmander | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 100 | Charmeleon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 101 | Wiglett | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 102 | Dondozo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 103 | Pachirisu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 104 | Riolu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 105 | Varoom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 107 | Beedrill ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 108 | Charizard ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 109 | Wugtrio ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 110 | Lucario ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 111 | Poké Ball | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 098 | Kakuna | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A2b | 097 | Weedle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 009 | Flareon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 036 | Milcery | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 087 | Flareon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 103 | Moltres ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 002 | Leafeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 001 | Tropius | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 004 | Steenee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 005 | Tsareena | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 006 | Applin | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 007 | Appletun | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 008 | Flareon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 003 | Bounsweet | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 010 | Torkoal | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 011 | Litten | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 012 | Torracat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 013 | Incineroar | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 014 | Salandit | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 015 | Salazzle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 016 | Vaporeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 022 | Popplio | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 019 | Vanillish | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 021 | Alomomola | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 017 | Glaceon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 018 | Vanillite | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 020 | Vanilluxe | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 024 | Primarina ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 025 | Jolteon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 026 | Joltik | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 027 | Galvantula | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 028 | Espeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 029 | Woobat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 023 | Brionne | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 030 | Swoobat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 031 | Swirlix | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 032 | Slurpuff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 033 | Sylveon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 034 | Sylveon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 035 | Mimikyu | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 037 | Alcremie | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 039 | Whiscash | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 040 | Mienfoo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 041 | Mienshao | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 042 | Carbink | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 043 | Umbreon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 047 | Mawile | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 048 | Togedemaru | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 049 | Meltan | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 050 | Melmetal | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 051 | Dratini | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 045 | Purrloin | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 052 | Dragonair | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 053 | Dragonite ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 054 | Drampa | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 055 | Eevee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 056 | Eevee ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 057 | Snorlax ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 058 | Aipom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 059 | Ambipom | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 070 | Leafeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 071 | Flareon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 072 | Vaporeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 073 | Glaceon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 067 | Leftovers | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 074 | Jolteon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 075 | Espeon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3b | 076 | Sylveon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |

Important: `unsupported_by_current_index` is not deletion authority. It means the current index did not support the row in this audit pass.
