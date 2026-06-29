# MEE-09H Market Reference Signal Acquisition Worklist

- Package: `MARKET-REFERENCE-SIGNAL-ACQUISITION-WORKLIST-V1`
- Ready: `true`
- Single-source rollups: `796`
- First-wave rows: `570`

## Boundary

- Read-only worklist only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No public/app-visible pricing.

## Existing Sources

| Source | Rows |
| --- | ---: |
| tcgcsv_reference | 796 |

## Proposed Source Coverage

| Source | Rows |
| --- | ---: |
| ebay_active | 280 |
| ebay_sold_candidate | 256 |
| justtcg_reference | 796 |
| manual_review_candidate | 24 |
| pokemontcg_io_reference | 796 |
| tcgplayer_reference_candidate | 516 |

## Review Status Counts

| Status | Rows |
| --- | ---: |
| blocked_special_lane_review | 24 |
| review_required_high_variance | 202 |
| review_required_single_source | 570 |

## First Wave Sample

| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| GV-PK-DRX-125 | Serperior | bw6 | 125 | 1292.45 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-PLS-136 | Charizard | bw8 | 136 | 950 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-LC-3 | Charizard | base6 | 3 | 1378.75 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL10 | Rayquaza | col1 | 10 | 27494.89 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PLF-122 | Ultra Ball | bw9 | 122 | 799.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-DCR-6 | Team Aqua's Kyogre-EX | dc1 | 6 | 526.79 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PLS-137 | Blastoise | bw8 | 137 | 499.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-BW101 | Genesect | bwp | 101 | 184 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-LTR-115 | Zekrom | bw11 | 115 | 403.17 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-DCR-15 | Team Magma's Groudon-EX | dc1 | 15 | 385.98 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-SW-3 | Charizard | dp3 | 3 | 365 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-BW65 | Jigglypuff | bwp | 65 | 81.69 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-LA-142 | Magnezone LV.X | dp6 | 142 | 65.8 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-PR-BLW-BW98 | Mew | bwp | 98 | 349.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-LC-18 | Venusaur | base6 | 18 | 330 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-BCR-89 | Landorus-EX | bw7 | 89 | 15.16 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, thin_evidence, quarantined_context_present |
| GV-PK-COL-SL6 | Kyogre | col1 | 6 | 309.98 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-MD-98 | Glaceon LV.X | dp5 | 98 | 299.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL5 | Ho-Oh | col1 | 5 | 300 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-LA-144 | Mewtwo LV.X | dp6 | 144 | 264.14 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-MD-97 | Garchomp LV.X | dp5 | 97 | 230 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |

## High Variance Sample

| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| GV-PK-LC-11 | Gengar | base6 | 11 | 984.92 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-4 | Dark Blastoise | base6 | 4 | 254.82 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-GE-105 | Dialga LV.X | dp4 | 105 | 524.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-21 | Butterfree | base6 | 21 | 140.51 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-33 | Pidgeot | base6 | 33 | 81.02 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-20 | Beedrill | base6 | 20 | 77.59 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-35 | Rhydon | base6 | 35 | 74.03 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-25 | Hypno | base6 | 25 | 63.19 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-30 | Moltres | base6 | 30 | 118.1 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-104 | Scoop Up | base6 | 104 | 33.19 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-28 | Magneton | base6 | 28 | 19.87 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-PLB-50 | Machamp | bw10 | 50 | 19.86 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LTR-31 | Gyarados | bw11 | 31 | 9.29 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-COL-28 | Mismagius | col1 | 28 | 8.46 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-8 | Dark Slowbro | base6 | 8 | 158.54 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-LC-103 | Pokémon Trader | base6 | 103 | 4.51 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-GE-19 | Hypno | dp4 | 19 | 3.44 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-MT-37 | Unown [I] | dp2 | 37 | 2.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-COL-23 | Ampharos | col1 | 23 | 2.54 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-PLF-29 | Vanilluxe | bw9 | 29 | 1.98 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-DP-36 | Purugly | dp1 | 36 | 6.75 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-PLS-37 | Vanilluxe | bw8 | 37 | 1.24 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-EPO-72 | Ferrothorn | bw2 | 72 | 1.05 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-DEX-88 | Stoutland | bw5 | 88 | 1 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |
| GV-PK-BLW-54 | Scolipede | bw1 | 54 | 0.86 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, high_variance_requires_source_corroboration, quarantined_context_present |

## Special Lane Sample

| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| GV-PK-PR-BLW-84-PRERELEASE-STAMP | Porygon-Z | bwp | 84 | 127.47 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-84-STAFF-PRERELEASE-STAMP | Porygon-Z | bwp | 84 | 127.47 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-40-PRERELEASE-STAMP | Volcarona | bwp | 40 | 121.48 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | Volcarona | bwp | 40 | 121.48 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-48-PRERELEASE-STAMP | Altaria | bwp | 48 | 244.66 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-48-STAFF-PRERELEASE-STAMP | Altaria | bwp | 48 | 244.66 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-75-PRERELEASE-STAMP | Metagross | bwp | 75 | 236.5 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-75-STAFF-PRERELEASE-STAMP | Metagross | bwp | 75 | 236.5 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-DP-52-PRERELEASE-STAMP | Luxio | dp1 | 52 | 1.32 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-DP-52-STAFF-PRERELEASE-STAMP | Luxio | dp1 | 52 | 1.32 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-MT-48-PRERELEASE-STAMP | Gabite | dp2 | 48 | 1.05 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-MT-48-STAFF-PRERELEASE-STAMP | Gabite | dp2 | 48 | 1.05 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-SW-106-ORIGINS-GAME-FAIR-2008-STAFF-STAMP | Shellos East Sea | dp3 | 106 | 1.12 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-MD-42-PRERELEASE-STAMP | Mothim | dp5 | 42 | 1.06 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-NXD-12-PRERELEASE-STAMP | Arcanine | bw4 | 12 | 5.25 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-NXD-12-STAFF-PRERELEASE-STAMP | Arcanine | bw4 | 12 | 5.25 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-53-PRERELEASE-STAMP | Flygon | bwp | 53 | 157.47 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-53-STAFF-PRERELEASE-STAMP | Flygon | bwp | 53 | 157.47 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-51-PRERELEASE-STAMP | Crobat | bwp | 51 | 71.24 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-PR-BLW-51-STAFF-PRERELEASE-STAMP | Crobat | bwp | 51 | 71.24 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-NVI-43-PRERELEASE-STAMP | Victini | bw3 | 43 | 14.65 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-NVI-43-STAFF-PRERELEASE-STAMP | Victini | bw3 | 43 | 14.65 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-BLW-25-PRERELEASE-STAMP | Darmanitan | bw1 | 25 | 0.86 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |
| GV-PK-BLW-25-STAFF-PRERELEASE-STAMP | Darmanitan | bw1 | 25 | 0.86 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, manual_review_candidate | single_source_reference_signal, special_lane_requires_exact_variant_evidence, quarantined_context_present |

## Findings

- none
