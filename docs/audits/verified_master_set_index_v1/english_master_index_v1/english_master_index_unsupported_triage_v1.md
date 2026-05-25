# English Master Index Unsupported Triage V1

Generated: 2026-05-25T15:19:30.123Z

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Unsupported-by-current-index rows are not deletion authority. They must be split into source coverage gaps, alias/subset issues, and finish overgeneration candidates before any controlled set repair.

## Summary By Category

| category | count |
| --- | --- |
| holo_overgeneration_candidate | 3831 |
| invalid_or_unknown_card_number_review | 1 |
| modern_parallel_exact_finish_needs_source | 167 |
| modern_parallel_set_review | 524 |
| normal_variant_not_in_index_review | 20 |
| product_or_deck_set_source_coverage_gap | 1022 |
| promo_family_source_coverage_gap | 2676 |
| reverse_holo_overgeneration_candidate | 1253 |
| source_coverage_or_alias_gap | 84 |
| subset_or_numbering_alias_review | 852 |

## Summary By Set

| set_code | count |
| --- | --- |
| bp | 5 |
| bw1 | 110 |
| bw10 | 93 |
| bw11 | 85 |
| bw2 | 87 |
| bw3 | 89 |
| bw4 | 92 |
| bw5 | 102 |
| bw6 | 114 |
| bw7 | 133 |
| bw8 | 127 |
| bw9 | 107 |
| bwp | 303 |
| cel25 | 22 |
| col1 | 72 |
| dc1 | 28 |
| det1 | 18 |
| dpp | 58 |
| dv1 | 21 |
| ecard2 | 21 |
| ecard3 | 19 |
| ex10 | 1 |
| ex3 | 88 |
| fut20 | 9 |
| g1 | 109 |
| hsp | 25 |
| mcd11 | 12 |
| mcd12 | 12 |
| mcd14 | 12 |
| mcd15 | 12 |
| mcd16 | 24 |
| mcd17 | 12 |
| mcd18 | 12 |
| mcd19 | 12 |
| mcd22 | 6 |
| me01 | 4 |
| np | 54 |
| pop1 | 27 |
| pop2 | 14 |
| sm1 | 165 |
| sm10 | 209 |
| sm11 | 236 |
| sm115 | 63 |
| sm12 | 249 |
| sm2 | 154 |
| sm3 | 153 |
| sm3.5 | 66 |
| sm4 | 112 |
| sm5 | 160 |
| sm6 | 134 |
| sm7 | 165 |
| sm75 | 68 |
| sm8 | 215 |
| sm9 | 176 |
| sma | 282 |
| smp | 736 |
| sv02 | 4 |
| sv03 | 2 |
| sv03.5 | 1 |
| sv05 | 6 |
| sv10 | 5 |
| sv10.5b | 261 |
| sv10.5w | 263 |
| sv8pt5 | 167 |
| svp | 208 |
| swsh10tg | 30 |
| swsh11 | 4 |
| swsh11tg | 30 |
| swsh12 | 13 |
| swsh12.5 | 45 |
| swsh12tg | 47 |
| swsh45sv | 366 |
| swsh7 | 1 |
| swsh8 | 13 |
| swsh9 | 7 |
| swsh9tg | 46 |
| swshp | 505 |
| tk-bw-e | 60 |
| tk-bw-z | 60 |
| tk-dp-l | 22 |
| tk-dp-m | 24 |
| tk-ex-latia | 19 |
| tk-ex-latio | 19 |
| tk-ex-m | 23 |
| tk-ex-p | 23 |
| tk-hs-g | 2 |
| tk-hs-r | 2 |
| tk-sm-l | 36 |
| tk-sm-r | 38 |
| tk-xy-b | 60 |
| tk-xy-latia | 60 |
| tk-xy-latio | 60 |
| tk-xy-n | 60 |
| tk-xy-p | 60 |
| tk-xy-su | 60 |
| tk-xy-sy | 60 |
| tk-xy-w | 60 |
| xy0 | 69 |
| xy1 | 139 |
| xy10 | 121 |
| xy11 | 106 |
| xy12 | 105 |
| xy2 | 101 |
| xy3 | 105 |
| xy4 | 111 |
| xy5 | 146 |
| xy6 | 101 |
| xy7 | 92 |
| xy8 | 148 |
| xy9 | 118 |
| xyp | 642 |

## Summary By Finish

| finish | count |
| --- | --- |
| holo | 5898 |
| masterball | 67 |
| normal | 1309 |
| pokeball | 100 |
| reverse | 3056 |

## holo_overgeneration_candidate

Rows: 3831

### Top Sets

| set_code | count |
| --- | --- |
| sm11 | 174 |
| sm12 | 171 |
| sm8 | 153 |
| sm10 | 151 |
| sm9 | 123 |
| xy8 | 122 |
| sm1 | 119 |
| sm7 | 119 |
| xy1 | 116 |
| xy5 | 114 |
| sm5 | 112 |
| bw7 | 110 |
| bw8 | 108 |
| sm2 | 103 |
| bw1 | 100 |
| sm3 | 100 |
| bw6 | 98 |
| sm6 | 93 |
| xy10 | 93 |
| xy9 | 92 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| sm11 | 7 | Sewaddle | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 70 | Xurkitree | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 73 | Exeggcute | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 74 | Exeggutor | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 75 | Alolan Marowak | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 76 | Jynx | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 77 | Wynaut | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 8 | Swadloon | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 80 | Drifloon | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 81 | Drifblim | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 82 | Skorupi | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 84 | Mesprit | holo | normal, reverse, stamped | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 85 | Azelf | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| bw8 | 109 | Skitty | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| ex3 | 13 | Crawdaunt | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm1 | 102 | Spinda | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 10 | Venonat | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 100 | Tyrogue | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 101 | Hitmontop | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 104 | Crabrawler | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 11 | Venomoth | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 124 | Lairon | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 128 | Meltan | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 132 | Clefairy | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 137 | Togetic | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 14 | Weepinbell | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 105 | Crabominable | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 108 | Murkrow | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 110 | Carvanha | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 111 | Sharpedo | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 113 | Sandile | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 114 | Sandile | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 115 | Krokorok | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 116 | Krookodile | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 122 | Alolan Dugtrio | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 123 | Aron | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 125 | Aggron | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 127 | Genesect | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 131 | Cleffa | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 133 | Clefable | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 134 | Jigglypuff | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 135 | Wigglytuff | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm10 | 136 | Togepi | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 11 | Crustle | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 101 | Necrozma | holo | cracked_ice, normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 103 | Onix | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm11 | 206 | Reset Stamp | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm12 | 10 | Lileep | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm12 | 107 | Trapinch | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |
| sm12 | 11 | Cradily | holo | normal, reverse | The index knows this exact card identity but does not support Grookai's holo finish in this audit pass. |

## invalid_or_unknown_card_number_review

Rows: 1

### Top Sets

| set_code | count |
| --- | --- |
| ex10 | 1 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| ex10 | ? | Unown | normal | holo | Grookai card number is missing or unknown, so exact external matching is not possible. |

## modern_parallel_exact_finish_needs_source

Rows: 167

### Top Sets

| set_code | count |
| --- | --- |
| sv8pt5 | 167 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| sv8pt5 | 002 | Exeggutor | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 002 | Exeggutor | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 007 | Cottonee | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 007 | Cottonee | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 008 | Whimsicott | pokeball | holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 008 | Whimsicott | masterball | holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 025 | Glaceon | pokeball | cosmos, holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 025 | Glaceon | masterball | cosmos, holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 038 | Spritzee | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 038 | Spritzee | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 039 | Aromatisse | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 039 | Aromatisse | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 042 | Scream Tail | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 042 | Scream Tail | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 090 | Noibat | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 090 | Noibat | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 099 | Black Belt's Training | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 1 | Exeggcute | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 1 | Exeggcute | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 10 | Dipplin | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 10 | Dipplin | masterball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 100 | Briar | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 101 | Buddy-Buddy Poffin | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 102 | Bug Catching Set | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 103 | Carmine | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 104 | Ciphermaniac's Codebreaking | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 105 | Crispin | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 106 | Earthen Vessel | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 107 | Explorer's Guidance | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 108 | Festival Grounds | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 109 | Friends in Paldea | pokeball | normal, reverse, stamped | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 110 | Glass Trumpet | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 111 | Haban Berry | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 112 | Janine's Secret Art | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 113 | Kieran | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 114 | Lacey | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 115 | Larry's Skill | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 118 | Ogre's Mask | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 120 | Professor Sada's Vitality | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 121 | Professor Turo's Scenario | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 122 | Professor's Research | pokeball | normal, reverse, stamped | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 123 | Professor's Research | pokeball | normal, reverse, stamped | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 124 | Professor's Research | pokeball | normal, reverse, stamped | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 125 | Professor's Research | pokeball | normal, reverse, stamped | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 126 | Rescue Board | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 127 | Roto-Stick | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 13 | Flareon | pokeball | cosmos, holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 13 | Flareon | masterball | cosmos, holo, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 130 | Techno Radar | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |
| sv8pt5 | 15 | Litleo | pokeball | normal, reverse | Modern parallel finish exists in Grookai but the current index has no exact card-level support for this finish. |

## modern_parallel_set_review

Rows: 524

### Top Sets

| set_code | count |
| --- | --- |
| sv10.5w | 263 |
| sv10.5b | 261 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| sv10.5b | 007 | Lilligant | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 014 | Darmanitan | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 019 | Tympole | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 021 | Seismitoad | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 002 | Swadloon | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 010 | Virizion | normal | holo, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 012 | Pignite | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 002 | Servine | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 003 | Serperior ex | normal | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 024 | Alomomola | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 028 | Kyurem ex | reverse | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 031 | Eelektrik | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 016 | Litwick | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 005 | Simisage | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 009 | Karrablast | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 023 | Carracosta | normal | holo, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 005 | Whimsicott ex | reverse | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5w | 006 | Deerling | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 016 | Volcarona | normal | holo, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 017 | Panpour | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 028 | Kyurem ex | normal | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 036 | Musharna | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 040 | Elgyem | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 043 | Golurk | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 045 | Drilbur | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 059 | Krookodile | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 069 | Fraxure | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 072 | Tranquill | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 074 | Audino | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 108 | Alomomola | reverse | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 003 | Serperior ex | reverse | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 004 | Pansage | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 006 | Petilil | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 008 | Maractus | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 010 | Foongus | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 011 | Amoonguss | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 013 | Darumaka | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 015 | Larvesta | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 018 | Simipour | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 020 | Palpitoad | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 022 | Tirtouga | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 025 | Cubchoo | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 026 | Beartic | normal | holo, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 027 | Cryogonal | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 029 | Emolga | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 030 | Tynamo | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 032 | Eelektross | holo | normal, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 033 | Thundurus | normal | holo, reverse | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 034 | Zekrom ex | normal | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |
| sv10.5b | 034 | Zekrom ex | reverse | holo | Modern parallel-heavy set needs exact card-level parallel evidence before judging support. |

## normal_variant_not_in_index_review

Rows: 20

### Top Sets

| set_code | count |
| --- | --- |
| ecard2 | 4 |
| ecard3 | 4 |
| sv05 | 4 |
| swsh11 | 4 |
| me01 | 2 |
| sv03 | 1 |
| sv10 | 1 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| ecard3 | H4 | Beedrill | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard3 | H6 | Dewgong | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard2 | H2 | Arcanine | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard2 | H3 | Ariados | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard2 | H4 | Azumarill | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard2 | H8 | Entei | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard3 | H8 | Forretress | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| ecard3 | H9 | Gengar | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| me01 | 93 | Steelix | normal | reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| me01 | 095 | Dialga | normal | reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv03 | 072 | Toxtricity | normal | holo, reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv05 | 029 | Magcargo | normal | reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv05 | 034 | Incineroar ex | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv05 | 108 | Farigiraf ex | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv05 | 109 | Roaring Moon | normal | holo, reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| sv10 | 146 | Zamazenta | normal | holo, reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| swsh11 | 17 | Trevenant | normal | holo, reverse, stamped | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| swsh11 | 26 | Chandelure | normal | holo, reverse, stamped | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| swsh11 | 45 | Hisuian Basculegion | normal | holo, reverse | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |
| swsh11 | 93 | Aerodactyl VSTAR | normal | holo | The index knows this exact card identity but does not support Grookai's normal finish in this audit pass. |

## product_or_deck_set_source_coverage_gap

Rows: 1022

### Top Sets

| set_code | count |
| --- | --- |
| tk-bw-e | 60 |
| tk-bw-z | 60 |
| tk-xy-b | 60 |
| tk-xy-latia | 60 |
| tk-xy-latio | 60 |
| tk-xy-n | 60 |
| tk-xy-p | 60 |
| tk-xy-su | 60 |
| tk-xy-sy | 60 |
| tk-xy-w | 60 |
| np | 54 |
| tk-sm-r | 38 |
| tk-sm-l | 36 |
| pop1 | 27 |
| mcd16 | 24 |
| tk-dp-m | 24 |
| tk-ex-m | 23 |
| tk-ex-p | 23 |
| tk-dp-l | 22 |
| tk-ex-latia | 19 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| mcd22 | 4 | Growlithe | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| bp | 2 | Hitmonchan | normal | stamped | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd17 | 12 | Yungoos | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd17 | 2 | Grubbin | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 1 | Weedle | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 4 | Froakie | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 9 | Swirlix | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd16 | 6 | Pikachu | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd17 | 11 | Pikipek | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd18 | 10 | Chansey | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| bp | 1 | Electabuzz | normal | stamped | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| bp | 9 | Rocket's Hitmonchan | normal |  | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd17 | 7 | Crabrawler | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 2 | Chespin | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd18 | 3 | Horsea | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 8 | Snubbull | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| bp | 8 | Rocket's Mewtwo | normal |  | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd14 | 6 | Inkay | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd18 | 6 | Machop | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd19 | 3 | Magmar | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd15 | 1 | Treecko | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd15 | 5 | Mudkip | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd15 | 9 | Meditite | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 3 | Tepig | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 5 | Dewott | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 8 | Drilbur | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd16 | 12 | Eevee | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| np | 35 | Pikachu δ | reverse | holo, normal | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| tk-xy-w | 1 | Swirlix | holo | normal | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| bp | 3 | Professor Elm | normal |  | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 1 | Snivy | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 10 | Klink | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 11 | Pidove | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 12 | Audino | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 2 | Maractus | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 4 | Oshawott | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 5 | Alomomola | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 6 | Blitzle | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 7 | Munna | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 8 | Sandile | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd11 | 9 | Zorua | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 1 | Servine | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 10 | Scraggy | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 11 | Klang | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 12 | Axew | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 2 | Pansage | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 3 | Dwebble | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 4 | Pignite | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 6 | Emolga | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |
| mcd12 | 7 | Woobat | normal | holo | Product, deck, POP, McDonald's, or early promo rows need dedicated checklist/source coverage before judging support. |

## promo_family_source_coverage_gap

Rows: 2676

### Top Sets

| set_code | count |
| --- | --- |
| smp | 736 |
| xyp | 642 |
| swshp | 505 |
| bwp | 303 |
| sma | 282 |
| svp | 208 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| bwp | 15 | Pidove | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 19 | Zoroark | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 33 | Riolu | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 18 | Darumaka | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 75 | Metagross | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 84 | Porygon-Z | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 92 | Espeon | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 01 | Snivy | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 03 | Oshawott | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 06 | Snivy | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| xyp | 200 | M Sharpedo-EX | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 47 | Rayquaza-EX | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 08 | Oshawott | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 09 | Zoroark | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 10 | Axew | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 16 | Axew | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| bwp | 43 | Landorus | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| xyp | 177 | Karen | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| xyp | 67 | Jirachi | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| xyp | 152 | Zygarde | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| sma | 56 | Greninja-GX | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 233 | Eevee-GX | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 248 | Pikachu & Zekrom-GX | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| sma | 41 | Eevee | normal |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| xyp | 200 | M Sharpedo-EX | reverse |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 01 | Rowlet | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 02 | Litten | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 03 | Popplio | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 04 | Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 07 | Pikipek | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 08 | Litten | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 09 | Togedemaru | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 105 | Lycanroc | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 106 | Dawn Wings Necrozma | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 107 | Dusk Mane Necrozma | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 108 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 109 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 11 | Bruxish | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 110 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 111 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 112 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 113 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 114 | Ash's Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 115 | Pheromosa | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 116 | Xurkitree | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 117 | Malamar | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 118 | Lycanroc | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 162 | Pikachu | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 164 | Deoxys | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |
| smp | 165 | Ultra Necrozma | holo |  | Promo-family rows often require product/checklist evidence beyond structured API coverage before judging support. |

## reverse_holo_overgeneration_candidate

Rows: 1253

### Top Sets

| set_code | count |
| --- | --- |
| sm12 | 78 |
| sm11 | 62 |
| sm8 | 62 |
| sm10 | 58 |
| sm3 | 53 |
| sm9 | 53 |
| sm2 | 51 |
| sm5 | 48 |
| sm1 | 46 |
| sm7 | 46 |
| sm6 | 41 |
| xy0 | 39 |
| sm4 | 32 |
| xy5 | 32 |
| xy12 | 30 |
| xy10 | 28 |
| xy7 | 28 |
| xy8 | 26 |
| xy9 | 26 |
| xy6 | 25 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| sm11 | 71 | Mewtwo & Mew-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm11 | 72 | Espeon & Deoxys-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm11 | 78 | Latios-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm11 | 79 | Jirachi-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 101 | Gyarados-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 104 | Buzzwole-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 108 | Silvally-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 112 | Gyarados-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 113 | Alolan Golem-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 118 | Alolan Exeggutor-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 119 | Silvally-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm4 | 120 | Counter Catcher | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy2 | 104 | Lysandre | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy2 | 105 | Pokémon Center Lady | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy2 | 106 | Pokémon Fan Club | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy3 | 109 | Battle Reporter | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy8 | 104 | Florges BREAK | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 100 | M Gallade-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 101 | Latios-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 102 | M Latios-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 107 | Wally | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 108 | Winona | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 95 | Scoop Up Cyclone | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw1 | 107 | Water Energy | reverse | normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy3 | 55 | M Lucario-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw1 | 115 | Pikachu | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 101 | Iris | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 65 | Dialga-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw1 | 105 | Grass Energy | reverse | normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 100 | Palkia-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy6 | 77 | Shaymin-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 94 | Master Ball | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 96 | Virizion-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw1 | 106 | Fire Energy | reverse | normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw4 | 103 | Hydreigon | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| xy4 | 24 | M Manectric-EX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw1 | 111 | Darkness Energy | reverse | normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| bw10 | 104 | Dusknoir | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| fut20 | 2 | Eevee on the Ball | reverse | normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| fut20 | 3 | Grookey on the Ball | reverse | normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| fut20 | 4 | Scorbunny on the Ball | reverse | normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| fut20 | 5 | Sobble on the Ball | reverse | normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm10 | 107 | Greninja & Zoroark-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm10 | 208 | Celesteela-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 14 | Starmie-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 16 | Gyarados-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 20 | Raichu-GX | reverse | holo, normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 31 | Mewtwo-GX | reverse | holo, normal, stamped | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 36 | Onix-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |
| sm115 | 42 | Wigglytuff-GX | reverse | holo, normal | The index knows this exact card identity but does not support Grookai's reverse finish in this audit pass. |

## source_coverage_or_alias_gap

Rows: 84

### Top Sets

| set_code | count |
| --- | --- |
| dpp | 58 |
| hsp | 25 |
| me01 | 1 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| hsp | 18 | Tropical Tidal Wave | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| me01 | 104 | Mega Kangaskhan ex | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| hsp | 04 | Wobbuffet | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 01 | Turtwig | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 02 | Chimchar | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 03 | Piplup | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 04 | Pachirisu | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 05 | Tropical Wind | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 06 | Buneary | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 07 | Cranidos | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 08 | Shieldon | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 09 | Torterra LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 10 | Infernape LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 11 | Empoleon LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 12 | Lucario LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 13 | Buizel | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 14 | Chatot | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 15 | Shinx | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 16 | Pikachu | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 17 | Dialga LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 18 | Palkia LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 19 | Darkrai LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 20 | Magmortar | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 21 | Raichu | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 22 | Mime Jr. | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 23 | Glameow | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 24 | Darkrai | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 24 | Darkrai | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 25 | Tropical Wind | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 26 | Dialga | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 27 | Palkia | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 28 | Mewtwo LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 29 | Rhyperior LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 30 | Regigigas LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 31 | Heatran LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 32 | Magnezone | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 33 | Dusknoir | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 34 | Drifblim | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 35 | Porygon-Z | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 36 | Gliscor | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 37 | Dialga LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 38 | Giratina LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 39 | Shaymin LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 40 | Regigigas | normal |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 40 | Regigigas | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 41 | Toxicroak G | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 42 | Carnivine G | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 43 | Probopass G | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 44 | Magnezone | holo |  | No exact card identity fact was found in the current index for this Grookai row. |
| dpp | 45 | Charizard G LV.X | holo |  | No exact card identity fact was found in the current index for this Grookai row. |

## subset_or_numbering_alias_review

Rows: 852

### Top Sets

| set_code | count |
| --- | --- |
| swsh45sv | 366 |
| g1 | 109 |
| bw11 | 85 |
| col1 | 72 |
| swsh12tg | 47 |
| swsh9tg | 46 |
| swsh12.5 | 45 |
| swsh10tg | 30 |
| swsh11tg | 30 |
| cel25 | 22 |

### Sample Rows

| set | number | Grookai name | finish | known index finishes | reason |
| --- | --- | --- | --- | --- | --- |
| swsh12tg | 11 | Altaria | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 28 | Sordward & Shielbert | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 24 | Gordie | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 27 | Raihan | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 29 | Rayquaza VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 30 | Duraludon VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 10 | Smeargle | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 13 | Serperior V | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 15 | Blaziken VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 16 | Zeraora V | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 17 | Mawile V | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 18 | Corviknight V | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 19 | Corviknight VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 20 | Rayquaza VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 21 | Duraludon VMAX | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 26 | Professor Burnet | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 22 | Blissey V | normal |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 97 | Xerneas-EX | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 4 | Charizard | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 88 | Mew ex | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 15 | Venusaur | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 2 | Blastoise | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 20 | Cleffa | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 54 | Mewtwo-EX | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 60 | Tapu Lele-GX | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 76 | M Rayquaza-EX | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 114 | Zekrom | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 17 | Umbreon ★ | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 93 | Gardevoir ex δ | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| cel25 | 109 | Luxray GL LV.X | normal | holo | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 02 | Milotic | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 03 | Flaaffy | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 04 | Jynx | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 05 | Gardevoir | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 06 | Malamar | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 08 | Passimian | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 12 | Kricketune V | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 14 | Blaziken V | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 23 | Friends in Galar | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh12tg | 25 | Judge | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 19 | Gallade V | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 23 | Adventurer's Discovery | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 24 | Boss's Orders | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 25 | Cook | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 26 | Kabu | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 27 | Nessa | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 28 | Opal | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 29 | Pikachu VMAX | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh11tg | 30 | Mew VMAX | holo |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
| swsh45sv | 031 | Arrokuda | reverse |  | Subset, gallery, or number-collision family needs set/subset identity resolution before judging printing support. |
