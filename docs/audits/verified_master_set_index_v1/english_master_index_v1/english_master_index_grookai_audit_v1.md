# English Master Index Grookai Audit V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Grookai printing rows read: 55266
Index printing facts: 41434

## Status Summary

| status | count |
| --- | --- |
| candidate_unconfirmed_by_index | 3752 |
| human_source_verified_by_index | 85 |
| master_verified_by_index | 29653 |
| missing_from_grookai | 8399 |
| name_mismatch_needs_review | 170 |
| set_unmapped | 11176 |
| unsupported_by_current_index | 10430 |

## Status By Finish

| status | finish | count |
| --- | --- | --- |
| candidate_unconfirmed_by_index | holo | 766 |
| candidate_unconfirmed_by_index | normal | 2957 |
| candidate_unconfirmed_by_index | reverse | 29 |
| human_source_verified_by_index | holo | 54 |
| human_source_verified_by_index | normal | 20 |
| human_source_verified_by_index | reverse | 11 |
| master_verified_by_index | cosmos | 7 |
| master_verified_by_index | holo | 6076 |
| master_verified_by_index | normal | 11797 |
| master_verified_by_index | pokeball | 130 |
| master_verified_by_index | reverse | 11633 |
| master_verified_by_index | rocket_reverse | 10 |
| missing_from_grookai | cosmos | 316 |
| missing_from_grookai | cracked_ice | 131 |
| missing_from_grookai | first_edition_holo | 164 |
| missing_from_grookai | first_edition_normal | 940 |
| missing_from_grookai | holo | 2379 |
| missing_from_grookai | normal | 1722 |
| missing_from_grookai | reverse | 1406 |
| missing_from_grookai | stamped | 1341 |
| name_mismatch_needs_review | holo | 62 |
| name_mismatch_needs_review | normal | 57 |
| name_mismatch_needs_review | reverse | 51 |
| set_unmapped | holo | 3807 |
| set_unmapped | normal | 3637 |
| set_unmapped | reverse | 3732 |
| unsupported_by_current_index | holo | 5898 |
| unsupported_by_current_index | masterball | 67 |
| unsupported_by_current_index | normal | 1309 |
| unsupported_by_current_index | pokeball | 100 |
| unsupported_by_current_index | reverse | 3056 |

## Issue Sample

| set | number | name | finish | status | note |
| --- | --- | --- | --- | --- | --- |
| mcd22 | 4 | Growlithe | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm11 | 255 | U-Turn Board | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym1 | 67 | Brock's Mankey | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym2 | 62 | Blaine's Growlithe | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym2 | 80 | Koga's Pidgey | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| legacy_orphan | 48 | Raikou | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| me03 | 080 | Poke Ball | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| me03 | 081 | Poke Pad | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| me03 | 082 | Pokemon Catcher | reverse | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| neo3 | 43 | Farfetch'd | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| B1 | 194 | Delcatty | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 205 | Braviary | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 266 | Marlon | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 295 | Poliwag | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| neo3 | 53 | Slugma | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| cel25 | 97 | Xerneas-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 4 | Charizard | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| dp1 | 120 | Empoleon LV.X | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
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
| base2 | 47 | Tauros | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 29 | Dark Slowbro | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 57 | Grimer | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bwp | 01 | Snivy | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 03 | Oshawott | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 06 | Snivy | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm1 | 110 | Gumshoos-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| g1 | 26 | Floral Crown | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 19 | Charizard | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| base2 | 22 | Mr. Mime | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym1 | 109 | Erika's Maids | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym1 | 26 | Erika's Victreebel | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 24 | Pidgeot | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| sm11 | 71 | Mewtwo & Mew-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm11 | 71 | Mewtwo & Mew-GX | reverse | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm11 | 72 | Espeon & Deoxys-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| pgo | 28 | Pikachu | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm2 | 152 | Vikavolt-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| svp | 137 | Horsea | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| svp | 21 | Murkrow | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| ex5.5 | 1 | Treecko | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| ex5.5 | 2 | Wurmple | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| base3 | 40 | Omastar | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| base3 | 52 | Omanyte | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A2 | 177 | Bidoof | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| gym2 | 39 | Erika's Bulbasaur | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| bw4 | 100 | Emboar | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw4 | 41 | Zapdos | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A2 | 035 | Piplup | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 206 | Eevee | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A1 | 264 | Marowak ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 139 | Crabrawler | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| B1 | 302 | Zapdos | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bp | 2 | Hitmonchan | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| ex5.5 | 4 | Mudkip | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A2a | 073 | Celestic Town Elder | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| mcd17 | 12 | Yungoos | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd17 | 2 | Grubbin | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1 | 091 | Bruxish | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| ex10 | ? | Unown | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw11 | 101 | White Kyurem-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm1 | 147 | Lillie | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| cel25 | 88 | Mew ex | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 15 | Venusaur | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 2 | Blastoise | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 20 | Cleffa | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 54 | Mewtwo-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 60 | Tapu Lele-GX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 76 | M Rayquaza-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 114 | Zekrom | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd14 | 1 | Weedle | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd14 | 4 | Froakie | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 211 | Wooloo | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw1 | 26 | Reshiram | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| mcd14 | 9 | Swirlix | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd16 | 6 | Pikachu | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd17 | 11 | Pikipek | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| mcd18 | 10 | Chansey | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bp | 1 | Electabuzz | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| base2 | 30 | Victreebel | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 44 | Rapidash | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 49 | Bellsprout | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 19 | Dark Arbok | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 21 | Dark Charizard | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 34 | Dark Electrode | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 36 | Dark Gloom | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 43 | Dark Primeape | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 52 | Diglett | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 61 | Mankey | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 64 | Ponyta | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 69 | Voltorb | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| basep | 11 | Eevee | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| basep | 13 | Venusaur | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw3 | 100 | Cobalion | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw4 | 103 | Hydreigon | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A3 | 036 | Salazzle | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 030 | Litten | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw4 | 27 | Articuno | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw4 | 33 | Vanilluxe | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw5 | 103 | Entei-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A3 | 073 | Lunatone | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw7 | 94 | Scizor | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A3 | 074 | Shuppet | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| cel25 | 17 | Umbreon ★ | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| cel25 | 93 | Gardevoir ex δ | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A3 | 099 | Rockruff | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 100 | Lycanroc | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 101 | Lycanroc | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 102 | Mudbray | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 103 | Mudsdale | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 104 | Passimian ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 105 | Minior | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| A3 | 106 | Alolan Rattata | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw5 | 90 | Tornadus-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw6 | 46 | Mew-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| B1 | 288 | Weepinbell | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bwp | 47 | Rayquaza-EX | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| legacy_orphan | 84 | Garganacl | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| base2 | 25 | Pinsir | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 26 | Scyther | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 54 | Jigglypuff | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base5 | 22 | Dark Dragonite | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw11 | 11 | Meloetta-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 2 | Servine | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 8 | Ralts | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 17 | Audino | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| base5 | 24 | Dark Golbat | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bwp | 08 | Oshawott | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 09 | Zoroark | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 10 | Axew | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bwp | 16 | Axew | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| A1 | 134 | Swoobat | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| cel25 | 109 | Luxray GL LV.X | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| g1 | 6 | Flareon-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw8 | 48 | Zapdos-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bp | 9 | Rocket's Hitmonchan | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| ecard3 | H4 | Beedrill | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| ecard3 | H6 | Dewgong | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| bw6 | 123 | Rayquaza-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw6 | 67 | Gigalith | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm7 | 161 | Apricorn Maker | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm7 | 168 | Underground Expedition | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw7 | 138 | Crystal Edge | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw7 | 150 | Golurk | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm11 | 57 | Alolan Raichu | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm5 | 165 | Palkia-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm8 | 22 | Sceptile-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm8 | 48 | Heatran | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm8 | 60 | Suicune-GX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm8 | 180 | Life Forest ◇ | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| dp2 | 124 | Time-Space Distortion | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| mcd17 | 7 | Crabrawler | normal | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| g1 | 32 | Sylveon-EX | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 9 | Raichu | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 22 | Diancie | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| g1 | 11 | Wobbuffet | normal | name_mismatch_needs_review | Set, number, and finish matched the index, but card name did not match exactly. |
| bw11 | 102 | Lugia-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| base2 | 32 | Wigglytuff | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw3 | 102 | Meowth | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw3 | 74 | Landorus | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw4 | 101 | Chandelure | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw4 | 102 | Zoroark | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A4 | 075 | Smoochum | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw6 | 19 | Ninetales | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| gym1 | 36 | Blaine's Kangaskhan | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| neo1 | 100 | Double Gust | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A4 | 225 | Nidoqueen | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| gym1 | 42 | Erika's Dratini | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| np | 12 | Pikachu | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| bw6 | 103 | Slaking | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| A1 | 245 | Pidgeot | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw8 | 14 | Moltres-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| swsh12tg | 02 | Milotic | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| B1 | 257 | Jolteon ex | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| bw11 | 100 | Black Kyurem-EX | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| B1 | 010 | Shiftry | normal | set_unmapped | Grookai set_code was not present in the current English Master Index source set map. |
| swsh12tg | 03 | Flaaffy | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| sm10 | 157 | Porygon-Z | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| swsh12tg | 04 | Jynx | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 05 | Gardevoir | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 06 | Malamar | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 08 | Passimian | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 12 | Kricketune V | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 14 | Blaziken V | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 23 | Friends in Galar | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| swsh12tg | 25 | Judge | holo | unsupported_by_current_index | No exact printing fact exists in the current index. This is audit evidence only and is not deletion authority. |
| neo2 | 37 | Corsola | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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
| sm115 | 18 | Vaporeon | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm115 | 63 | Misty's Water Command | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
| sm115 | 67 | Giovanni's Exile | normal | candidate_unconfirmed_by_index | Exact set, number, name, and finish matched the current index. |
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

Important: `unsupported_by_current_index` is not deletion authority. It means the current index did not support the row in this audit pass.
