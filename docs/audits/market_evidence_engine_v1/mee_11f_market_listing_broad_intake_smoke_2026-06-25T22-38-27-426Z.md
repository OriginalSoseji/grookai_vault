# MEE-11F Market Listing Broad Intake Smoke

- Package: `MARKET-LISTING-BROAD-INTAKE-SMOKE-V1`
- Ready for broad backfill plan: `true`
- Package fingerprint: `15707ae9fdce5423c7dc04133d102df96e3c8c0650309c91ec01cfd53677e1a1`
- Raw snapshot manifest hash: `0efb8cd015a1ba1a7a047ffe8de3621a9bd13457aa1779d8b925615e316d038c`
- Projected observation manifest hash: `7c66f33bf09e02879048cba91c44ea32de0c85fa6e05f745d2a774245c6fe80f`
- Queries: `5`
- Fetched items: `25`
- Unique listings: `25`
- Clean observations: `20`

## Boundary

- Provider calls happened only for this capped smoke batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Request Results

| Query | Status | HTTP | Provider total | Items |
| --- | --- | ---: | ---: | ---: |
| pokemon card single -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 7305 | 5 |
| pokemon holo card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 463433 | 5 |
| pokemon promo card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 88235 | 5 |
| pokemon trainer card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 34976 | 5 |
| pokemon ex card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 184812 | 5 |

## Sample Observations

| Title | Total | Currency | Flags |
| --- | ---: | --- | --- |
| Hoopa 155/XY-P Movie Promo Full Art Holo Foil Japanese Pokemon Single Card VG | 69.55 | USD | japanese |
| Pokemon TCG Fernando Mendoza V Basic English Standard Card 999 HP Single | 55 | USD | clean |
| Pokemon TCG Archeops 051/086 (Single Card)- PokAcmon Fossil Musuem Promo-Unopened | 70 | USD | clean |
| Pokemon TCG Trading Card Single - Back Shown - Pokemon Franchise Collectible | 400.99 | USD | clean |
| Pokemon Trading Card Sword & Shield VMax: Choose Your Card | 12.99 | USD | clean |
| Snorlax Munchlax Pokemon Card! Holo/Reverse Holo Rare EX V VMAX Full Art Cards! | 799.99 | USD | clean |
| Pokemon Scorbunny 053 Promo Full Art Holo Card English Mega Evolution Promo 2026 | 16.95 | USD | clean |
| Pokemon TCG Jungle Unlimited Choose Your Card! English | 18.88 | USD | clean |
| Pokemon S-Chinese Card Terastal Gathering Umbreon ex CSV9.5C-239/208 SAR Holo | 226.88 | USD | clean |
| Pikachu Raichu Pichu Pokemon Card! Holo/Reverse Holo Rare EX VMAX Full Art Cards | 349.99 | USD | clean |
| Pikachu 090/XY-P Battle Festa 2014 Promo Full Art Holo Japanese Pokemon Card MP! | 65.8 | USD | japanese |
| [Pre-order] Pokemon Korea Mega Festa 2026 Magikarp Promo Card 040/M-P Limited | 179 | USD | clean |
| PTCG Pokemon Card Victini SV-P-265/SV-P PROMO Chinese | 279.99 | USD | clean |
| Pokemon Korea Mega Festa 2026 Magikarp Promo Card 040/M-P Korean Exclusive Event | 198.99 | USD | clean |
| Pikachu 227/S-P & Cramorant 226/S-P Stamp Box Promo Pokemon Card Japanese Sealed | 86.5 | USD | sealed, japanese |
| Pokemon Trainer Gallery: Choose Your Card! Full Art Galarian Trainer Gallery SIR | 14.99 | USD | clean |
| Mom BW Pokemon Trainer Full Art Sexy Waifu doujin ACG Card | 22.03 | USD | clean |
| Xerosic�??s Machinations Full Art 089/064 Pokemon Trainer Card NM | 7 | USD | clean |
| 21 Trainer Card From Pokemon | 12.5 | USD | clean |
| Pokemon - ILLUSTRATION RARE/TRAINER GALLERY Choose Your Card A-H [EN-VAR] [IRAH] | 38 | USD | clean |
| Pokemon EX Singles - Choose Your Card - All Available - Full Art-Double Rare | 3.24 | USD | clean |
| 2025 Mega DREAM EX MA Complete Set of 10 223-232/193 M2a Pokemon Card Japanese | 165 | USD | japanese |
| Pokemon ex - choose your card, Ultra Rare , English NM Cards | 3.99 | USD | clean |
| Mega DREAM EX MA Complete Set of 10 223-232/193 M2a Pokemon Card Japanese 2025 | 160 | USD | japanese |
| Pokemon EX Singles - Choose Your Card -All Available -Full Art -Double Rare NM | 2.52 | USD | clean |

## Findings

- none
