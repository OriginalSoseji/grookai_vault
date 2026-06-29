# MEE-11D Market Listing Acquisition Dry-Run Plan

- Package: `MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1`
- Ready for acquisition approval: `true`
- Package fingerprint: `d559f29dccb92922cf9e945e3a00e4e6ac4221779f7d91b8fba789f0005362cb`
- Request manifest hash: `4752a516ed812b95cf34c555b2520ae628b7babe7fddffbe96bc9cfc446ad277`
- Schema migration hash: `2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4`
- Planned targets: `1000`
- Planned requests: `3000`
- Planned calls: `3000`
- Daily call ceiling: `4000`
- Max results per call: `200`
- Estimated max listing envelope: `600000`
- Estimated day count at ceiling: `1`

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
| priority_special_lane | 1000 |

## Strategy Counts

| Strategy | Requests |
| --- | ---: |
| name_number | 1000 |
| special_lane | 1000 |
| strict_identity | 1000 |

## Sample Requests

| # | GV ID | Strategy | Query |
| ---: | --- | --- | --- |
| 1 | GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | special_lane | Pokemon "Blaziken" "2004 World Championships Deck: Blaziken Tech" "3" "2004 World Championships Deck: Blaziken Tech" |
| 2 | GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | strict_identity | Pokemon "Blaziken" "2004 World Championships Deck: Blaziken Tech" "3" |
| 3 | GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | name_number | Pokemon "Blaziken" 3 |
| 4 | GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | special_lane | Pokemon "Blaziken ex" "2004 World Championships Deck: Blaziken Tech" "89" "2004 World Championships Deck: Blaziken Tech" |
| 5 | GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | strict_identity | Pokemon "Blaziken ex" "2004 World Championships Deck: Blaziken Tech" "89" |
| 6 | GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | name_number | Pokemon "Blaziken ex" 89 |
| 7 | GV-PK-WCD-2004-BLAZIKEN_TECH-03-EX_RUBY_AND_SAPP-28-COMBUSKEN | special_lane | Pokemon "Combusken" "2004 World Championships Deck: Blaziken Tech" "28" "2004 World Championships Deck: Blaziken Tech" |
| 8 | GV-PK-WCD-2004-BLAZIKEN_TECH-03-EX_RUBY_AND_SAPP-28-COMBUSKEN | strict_identity | Pokemon "Combusken" "2004 World Championships Deck: Blaziken Tech" "28" |
| 9 | GV-PK-WCD-2004-BLAZIKEN_TECH-03-EX_RUBY_AND_SAPP-28-COMBUSKEN | name_number | Pokemon "Combusken" 28 |
| 10 | GV-PK-WCD-2004-BLAZIKEN_TECH-04-EX_RUBY_AND_SAPP-74-TORCHIC | special_lane | Pokemon "Torchic" "2004 World Championships Deck: Blaziken Tech" "74" "2004 World Championships Deck: Blaziken Tech" |
| 11 | GV-PK-WCD-2004-BLAZIKEN_TECH-04-EX_RUBY_AND_SAPP-74-TORCHIC | strict_identity | Pokemon "Torchic" "2004 World Championships Deck: Blaziken Tech" "74" |
| 12 | GV-PK-WCD-2004-BLAZIKEN_TECH-04-EX_RUBY_AND_SAPP-74-TORCHIC | name_number | Pokemon "Torchic" 74 |
| 13 | GV-PK-WCD-2004-BLAZIKEN_TECH-05-EX_RUBY_AND_SAPP-5-DELCATTY | special_lane | Pokemon "Delcatty" "2004 World Championships Deck: Blaziken Tech" "5" "2004 World Championships Deck: Blaziken Tech" |
| 14 | GV-PK-WCD-2004-BLAZIKEN_TECH-05-EX_RUBY_AND_SAPP-5-DELCATTY | strict_identity | Pokemon "Delcatty" "2004 World Championships Deck: Blaziken Tech" "5" |
| 15 | GV-PK-WCD-2004-BLAZIKEN_TECH-05-EX_RUBY_AND_SAPP-5-DELCATTY | name_number | Pokemon "Delcatty" 5 |
| 16 | GV-PK-WCD-2004-BLAZIKEN_TECH-06-EX_RUBY_AND_SAPP-44-SKITTY | special_lane | Pokemon "Skitty" "2004 World Championships Deck: Blaziken Tech" "44" "2004 World Championships Deck: Blaziken Tech" |
| 17 | GV-PK-WCD-2004-BLAZIKEN_TECH-06-EX_RUBY_AND_SAPP-44-SKITTY | strict_identity | Pokemon "Skitty" "2004 World Championships Deck: Blaziken Tech" "44" |
| 18 | GV-PK-WCD-2004-BLAZIKEN_TECH-06-EX_RUBY_AND_SAPP-44-SKITTY | name_number | Pokemon "Skitty" 44 |
| 19 | GV-PK-WCD-2004-BLAZIKEN_TECH-07-EX_HIDDEN_LEGEND-16-BELLOSSOM | special_lane | Pokemon "Bellossom" "2004 World Championships Deck: Blaziken Tech" "16" "2004 World Championships Deck: Blaziken Tech" |
| 20 | GV-PK-WCD-2004-BLAZIKEN_TECH-07-EX_HIDDEN_LEGEND-16-BELLOSSOM | strict_identity | Pokemon "Bellossom" "2004 World Championships Deck: Blaziken Tech" "16" |
| 21 | GV-PK-WCD-2004-BLAZIKEN_TECH-07-EX_HIDDEN_LEGEND-16-BELLOSSOM | name_number | Pokemon "Bellossom" 16 |
| 22 | GV-PK-WCD-2004-BLAZIKEN_TECH-08-EX_HIDDEN_LEGEND-68-ODDISH | special_lane | Pokemon "Oddish" "2004 World Championships Deck: Blaziken Tech" "68" "2004 World Championships Deck: Blaziken Tech" |
| 23 | GV-PK-WCD-2004-BLAZIKEN_TECH-08-EX_HIDDEN_LEGEND-68-ODDISH | strict_identity | Pokemon "Oddish" "2004 World Championships Deck: Blaziken Tech" "68" |
| 24 | GV-PK-WCD-2004-BLAZIKEN_TECH-08-EX_HIDDEN_LEGEND-68-ODDISH | name_number | Pokemon "Oddish" 68 |
| 25 | GV-PK-WCD-2004-BLAZIKEN_TECH-09-EX_TEAM_MAGMA_VS-4-TEAM_AQUAS_MANECTRIC | special_lane | Pokemon "Team Aqua's Manectric" "2004 World Championships Deck: Blaziken Tech" "4" "2004 World Championships Deck: Blaziken Tech" |
| 26 | GV-PK-WCD-2004-BLAZIKEN_TECH-09-EX_TEAM_MAGMA_VS-4-TEAM_AQUAS_MANECTRIC | strict_identity | Pokemon "Team Aqua's Manectric" "2004 World Championships Deck: Blaziken Tech" "4" |
| 27 | GV-PK-WCD-2004-BLAZIKEN_TECH-09-EX_TEAM_MAGMA_VS-4-TEAM_AQUAS_MANECTRIC | name_number | Pokemon "Team Aqua's Manectric" 4 |
| 28 | GV-PK-WCD-2004-BLAZIKEN_TECH-10-EX_TEAM_MAGMA_VS-53-TEAM_AQUAS_ELECTRIKE | special_lane | Pokemon "Team Aqua's Electrike" "2004 World Championships Deck: Blaziken Tech" "53" "2004 World Championships Deck: Blaziken Tech" |
| 29 | GV-PK-WCD-2004-BLAZIKEN_TECH-10-EX_TEAM_MAGMA_VS-53-TEAM_AQUAS_ELECTRIKE | strict_identity | Pokemon "Team Aqua's Electrike" "2004 World Championships Deck: Blaziken Tech" "53" |
| 30 | GV-PK-WCD-2004-BLAZIKEN_TECH-10-EX_TEAM_MAGMA_VS-53-TEAM_AQUAS_ELECTRIKE | name_number | Pokemon "Team Aqua's Electrike" 53 |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1 acquisition only. Package fingerprint: d559f29dccb92922cf9e945e3a00e4e6ac4221779f7d91b8fba789f0005362cb. Request manifest hash: 4752a516ed812b95cf34c555b2520ae628b7babe7fddffbe96bc9cfc446ad277. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: fetch a capped local-artifact-only smoke batch from the MEE-11D dry-run plan, using ebay_active Browse API requests only and writing local acquisition artifacts only. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
