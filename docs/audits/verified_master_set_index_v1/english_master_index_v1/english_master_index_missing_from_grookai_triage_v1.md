# English Master Index Missing From Grookai Triage V1

Generated: 2026-05-24T14:33:16.250Z

Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.

Missing-from-Grookai rows are not insertion authority. Only controlled per-set proof loops may create repair candidates.

## Summary By Category

| category | count |
| --- | --- |
| api_agreed_missing_needs_human_source | 420 |
| first_edition_policy_gap | 1091 |
| product_or_deck_set_source_only_candidate | 74 |
| promo_family_source_only_candidate | 1523 |
| source_only_candidate_missing | 2382 |
| subset_alias_or_numbering_gap | 590 |

## Summary By Index Status

| index_status | count |
| --- | --- |
| api_agreed | 420 |
| candidate_unconfirmed | 5660 |

## Summary By Source Count

| source_count | count |
| --- | --- |
| 1 | 5660 |
| 2 | 420 |

## Summary By Set

| set_key | count |
| --- | --- |
| 2023sv | 15 |
| 2024sv | 15 |
| base1 | 102 |
| base2 | 80 |
| base3 | 77 |
| base4 | 1 |
| base5 | 101 |
| basep | 4 |
| bw11 | 61 |
| bw6 | 2 |
| bwp | 187 |
| cel25c | 25 |
| col1 | 28 |
| dp1 | 9 |
| dp2 | 10 |
| dp3 | 3 |
| dp4 | 4 |
| dp5 | 4 |
| dp6 | 7 |
| dp7 | 15 |
| dpp | 77 |
| ecard2 | 45 |
| ecard3 | 33 |
| ex1 | 8 |
| ex10 | 103 |
| ex11 | 109 |
| ex12 | 85 |
| ex13 | 102 |
| ex14 | 90 |
| ex15 | 91 |
| ex16 | 110 |
| ex4 | 10 |
| ex5 | 91 |
| ex6 | 123 |
| ex7 | 110 |
| ex8 | 115 |
| ex9 | 105 |
| exu | 28 |
| fut20 | 1 |
| fut2020 | 5 |
| g1 | 53 |
| gym1 | 151 |
| gym2 | 152 |
| hgss1 | 5 |
| hgss2 | 2 |
| hgss3 | 1 |
| hgss4 | 11 |
| hsp | 26 |
| mcd11 | 2 |
| mcd12 | 5 |
| mcd15 | 3 |
| mcd17 | 6 |
| mcd18 | 1 |
| mcd19 | 8 |
| mcd21 | 25 |
| mcd22 | 15 |
| me1 | 3 |
| me2 | 1 |
| me3 | 127 |
| me4 | 122 |
| mee | 8 |
| mep | 52 |
| mfb | 34 |
| neo1 | 130 |
| neo2 | 91 |
| neo3 | 80 |
| neo4 | 128 |
| pl1 | 11 |
| pl2 | 64 |
| pl3 | 123 |
| pl4 | 27 |
| pop2 | 2 |
| pop3 | 12 |
| pop4 | 10 |
| pop5 | 7 |
| pop6 | 10 |
| pop7 | 1 |
| pop8 | 9 |
| pop9 | 4 |
| ru1 | 3 |
| sm4 | 1 |
| sma | 188 |
| smp | 479 |
| sv1 | 22 |
| sv10 | 6 |
| sv2 | 4 |
| sv3 | 4 |
| sv3pt5 | 3 |
| sv4 | 29 |
| sv4pt5 | 2 |
| sv5 | 2 |
| sv6 | 11 |
| sv7 | 5 |
| sv8 | 5 |
| sv8pt5 | 1 |
| sv9 | 10 |
| sve | 24 |
| svp | 8 |
| swsh1 | 1 |
| swsh10 | 30 |
| swsh10tg | 30 |
| swsh11 | 32 |
| swsh11tg | 30 |
| swsh12 | 30 |
| swsh12pt5 | 70 |
| swsh12pt5gg | 70 |
| swsh12tg | 30 |
| swsh2 | 8 |
| swsh45 | 126 |
| swsh45sv | 122 |
| swsh6 | 6 |
| swsh7 | 53 |
| swsh9 | 30 |
| swsh9tg | 30 |
| swshp | 425 |
| xy10 | 4 |
| xy2 | 1 |
| xy3 | 1 |
| xy4 | 2 |
| xy6 | 2 |
| xy7 | 1 |
| xy8 | 1 |
| xy9 | 3 |
| xya | 6 |
| xyp | 414 |
| zsv10pt5 | 2 |

## Summary By Finish

| finish | count |
| --- | --- |
| first_edition_holo | 151 |
| first_edition_normal | 940 |
| holo | 2057 |
| normal | 1632 |
| reverse | 1300 |

## api_agreed_missing_needs_human_source

Rows: 420

### Top Sets

| set_key | count |
| --- | --- |
| swshp | 136 |
| dpp | 34 |
| ecard2 | 25 |
| mcd21 | 25 |
| sv4 | 25 |
| hsp | 24 |
| smp | 21 |
| ecard3 | 19 |
| pl4 | 18 |
| bwp | 13 |
| g1 | 13 |
| pl2 | 12 |
| xyp | 11 |
| mcd19 | 8 |
| mcd22 | 6 |
| mcd12 | 5 |
| pl1 | 5 |
| bw11 | 4 |
| dp7 | 4 |
| me1 | 3 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| ecard2 | 11 | Espeon | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 11 | Espeon | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 12 | Exeggutor | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 12 | Exeggutor | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 13 | Exeggutor | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 13 | Exeggutor | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 15 | Houndoom | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 15 | Houndoom | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 16 | Hypno | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 16 | Hypno | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 17 | Jumpluff | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 17 | Jumpluff | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 18 | Jynx | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 18 | Jynx | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 19 | Kingdra | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 19 | Kingdra | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 20 | Lanturn | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 20 | Lanturn | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 25 | Ninetales | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 28 | Porygon2 | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 28 | Porygon2 | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 30 | Quagsire | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 30 | Quagsire | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 32 | Scizor | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard2 | 32 | Scizor | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 4 | Articuno | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 4 | Articuno | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 6 | Crobat | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 6 | Crobat | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 8 | Flareon | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 8 | Flareon | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 9 | Forretress | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | 9 | Forretress | reverse | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H13 | Kabutops | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H14 | Ledian | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H16 | Magcargo | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H17 | Magcargo | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H18 | Magneton | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H22 | Piloswine | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H23 | Politoed | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H24 | Poliwrath | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H27 | Rhydon | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H30 | Umbreon | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| ecard3 | H31 | Vaporeon | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP01 | Turtwig | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP02 | Chimchar | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP03 | Piplup | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP04 | Pachirisu | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP05 | Tropical Wind | normal | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |
| dpp | DP06 | Buneary | holo | api_agreed | pokemontcg_api, tcgdex | Two structured APIs agree, but this is still not insertion authority without human-readable/checklist evidence. |

## first_edition_policy_gap

Rows: 1091

### Top Sets

| set_key | count |
| --- | --- |
| gym2 | 152 |
| gym1 | 151 |
| neo1 | 130 |
| neo4 | 127 |
| base1 | 102 |
| base5 | 101 |
| neo2 | 91 |
| base2 | 80 |
| neo3 | 80 |
| base3 | 77 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| base1 | 1 | Alakazam | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 2 | Blastoise | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 3 | Chansey | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 4 | Charizard | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 5 | Clefairy | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 6 | Gyarados | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 7 | Hitmonchan | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 8 | Machamp | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 9 | Magneton | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 10 | Mewtwo | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 11 | Nidoking | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 12 | Ninetales | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 13 | Poliwrath | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 14 | Raichu | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 15 | Venusaur | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 16 | Zapdos | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 17 | Beedrill | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 18 | Dragonair | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 19 | Dugtrio | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 20 | Electabuzz | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 21 | Electrode | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 22 | Pidgeotto | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 23 | Arcanine | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 24 | Charmeleon | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 25 | Dewgong | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 26 | Dratini | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 27 | Farfetch'd | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 28 | Growlithe | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 29 | Haunter | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 30 | Ivysaur | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 31 | Jynx | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 32 | Kadabra | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 33 | Kakuna | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 34 | Machoke | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 35 | Magikarp | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 36 | Magmar | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 37 | Nidorino | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 38 | Poliwhirl | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 39 | Porygon | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 40 | Raticate | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 41 | Seel | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 42 | Wartortle | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 43 | Abra | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 44 | Bulbasaur | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 45 | Caterpie | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 46 | Charmander | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 47 | Diglett | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 48 | Doduo | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 49 | Drowzee | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |
| base1 | 50 | Gastly | first_edition_normal | candidate_unconfirmed | tcgdex | First edition printings require a separate legacy policy pass before any insertion or cleanup decision. |

## product_or_deck_set_source_only_candidate

Rows: 74

### Top Sets

| set_key | count |
| --- | --- |
| pop3 | 12 |
| pop4 | 10 |
| pop6 | 10 |
| mcd22 | 9 |
| pop8 | 9 |
| pop5 | 7 |
| mcd17 | 6 |
| pop9 | 4 |
| mcd15 | 3 |
| pop2 | 2 |
| mcd18 | 1 |
| pop7 | 1 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| pop2 | 5 | Tauros | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop2 | 9 | Multi Technical Machine 01 | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 3 | Jolteon | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 4 | Minun | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 7 | Combusken | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 8 | Donphan | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 9 | Forretress | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 10 | High Pressure System | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 11 | Low Pressure System | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 12 | Ditto | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 14 | Ivysaur | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 15 | Marshtomp | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 16 | Pichu Bros. | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop3 | 17 | Ho-Oh ex | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 1 | Chimecho δ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 3 | Flygon | holo | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 3 | Flygon | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 6 | Combusken | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 9 | Pokémon Fan Club | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 10 | Scramble Energy | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 12 | Pidgey | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 15 | Treecko δ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 16 | Wobbuffet | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop4 | 17 | Deoxys ex | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 3 | Mew δ | holo | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 5 | Charmeleon δ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 9 | δ Rainbow Energy | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 10 | Charmander δ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 14 | Pelipper δ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 16 | Espeon ★ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop5 | 17 | Umbreon ★ | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 1 | Bastiodon | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 2 | Lucario | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 3 | Manaphy | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 4 | Pachirisu | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 5 | Rampardos | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 6 | Drifloon | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 10 | Staravia | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 12 | Buneary | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 16 | Starly | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop6 | 17 | Turtwig | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop7 | 2 | Gallade | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 4 | Probopass | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 5 | Yanmega | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 6 | Cherrim | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 6 | Cherrim | reverse | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 7 | Carnivine | reverse | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 11 | Roseanne's Research | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 12 | Chimchar | reverse | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |
| pop8 | 15 | Piplup | normal | candidate_unconfirmed | pokemontcg_api | Product, deck, POP, McDonald's, or early promo missing row is source-only and needs dedicated checklist evidence. |

## promo_family_source_only_candidate

Rows: 1523

### Top Sets

| set_key | count |
| --- | --- |
| smp | 458 |
| xyp | 403 |
| swshp | 289 |
| sma | 188 |
| bwp | 174 |
| svp | 7 |
| basep | 4 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| basep | 13 | Venusaur | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| basep | 15 | Cool Porygon | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| basep | 18 | Team Rocket's Meowth | normal | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| basep | 33 | Scizor | normal | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW01 | Snivy | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW02 | Tepig | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW03 | Oshawott | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW004 | Reshiram | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW005 | Zekrom | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW06 | Snivy | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW07 | Tepig | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW08 | Oshawott | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW09 | Zoroark | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW10 | Axew | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW11 | Pansage | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW12 | Zorua | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW13 | Minccino | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW17 | Ducklett | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW18 | Darumaka | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW19 | Zoroark | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW20 | Serperior | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW21 | Emboar | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW22 | Samurott | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW23 | Reshiram | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW24 | Zekrom | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW25 | Scraggy | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW26 | Axew | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW27 | Litwick | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW29 | Victory Cup | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW30 | Victory Cup | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW31 | Victory Cup | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW32 | Victini | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW33 | Riolu | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW34 | Luxio | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW36 | Reshiram-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW37 | Kyurem-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW38 | Zekrom-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW39 | Battle City | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW40 | Volcarona | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW41 | Thundurus | reverse | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW42 | Tornadus | reverse | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW43 | Landorus | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW44 | Kyurem | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW45 | Mewtwo-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW46 | Darkrai-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW47 | Rayquaza-EX | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW48 | Altaria | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW49 | Lilligant | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW51 | Crobat | holo | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |
| bwp | BW52 | Lillipup | reverse | candidate_unconfirmed | pokemontcg_api | Promo-family missing row is currently source-only and needs checklist/product evidence before any repair path. |

## source_only_candidate_missing

Rows: 2382

### Top Sets

| set_key | count |
| --- | --- |
| me3 | 127 |
| swsh45 | 126 |
| ex6 | 123 |
| me4 | 122 |
| ex8 | 115 |
| ex16 | 110 |
| ex7 | 110 |
| ex11 | 109 |
| ex9 | 105 |
| ex10 | 103 |
| ex13 | 102 |
| ex15 | 91 |
| ex5 | 91 |
| ex14 | 90 |
| ex12 | 85 |
| swsh12pt5 | 70 |
| swsh12pt5gg | 70 |
| swsh7 | 53 |
| mep | 52 |
| dpp | 43 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| 2023sv | 1 | Sprigatito | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 2 | Fuecoco | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 3 | Quaxly | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 4 | Cetoddle | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 5 | Cetitan | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 6 | Pikachu | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 7 | Pawmi | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 8 | Kilowattrel | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 9 | Flittle | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 10 | Sandaconda | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 11 | Klawf | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 12 | Blissey | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 13 | Tandemaus | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 14 | Cyclizar | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2023sv | 15 | Kirlia | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 1 | Charizard | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 2 | Pikachu | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 3 | Miraidon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 4 | Jigglypuff | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 5 | Hatenna | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 6 | Dragapult | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 7 | Quagsire | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 8 | Koraidon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 9 | Umbreon | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 10 | Hydreigon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 11 | Roaring Moon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 12 | Dragonite | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 13 | Eevee | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 14 | Rayquaza | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| 2024sv | 15 | Drampa | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 001 | Grass Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 002 | Fire Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 003 | Water Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 004 | Lightning Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 005 | Psychic Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 006 | Fighting Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 007 | Darkness Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mee | 008 | Metal Energy | normal | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 001 | Meganium | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 002 | Inteleon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 003 | Alakazam | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 004 | Lunatone | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 005 | Drifloon | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 006 | Drifblim | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 007 | Psyduck | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 008 | Golduck | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 009 | Alakazam | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 010 | Riolu | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 011 | Mega Latias ex | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |
| mep | 012 | Mega Lucario ex | holo | candidate_unconfirmed | tcgdex | Only source-limited index evidence supports this missing row, so it remains a candidate and not insertion authority. |

## subset_alias_or_numbering_gap

Rows: 590

### Top Sets

| set_key | count |
| --- | --- |
| swsh45sv | 122 |
| pl3 | 120 |
| bw11 | 57 |
| pl2 | 52 |
| g1 | 40 |
| swsh10tg | 30 |
| swsh11tg | 30 |
| swsh12tg | 30 |
| swsh9tg | 30 |
| col1 | 28 |
| cel25c | 25 |
| dp7 | 11 |
| pl4 | 9 |
| pl1 | 6 |

### Sample Rows

| set | number | Index name | finish | index status | sources | reason |
| --- | --- | --- | --- | --- | --- | --- |
| dp7 | SH1 | Drifloon | reverse | candidate_unconfirmed | pokemontcg_api | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | SH2 | Duskull | reverse | candidate_unconfirmed | pokemontcg_api | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | SH3 | Voltorb | reverse | candidate_unconfirmed | pokemontcg_api | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | 96 | Dusknoir | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | 97 | Heatran | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | 98 | Machamp | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | 99 | Raichu | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | 100 | Regigigas | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | SH1 | Drifloon | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | SH2 | Duskull | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| dp7 | SH3 | Voltorb | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 122 | Dialga G | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 123 | Drapion | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 124 | Giratina | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 125 | Palkia G | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 126 | Shaymin | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl1 | 127 | Shaymin | holo | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 15 | Beedrill | normal | candidate_unconfirmed | pokemontcg_api | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 5 | Flygon | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 16 | Bronzong 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 16 | Bronzong 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 17 | Drapion 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 17 | Drapion 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 18 | Espeon 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 18 | Espeon 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 20 | Gallade 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 20 | Gallade 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 23 | Golem 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 23 | Golem 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 24 | Heracross 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 24 | Heracross 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 28 | Mr. Mime 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 28 | Mr. Mime 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 32 | Rhyperior 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 32 | Rhyperior 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 35 | Vespiquen 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 35 | Vespiquen 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 37 | Yanmega 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 37 | Yanmega 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 38 | Alakazam 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 38 | Alakazam 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 42 | Hippowdon 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 42 | Hippowdon 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 43 | Infernape 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 43 | Infernape 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 47 | Rapidash 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 47 | Rapidash 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 48 | Scizor 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 48 | Scizor 4 | reverse | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
| pl2 | 54 | Whiscash 4 | normal | candidate_unconfirmed | tcgdex | Subset, gallery, or number-collision missing row needs set/subset identity resolution before any repair path. |
