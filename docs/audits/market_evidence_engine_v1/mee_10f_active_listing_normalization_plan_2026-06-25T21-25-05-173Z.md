# MEE-10F Active Listing Normalization Plan

Generated: 2026-06-25T21:25:04.830Z

## Boundary

- Plan only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No eBay latest price writes.
- No price rollups.
- No public/app-visible pricing.
- No market truth.

## Summary

| Metric | Value |
| --- | ---: |
| normalized_evidence_count | 15 |
| model_eligible_count | 0 |
| review_required_count | 13 |
| quarantined_count | 2 |
| blocked_count | 0 |
| direct_publishable_count | 0 |

## Dispositions

| Disposition | Rows |
| --- | ---: |
| quarantined_active_listing_context | 2 |
| review_required_active_listing | 13 |

## Quality Flags

| Flag | Rows |
| --- | ---: |
| active_listing_unverified | 15 |
| graded_listing_context | 2 |
| manual_review_required | 15 |
| sold_comp_missing | 15 |

## Schema Status

| Check | Value |
| --- | --- |
| current_market_reference_normalized_evidence_allows_ebay_active | false |
| current_disposition_constraint_allows_active_listing_review_candidate | false |
| requires_schema_extension_before_persisting_normalized_rows | true |

## Review Required Samples

| GV ID | Price | Disposition | Flags |
| --- | ---: | --- | --- |
| GV-PK-COL-SL1 | 344.99 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL5 | 238.16 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL5 | 250 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL5 | 288 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL6 | 351.26 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL8 | 189.68 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL8 | 152.5 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | 106.07 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | 89.95 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | 150 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | 100 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-BW04 | 5.62 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |
| GV-PK-PR-BLW-BW04 | 4.57 USD | review_required_active_listing | active_listing_unverified, manual_review_required, sold_comp_missing |

## Quarantined Samples

| GV ID | Price | Disposition | Flags |
| --- | ---: | --- | --- |
| GV-PK-COL-SL6 | 1200 USD | quarantined_active_listing_context | active_listing_unverified, graded_listing_context, manual_review_required, sold_comp_missing |
| GV-PK-COL-SL8 | 450 USD | quarantined_active_listing_context | active_listing_unverified, graded_listing_context, manual_review_required, sold_comp_missing |

## Findings

- none
