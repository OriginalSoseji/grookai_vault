# MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1

Generated: 2026-06-29T03:14:41.568Z

## Purpose

This is an internal-only sample/export over `v_market_evidence_price_candidate_review_queue_v1`.
It shows which price candidates look reviewable, which are high-value manual-review lanes, and which rows have quality warnings before any publication policy exists.

It does not publish pricing, write pricing observations, update `ebay_active_prices_latest`, or create app-visible prices.

## Overview

| Metric | Count |
| --- | ---: |
| Total queue rows | 16833 |
| Reviewer candidate rows | 1808 |
| Active listing rows | 2261 |
| Reference rows | 14572 |
| Raw single rows | 1198 |
| Slab rows | 1063 |
| High-value manual queue rows | 142 |
| Broader high-value review rows | 190 |

Public-boundary proof: can_publish_price_directly=0, publishable=0, app_visible=0, market_truth=0.

## Queue Summary

| Queue | Source | Lane | Status | Rows | Median | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| blocked_policy_review | reference | reference | blocked_policy | 402 | 0.40 | 0 |
| evidence_depth_queue | active_listing | raw_single | needs_more_evidence | 210 | 26.47 | 0 |
| evidence_depth_queue | active_listing | slab | needs_more_evidence | 243 | 130.35 | 0 |
| needs_review | reference | reference | needs_review | 350 | 3.91 | 0 |
| raw_single_high_value_review | active_listing | raw_single | internal_candidate | 36 | 361.21 | 36 |
| raw_single_ready_review | active_listing | raw_single | internal_candidate | 952 | 12.50 | 952 |
| reference_context_review | reference | reference | reference_context | 587 | 6.79 | 0 |
| reference_only_hold | reference | reference | reference_only_hold | 13233 | 0.72 | 0 |
| slab_high_value_review | active_listing | slab | internal_candidate | 106 | 1,756.50 | 106 |
| slab_ready_review | active_listing | slab | internal_candidate | 714 | 155.50 | 714 |

## Raw Single Ready Samples

| GV ID | Card | Lane | Median | Evidence | Sellers | Recommendation | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-PK-8 | Delcatty #8 | raw_single | 8.54 | 382 | 82 | ready_for_internal_policy_review |  |
| GV-PK-PR-NP-35 | Pikachu δ #35 | raw_single | 2.08 | 366 | 161 | ready_for_internal_policy_review |  |
| GV-PK-LM-6 | Golem #6 | raw_single | 12.99 | 365 | 93 | ready_for_internal_policy_review |  |
| GV-PK-WCD-2016-NINJA_BLITZ-03-XY-41-GRENINJA | Greninja #41 | raw_single | 4.60 | 355 | 167 | hold_for_special_lane_policy | world_championship_special_lane |
| GV-PK-WCD-2018-DRAGONES_Y_SOMBRAS-04-SUN_AND_MOON-113-ORANGURU | Oranguru #113 | raw_single | 2.17 | 355 | 148 | hold_for_special_lane_policy | world_championship_special_lane |
| GV-PK-WCD-2016-BLACK_DRAGON-03-STEAM_SIEGE-65-YVELTAL | Yveltal #65 | raw_single | 2.84 | 353 | 159 | hold_for_special_lane_policy | world_championship_special_lane |
| GV-PK-MEP-069 | Chikorita #069 | raw_single | 1.99 | 349 | 156 | ready_for_internal_policy_review |  |
| GV-PK-EM-7 | Manectric #7 | raw_single | 14.89 | 347 | 84 | ready_for_internal_policy_review |  |
| GV-PK-MEP-018 | Cottonee #018 | raw_single | 1.99 | 346 | 121 | ready_for_internal_policy_review |  |
| GV-PK-TK-tk-ex-latia-7 | Torchic #7 | raw_single | 2.49 | 336 | 84 | ready_for_internal_policy_review |  |
| GV-PK-MEP-021 | Weavile #021 | raw_single | 2.00 | 331 | 121 | ready_for_internal_policy_review |  |
| GV-PK-DR-3 | Crawdaunt #3 | raw_single | 10.00 | 321 | 80 | ready_for_internal_policy_review |  |
| GV-PK-MEP-020 | Sneasel #020 | raw_single | 2.28 | 317 | 117 | ready_for_internal_policy_review |  |
| GV-PK-MEP-034 | Mega Meganium ex #034 | raw_single | 2.74 | 312 | 124 | ready_for_internal_policy_review |  |
| GV-PK-MEP-068 | Makuhita #068 | raw_single | 1.99 | 309 | 135 | ready_for_internal_policy_review |  |
| GV-PK-TK-tk-ex-latia-6 | Skitty #6 | raw_single | 2.11 | 304 | 76 | ready_for_internal_policy_review |  |
| GV-PK-MEP-019 | Whimsicott #019 | raw_single | 1.99 | 303 | 140 | ready_for_internal_policy_review |  |
| GV-PK-MEP-025 | Mega Kangaskhan ex #025 | raw_single | 2.29 | 297 | 129 | ready_for_internal_policy_review |  |
| GV-PK-CG-3 | Camerupt #3 | raw_single | 10.95 | 287 | 76 | ready_for_internal_policy_review |  |
| GV-PK-MEP-036 | Mega Feraligatr ex #036 | raw_single | 2.99 | 285 | 117 | ready_for_internal_policy_review |  |

## Raw Single High-Value Samples

| GV ID | Card | Lane | Median | Evidence | Sellers | Recommendation | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-RG-108 | Gengar ex #108 | raw_single | 1,999.50 | 12 | 4 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-BASE1-4-SHADOWLESS | Charizard #4 | raw_single | 1,271.60 | 13 | 13 | hold_for_special_lane_policy | raw_single_high_value_manual_review, base_print_run_special_lane |
| GV-PK-TRR-99 | Rocket's Mewtwo ex #99 | raw_single | 999.99 | 10 | 3 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-DR-100 | Charizard #100 | raw_single | 649.99 | 32 | 8 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-UF-117 | Celebi ex #117 | raw_single | 596.96 | 36 | 10 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-EM-93 | Deoxys ex #93 | raw_single | 580.39 | 10 | 3 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-TRR-97 | Rocket's Entei ex #97 | raw_single | 561.73 | 12 | 4 | manual_high_value_review | wide_price_spread, raw_single_high_value_manual_review |
| GV-PK-MA-95 | Swampert ex #95 | raw_single | 549.99 | 13 | 3 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-DS-3 | Dragonite δ #3 | raw_single | 535.87 | 30 | 6 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-UF-102 | Espeon ex #102 | raw_single | 469.98 | 24 | 7 | manual_high_value_review | wide_price_spread, raw_single_high_value_manual_review |
| GV-PK-UF-112 | Umbreon ex #112 | raw_single | 466.25 | 30 | 9 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-DS-12 | Mewtwo δ #12 | raw_single | 424.95 | 30 | 8 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-BASE1-15-SHADOWLESS | Venusaur #15 | raw_single | 417.83 | 19 | 15 | hold_for_special_lane_policy | raw_single_high_value_manual_review, base_print_run_special_lane |
| GV-PK-TRR-106 | Rocket's Zapdos ex #106 | raw_single | 410.76 | 16 | 4 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-UF-105 | Lugia ex #105 | raw_single | 397.67 | 29 | 10 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-BASE1-2-SHADOWLESS | Blastoise #2 | raw_single | 393.41 | 16 | 13 | hold_for_special_lane_policy | raw_single_high_value_manual_review, base_print_run_special_lane |
| GV-PK-DX-102 | Rayquaza ex #102 | raw_single | 378.00 | 29 | 8 | manual_high_value_review | wide_price_spread, raw_single_high_value_manual_review |
| GV-PK-TRR-111 | Here Comes Team Rocket! #111 | raw_single | 364.64 | 16 | 4 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-DS-13 | Rayquaza δ #13 | raw_single | 357.77 | 12 | 3 | manual_high_value_review | raw_single_high_value_manual_review |
| GV-PK-EM-96 | Milotic ex #96 | raw_single | 355.84 | 36 | 10 | manual_high_value_review | raw_single_high_value_manual_review |

## Slab Ready Samples

| GV ID | Card | Lane | Median | Evidence | Sellers | Recommendation | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-DS-7 | Jolteon δ #7 | slab | 202.62 | 344 | 86 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-9 | Latios δ #9 | slab | 395.03 | 325 | 107 | hold_for_outlier_review | wide_price_spread |
| GV-PK-WCD-2009-STALLGON-12-MAJESTIC_DAWN-9-MEWTWO | Mewtwo #9 | slab | 295.98 | 301 | 134 | hold_for_special_lane_policy | wide_price_spread, world_championship_special_lane |
| GV-PK-DS-8 | Latias δ #8 | slab | 305.53 | 267 | 74 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-6 | Gardevoir δ #6 | slab | 255.99 | 180 | 33 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-10 | Marowak δ #10 | slab | 316.02 | 168 | 46 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DF-7 | Nidoqueen δ #7 | slab | 100.00 | 162 | 66 | ready_for_internal_policy_review |  |
| GV-PK-DS-18 | Vaporeon δ #18 | slab | 549.00 | 157 | 25 | ready_for_internal_policy_review |  |
| GV-PK-TK-tk-ex-m-10 | Potion #10 | slab | 185.98 | 155 | 38 | hold_for_outlier_review | wide_price_spread |
| GV-PK-TK-tk-sm-r-29 | Pikachu #29 | slab | 205.99 | 153 | 56 | ready_for_internal_policy_review |  |
| GV-PK-LM-5 | Gengar #5 | slab | 705.99 | 150 | 45 | ready_for_internal_policy_review |  |
| GV-PK-TK-tk-ex-latio-10 | Lightning Energy #10 | slab | 115.49 | 148 | 51 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-2 | Crobat δ #2 | slab | 197.45 | 137 | 25 | hold_for_outlier_review | wide_price_spread |
| GV-PK-BASE1-8-FIRST-EDITION | Machamp #8 | slab | 149.49 | 130 | 58 | hold_for_special_lane_policy | base_print_run_special_lane |
| GV-PK-DS-11 | Metagross δ #11 | slab | 750.00 | 126 | 22 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DF-9 | Pinsir δ #9 | slab | 94.99 | 116 | 52 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-1 | Beedrill δ #1 | slab | 169.43 | 116 | 38 | hold_for_outlier_review | wide_price_spread |
| GV-PK-HP-1 | Armaldo δ #1 | slab | 221.22 | 113 | 42 | ready_for_internal_policy_review |  |
| GV-PK-PK-6 | Charizard #6 | slab | 928.37 | 112 | 30 | ready_for_internal_policy_review |  |
| GV-PK-UF-17 | Typhlosion #17 | slab | 449.94 | 111 | 21 | ready_for_internal_policy_review |  |

## Slab High-Value Samples

| GV ID | Card | Lane | Median | Evidence | Sellers | Recommendation | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-WCD-2006-EEVEELUTIONS-03-EX_UNSEEN_FORCES-112-UMBREON_EX | Umbreon ex #112 | slab | 100,000.00 | 3 | 2 | hold_for_special_lane_policy | thin_evidence, low_seller_diversity, slab_high_value_manual_review, world_championship_special_lane |
| GV-PK-BASE1-4-FIRST-EDITION | Charizard #4 | slab | 42,303.00 | 44 | 21 | hold_for_special_lane_policy | slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-WCD-2011-TWINBOAR-09-UNDAUNTED-90-RAYQUAZA_AND_DEOXYS_LEGEND | Rayquaza & Deoxys LEGEND #90 | slab | 30,227.91 | 4 | 3 | hold_for_special_lane_policy | wide_price_spread, thin_evidence, slab_high_value_manual_review, world_championship_special_lane |
| GV-PK-BASE1-13-1999-2000 | Poliwrath #13 | slab | 29,999.95 | 5 | 3 | hold_for_special_lane_policy | wide_price_spread, slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-EX3-100-NATIONAL-CHAMPIONSHIPS-STAMP | Charizard #100 | slab | 29,567.89 | 8 | 6 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-DR-100 | Charizard #100 | slab | 6,005.99 | 178 | 53 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-BASE1-2-FIRST-EDITION | Blastoise #2 | slab | 6,005.98 | 25 | 13 | hold_for_special_lane_policy | slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-MA-90 | Cradily ex #90 | slab | 6,004.99 | 12 | 2 | manual_high_value_review | low_seller_diversity, slab_high_value_manual_review |
| GV-PK-PR-NP-28 | Championship Arena #28 | slab | 5,293.66 | 3 | 3 | manual_high_value_review | thin_evidence, slab_high_value_manual_review |
| GV-PK-PR-NP-008-E-LEAGUE-STAMP | Torchic #008 | slab | 5,249.50 | 20 | 8 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-BASE1-11-1999-2000 | Nidoking #11 | slab | 5,004.99 | 3 | 2 | hold_for_special_lane_policy | wide_price_spread, thin_evidence, low_seller_diversity, slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-TRR-104 | Rocket's Snorlax ex #104 | slab | 5,000.00 | 37 | 10 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-BASE1-10-FIRST-EDITION | Mewtwo #10 | slab | 5,000.00 | 13 | 7 | hold_for_special_lane_policy | slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-BASE1-15-FIRST-EDITION | Venusaur #15 | slab | 4,602.50 | 26 | 15 | hold_for_special_lane_policy | slab_high_value_manual_review, base_print_run_special_lane |
| GV-PK-UF-112 | Umbreon ex #112 | slab | 4,465.94 | 124 | 22 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-TRR-99 | Rocket's Mewtwo ex #99 | slab | 4,251.92 | 54 | 10 | manual_high_value_review | slab_high_value_manual_review |
| GV-PK-UF-105 | Lugia ex #105 | slab | 3,999.99 | 57 | 11 | manual_high_value_review | slab_high_value_manual_review |
| GV-PK-HP-3 | Deoxys δ #3 | slab | 3,999.99 | 13 | 3 | manual_high_value_review | slab_high_value_manual_review |
| GV-PK-DS-3 | Dragonite δ #3 | slab | 3,646.00 | 12 | 2 | manual_high_value_review | low_seller_diversity, slab_high_value_manual_review |
| GV-PK-HP-11 | Latias δ #11 | slab | 3,501.95 | 9 | 2 | manual_high_value_review | low_seller_diversity, slab_high_value_manual_review |

## Spread And Matcher Risk Samples

| GV ID | Card | Lane | Median | Evidence | Sellers | Recommendation | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-PR-BLW-84-PRERELEASE-STAMP | Porygon-Z #84 | slab | 289.07 | 7 | 4 | hold_for_outlier_review | wide_price_spread |
| GV-PK-RG-15 | Snorlax #15 | slab | 1,249.00 | 32 | 15 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-RG-7 | Marowak #7 | slab | 444.99 | 61 | 26 | hold_for_outlier_review | wide_price_spread |
| GV-PK-EM-6 | Kyogre #6 | slab | 134.99 | 35 | 10 | hold_for_outlier_review | wide_price_spread |
| GV-PK-TK-tk-ex-p-4 | Meowth #4 | slab | 66.00 | 25 | 12 | hold_for_outlier_review | wide_price_spread |
| GV-PK-UF-11 | Poliwrath #11 | slab | 250.00 | 34 | 6 | hold_for_outlier_review | wide_price_spread |
| GV-PK-BASE1-7-1999-2000 | Hitmonchan #7 | slab | 104.51 | 5 | 4 | hold_for_special_lane_policy | wide_price_spread, base_print_run_special_lane |
| GV-PK-HL-11 | Metagross #11 | slab | 115.00 | 54 | 10 | hold_for_outlier_review | wide_price_spread |
| GV-PK-RG-11 | Poliwrath #11 | slab | 318.19 | 14 | 5 | hold_for_outlier_review | wide_price_spread |
| GV-PK-TRR-7 | Dark Marowak #7 | slab | 686.40 | 28 | 9 | hold_for_outlier_review | wide_price_spread |
| GV-PK-WCD-2011-TWINBOAR-09-UNDAUNTED-90-RAYQUAZA_AND_DEOXYS_LEGEND | Rayquaza & Deoxys LEGEND #90 | slab | 30,227.91 | 4 | 3 | hold_for_special_lane_policy | wide_price_spread, thin_evidence, slab_high_value_manual_review, world_championship_special_lane |
| GV-PK-EM-3 | Exploud #3 | slab | 201.09 | 84 | 21 | hold_for_outlier_review | wide_price_spread |
| GV-PK-MA-9 | Team Magma's Groudon #9 | slab | 1,855.99 | 22 | 3 | manual_high_value_review | wide_price_spread, slab_high_value_manual_review |
| GV-PK-DX-13 | Ninjask #13 | slab | 195.00 | 38 | 10 | hold_for_outlier_review | wide_price_spread |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | Victory Cup #29 | slab | 1,583.97 | 8 | 2 | manual_high_value_review | wide_price_spread, low_seller_diversity, slab_high_value_manual_review |
| GV-PK-TK-tk-dp-m-4 | Manaphy #4 | slab | 201.48 | 8 | 5 | hold_for_outlier_review | wide_price_spread |
| GV-PK-DS-10 | Marowak δ #10 | slab | 316.02 | 168 | 46 | hold_for_outlier_review | wide_price_spread |
| GV-PK-MCD-2017-5 | Pikachu #5 | slab | 530.49 | 12 | 4 | hold_for_special_lane_policy | wide_price_spread, mcdonalds_special_lane |
| GV-PK-SS-5 | Flareon #5 | slab | 495.99 | 53 | 11 | hold_for_outlier_review | wide_price_spread |
| GV-PK-BASE1-14-SHADOWLESS | Raichu #14 | slab | 1,027.99 | 12 | 11 | hold_for_special_lane_policy | wide_price_spread, slab_high_value_manual_review, base_print_run_special_lane |

## Boundary

No DB writes, provider calls, source fetches, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image writes, deletes, upserts, merges, migrations, or global apply were performed.

JSON report: `docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1/report.json`

Package fingerprint: `3685228e99712a9703d477595ceb44485fee28c4ff1b9ecc2e9d9ce66dc3d69c`
