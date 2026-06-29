# MEE-09R Remaining Single-Source Exact Source Backfill Plan

- Package: `MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-PLAN-V1`
- Ready for apply package: `false`
- Ready for schema extension plan: `true`
- Candidate evidence manifest hash: `18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168`
- Source package fingerprint: `aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077`
- Package fingerprint: `7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0`
- Proposed candidate rows: `15`
- Proposed normalized rows: `0`

## Boundary

- Plan only.
- No provider calls.
- No source fetches.
- No DB writes.
- No pricing observations writes.
- No eBay latest price writes.
- No public/app-visible pricing.
- No price rollups.

## Why Apply Is Blocked

The current `market_reference_*` warehouse schema only allows free reference sources (`tcgcsv_reference`, `pokemontcg_io_reference`) and requires `source_type = reference`. The MEE-09Q rows are `ebay_active` active-listing evidence. They should stay reviewed/internal, but they need a schema extension before they can be stored honestly.

## Candidate Source Counts

| Source | Rows |
| --- | ---: |
| ebay_active | 15 |

## Candidate Source Type Counts

| Source type | Rows |
| --- | ---: |
| active_listing | 15 |

## Findings

- warehouse_schema_does_not_allow_ebay_active_source
- warehouse_schema_requires_reference_source_type_only
- active_listing_evidence_requires_market_reference_schema_extension

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1 migration candidate only. Source backfill plan fingerprint: 7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0. Candidate evidence manifest hash: 18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168. Scope: prepare local migration candidate to extend internal-only market_reference_* warehouse support for reviewed active-listing evidence sources such as ebay_active, including source/type constraints and service-role-only policies only. No remote migration apply. No evidence backfill. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
