# MEE-11D Market Listing Acquisition Dry-Run Plan

- Package: `MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1`
- Ready for acquisition approval: `true`
- Package fingerprint: `4059ce0f8c2a20b767df2aee0474ffbd7704e6970d8fb876c81f7b87a52cacb6`
- Request manifest hash: `4ae7bc08df6a1c84cfc92dc4886f8ed335eeff7dffceecb6b2669089f26a7ba4`
- Schema migration hash: `2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4`
- Planned targets: `5000`
- Planned requests: `14589`
- Planned calls: `14589`
- Daily call ceiling: `4000`
- Max results per call: `200`
- Estimated max listing envelope: `2917800`
- Estimated day count at ceiling: `4`

## Boundary

- Dry-run plan only.
- No provider calls.
- No source fetches.
- No database writes.
- No public/app-visible pricing.
- No price rollups.

## Priority Counts

| Priority | Targets |
| --- | ---: |
| ordinary | 411 |
| priority_base_print_run | 48 |
| priority_special_lane | 4541 |

## Strategy Counts

| Strategy | Requests |
| --- | ---: |
| name_number | 4589 |
| set_number | 411 |
| special_lane | 4589 |
| strict_identity | 5000 |

## Sample Requests

| # | GV ID | Strategy | Query |
| ---: | --- | --- | --- |
| 1 | GV-PK-WCD-2018-BUZZROC-01-CRIMSON-57-BUZZWOLE_GX | special_lane | Pokemon "Buzzwole-GX" "2018 World Championships Deck: Buzzroc" "57" "2018 World Championships Deck: Buzzroc" |
| 2 | GV-PK-WCD-2018-BUZZROC-01-CRIMSON-57-BUZZWOLE_GX | strict_identity | Pokemon "Buzzwole-GX" "2018 World Championships Deck: Buzzroc" "57" |
| 3 | GV-PK-WCD-2018-BUZZROC-01-CRIMSON-57-BUZZWOLE_GX | name_number | Pokemon "Buzzwole-GX" 57 |
| 4 | GV-PK-WCD-2018-BUZZROC-03-GUARDIANS-74-LYCANROC_GX | special_lane | Pokemon "Lycanroc-GX" "2018 World Championships Deck: Buzzroc" "74" "2018 World Championships Deck: Buzzroc" |
| 5 | GV-PK-WCD-2018-BUZZROC-03-GUARDIANS-74-LYCANROC_GX | strict_identity | Pokemon "Lycanroc-GX" "2018 World Championships Deck: Buzzroc" "74" |
| 6 | GV-PK-WCD-2018-BUZZROC-03-GUARDIANS-74-LYCANROC_GX | name_number | Pokemon "Lycanroc-GX" 74 |
| 7 | GV-PK-WCD-2018-GARBANETTE-07-GUARDIANS-115-DRAMPA_GX | special_lane | Pokemon "Drampa-GX" "2018 World Championships Deck: Garbanette" "115" "2018 World Championships Deck: Garbanette" |
| 8 | GV-PK-WCD-2018-GARBANETTE-07-GUARDIANS-115-DRAMPA_GX | strict_identity | Pokemon "Drampa-GX" "2018 World Championships Deck: Garbanette" "115" |
| 9 | GV-PK-WCD-2018-GARBANETTE-07-GUARDIANS-115-DRAMPA_GX | name_number | Pokemon "Drampa-GX" 115 |
| 10 | GV-PK-WCD-2018-GARBANETTE-06-GUARDIANS-60-TAPU_LELE_GX | special_lane | Pokemon "Tapu Lele-GX" "2018 World Championships Deck: Garbanette" "60" "2018 World Championships Deck: Garbanette" |
| 11 | GV-PK-WCD-2018-GARBANETTE-06-GUARDIANS-60-TAPU_LELE_GX | strict_identity | Pokemon "Tapu Lele-GX" "2018 World Championships Deck: Garbanette" "60" |
| 12 | GV-PK-WCD-2018-GARBANETTE-06-GUARDIANS-60-TAPU_LELE_GX | name_number | Pokemon "Tapu Lele-GX" 60 |
| 13 | GV-PK-WCD-2023-COLORLESS_LUGIA-06-LOST-118-DRAPION_V | special_lane | Pokemon "Drapion V" "2023 World Championships Deck: Colorless Lugia" "118" "2023 World Championships Deck: Colorless Lugia" |
| 14 | GV-PK-WCD-2023-COLORLESS_LUGIA-06-LOST-118-DRAPION_V | strict_identity | Pokemon "Drapion V" "2023 World Championships Deck: Colorless Lugia" "118" |
| 15 | GV-PK-WCD-2023-COLORLESS_LUGIA-06-LOST-118-DRAPION_V | name_number | Pokemon "Drapion V" 118 |
| 16 | GV-PK-WCD-2023-COLORLESS_LUGIA-02-SILVER-138-LUGIA_V | special_lane | Pokemon "Lugia V" "2023 World Championships Deck: Colorless Lugia" "138" "2023 World Championships Deck: Colorless Lugia" |
| 17 | GV-PK-WCD-2023-COLORLESS_LUGIA-02-SILVER-138-LUGIA_V | strict_identity | Pokemon "Lugia V" "2023 World Championships Deck: Colorless Lugia" "138" |
| 18 | GV-PK-WCD-2023-COLORLESS_LUGIA-02-SILVER-138-LUGIA_V | name_number | Pokemon "Lugia V" 138 |
| 19 | GV-PK-WCD-2023-COLORLESS_LUGIA-04-BRILLIANT-40-LUMINEON_V | special_lane | Pokemon "Lumineon V" "2023 World Championships Deck: Colorless Lugia" "40" "2023 World Championships Deck: Colorless Lugia" |
| 20 | GV-PK-WCD-2023-COLORLESS_LUGIA-04-BRILLIANT-40-LUMINEON_V | strict_identity | Pokemon "Lumineon V" "2023 World Championships Deck: Colorless Lugia" "40" |
| 21 | GV-PK-WCD-2023-COLORLESS_LUGIA-04-BRILLIANT-40-LUMINEON_V | name_number | Pokemon "Lumineon V" 40 |
| 22 | GV-PK-WCD-2023-COLORLESS_LUGIA-07-POKEMON-58-SLAKING_V | special_lane | Pokemon "Slaking V" "2023 World Championships Deck: Colorless Lugia" "58" "2023 World Championships Deck: Colorless Lugia" |
| 23 | GV-PK-WCD-2023-COLORLESS_LUGIA-07-POKEMON-58-SLAKING_V | strict_identity | Pokemon "Slaking V" "2023 World Championships Deck: Colorless Lugia" "58" |
| 24 | GV-PK-WCD-2023-COLORLESS_LUGIA-07-POKEMON-58-SLAKING_V | name_number | Pokemon "Slaking V" 58 |
| 25 | GV-PK-WCD-2023-COLORLESS_LUGIA-09-ASTRAL-134-WYRDEER_V | special_lane | Pokemon "Wyrdeer V" "2023 World Championships Deck: Colorless Lugia" "134" "2023 World Championships Deck: Colorless Lugia" |
| 26 | GV-PK-WCD-2023-COLORLESS_LUGIA-09-ASTRAL-134-WYRDEER_V | strict_identity | Pokemon "Wyrdeer V" "2023 World Championships Deck: Colorless Lugia" "134" |
| 27 | GV-PK-WCD-2023-COLORLESS_LUGIA-09-ASTRAL-134-WYRDEER_V | name_number | Pokemon "Wyrdeer V" 134 |
| 28 | GV-PK-WCD-2023-LOST_BOX_KYOGRE-07-BRILLIANT-48-RAIKOU_V | special_lane | Pokemon "Raikou V" "2023 World Championships Deck: Lost Box Kyogre" "48" "2023 World Championships Deck: Lost Box Kyogre" |
| 29 | GV-PK-WCD-2023-LOST_BOX_KYOGRE-07-BRILLIANT-48-RAIKOU_V | strict_identity | Pokemon "Raikou V" "2023 World Championships Deck: Lost Box Kyogre" "48" |
| 30 | GV-PK-WCD-2023-LOST_BOX_KYOGRE-07-BRILLIANT-48-RAIKOU_V | name_number | Pokemon "Raikou V" 48 |

## Findings

- planned_calls_exceed_single_day_ceiling

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1 acquisition only. Package fingerprint: 4059ce0f8c2a20b767df2aee0474ffbd7704e6970d8fb876c81f7b87a52cacb6. Request manifest hash: 4ae7bc08df6a1c84cfc92dc4886f8ed335eeff7dffceecb6b2669089f26a7ba4. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: fetch a capped local-artifact-only smoke batch from the MEE-11D dry-run plan, using ebay_active Browse API requests only and writing local acquisition artifacts only. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
