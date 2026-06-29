# MEE-11F Market Listing Broad Intake Smoke

- Package: `MARKET-LISTING-BROAD-INTAKE-SMOKE-V1`
- Ready for broad backfill plan: `true`
- Package fingerprint: `739a73d3d021fb901f36cbe48a1fb9f48081e058b151261441d25d6f152f0f9b`
- Raw snapshot manifest hash: `3132eeaef3d1404e9d598903738e5552c8de6a114ae193dac5e908e959792592`
- Projected observation manifest hash: `540a4bf3f906a6c27c075526ccfe506a2d132af86e8ae0aa36aae542a305f856`
- Queries: `5`
- Fetched items: `1000`
- Unique listings: `958`
- Clean observations: `469`

## Boundary

- Provider calls happened only for this capped smoke batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Request Results

| Query | Status | HTTP | Provider total | Items |
| --- | --- | ---: | ---: | ---: |
| pokemon card single -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 7305 | 200 |
| pokemon holo card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 463294 | 200 |
| pokemon promo card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 88235 | 200 |
| pokemon trainer card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 31545 | 200 |
| pokemon ex card -bulk -lot -proxy -custom -jumbo -code | fetched_success | 200 | 184812 | 200 |

## Sample Observations

| Title | Total | Currency | Flags |
| --- | ---: | --- | --- |
| Hoopa 155/XY-P Movie Promo Full Art Holo Foil Japanese Pokemon Single Card VG | 69.55 | USD | foreign_language, japanese |
| Pokemon TCG Fernando Mendoza V Basic English Standard Card 999 HP Single | 55 | USD | custom_fake |
| Pokemon TCG Archeops 051/086 (Single Card)- PokAcmon Fossil Musuem Promo-Unopened | 70 | USD | sealed |
| Pokemon VMAX - Choose Your Card - All Available, Ultra Rare, Full Art Holo TCG | 7.99 | USD | choose_your_card |
| Pokemon Trading Card Sword & Shield VMax: Choose Your Card | 12.99 | USD | choose_your_card |
| Japanese Pokemon Art Rare, RRR, VMAX, VStar: Choose Your Card! [US SELLER] | 3.9800000000000004 | USD | choose_your_card, foreign_language, japanese |
| Single Pokemon Card Sleeve (1) - 2025 Pokemon Center Kagawa Japan Original | 2 | USD | sleeve_accessory |
| Espurr Pokemon Single Strike Master card Japanese 025/070 | 1.99 | USD | foreign_language, japanese |
| Pokemon V - Choose Your Card - Ultra Rare, Full Art Holo TCG - All Available NM | 2.95 | USD | choose_your_card |
| Tyranitar V 077/070 SR Full Art S5I Single Strike Pokemon Card Korean LP/MP | 65.5 | USD | foreign_language |
| Alolan Geodude 35/181 Common Team Up Lightly Played Pokemon Card TCG Single | 2.49 | USD | clean |
| Pokemon Card VMAX VSTAR - Choose Your Card! Full Art Ultra Rare Cards! NM | 4.99 | USD | choose_your_card |
| Pokemon Trading Card Game Classic Single Card CLV CLC CLB 001-034 You PICK!!!! | 2.7800000000000002 | USD | choose_your_card |
| Pokemon TCG Trading Card Single - Back Shown - Pokemon Franchise Collectible | 400.99 | USD | back_shown |
| Pokemon Card PokAcmon TCG S-Chinese Zeraora CSV9C 210/208 AR Holo Single Card NM | 11.78 | USD | foreign_language |
| Pokemon TCG Trading Card Single - Card Back Shown - Collectible Card Game | 5 | USD | back_shown |
| 1X Single 2021 Pokemon Center Dragon Takeover Dragonite Goodra TCG Card Sleeve | 1 | USD | sleeve_accessory |
| Pokemon Trading Card Game (TCG) Single Card - Back Shown - Pokemon TCG Card | 2 | USD | back_shown |
| Beedrill - Plasma Freeze - PLF 3/116 - VINTAGE single HP Pokemon Card fast ship! | 1.77 | USD | clean |
| Pokemon Card HS Unleashed Single Card Uncommon Metang 33/95 | 1.89 | USD | clean |
| 1X Single 2021 Pokemon Center Eevee Breakaway Eeveelutions TCG Card Sleeve | 1 | USD | sleeve_accessory |
| Pokemon SWSH PROMO V Cards - Choose Your Card - Ultra Rare, Full Art Holo NM | 3.49 | USD | choose_your_card |
| Chilling Reign Pokemon Cards! Holo/Reverse Holo Vmax V Secret Rare Full Art Card | 1.49 | USD | clean |
| JAPANESE Pokemon Card Camping Gear 063/070 S5I Single Strike Master NM/M | 1.74 | USD | foreign_language, japanese |
| Snubbull 137/214 Common Lost Thunder Lightly Played Pokemon Card TCG Single | 2.49 | USD | clean |
| Pokemon Trainer Gallery: Choose Your Card! Full Art Galarian Trainer Gallery SIR | 16.99 | USD | choose_your_card |
| Dratini 49/108 Common Roaring Skies Lightly Played Pokemon Card TCG Single | 2.49 | USD | clean |
| Pokemon -Pokemon - Cradily 006/142 - Stellar Crown Reverse Foil �?? Single Card | 0.99 | USD | clean |
| Pokemon Etc.. Single Card Guard! ������ | 10 | USD | sleeve_accessory |
| Pokemon TCG Meowth Art Rare AR 118/103 Full Art Holo Thai Language Single Card | 44.13 | USD | foreign_language |

## Findings

- none
