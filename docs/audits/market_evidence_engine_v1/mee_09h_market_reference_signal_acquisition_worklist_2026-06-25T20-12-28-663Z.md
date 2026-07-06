# MEE-09H Market Reference Signal Acquisition Worklist

- Package: `MARKET-REFERENCE-SIGNAL-ACQUISITION-WORKLIST-V1`
- Ready: `true`
- Single-source rollups: `244`
- First-wave rows: `18`

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
| tcgcsv_reference | 244 |

## Proposed Source Coverage

| Source | Rows |
| --- | ---: |
| ebay_active | 234 |
| ebay_sold_candidate | 210 |
| justtcg_reference | 244 |
| manual_review_candidate | 24 |
| pokemontcg_io_reference | 244 |
| tcgplayer_reference_candidate | 10 |

## Review Status Counts

| Status | Rows |
| --- | ---: |
| blocked_special_lane_review | 24 |
| review_required_high_variance | 202 |
| review_required_single_source | 18 |

## First Wave Sample

| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | 399.95 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL6 | Kyogre | col1 | SL6 | 309.98 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL5 | Ho-Oh | col1 | SL5 | 300 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL1 | Deoxys | col1 | SL1 | 169.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-COL-SL8 | Palkia | col1 | SL8 | 168.25 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, ebay_active, ebay_sold_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | 79.79 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | 79.79 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | 79.79 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | 79.79 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | 72.18 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | 72.18 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | 72.18 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | 72.18 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-BW05 | Zekrom | bwp | BW05 | 2.99 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |
| GV-PK-PR-BLW-BW04 | Reshiram | bwp | BW04 | 4.45 | tcgcsv_reference | pokemontcg_io_reference, justtcg_reference, tcgplayer_reference_candidate | single_source_reference_signal, first_wave_single_source_status, quarantined_context_present |

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
