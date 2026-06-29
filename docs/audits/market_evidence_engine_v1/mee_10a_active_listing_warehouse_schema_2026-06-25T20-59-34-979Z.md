# MEE-10A Active Listing Warehouse Schema Candidate

- Package: `MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1`
- Ready: `true`
- Applied: `false`
- Migration hash: `9c3b473529416edf0798d510469e924b1b2da3229af960fd06de4954438ff807`
- Package fingerprint: `90dd41c35fe3bdeba555951963c57ad04b5970940d561adc3eedc3a23f22e7ab`
- Source backfill plan fingerprint: `7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0`
- Migration path: `supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql`

## Scope

- Constraint-only extension for internal warehouse evidence.
- Allows `ebay_active` / `active_listing` candidates.
- Preserves review gate and no-direct-publish constraints.
- Preserves existing service-role-only RLS policies.
- No remote migration apply in this step.

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: 9c3b473529416edf0798d510469e924b1b2da3229af960fd06de4954438ff807. Package fingerprint: 90dd41c35fe3bdeba555951963c57ad04b5970940d561adc3eedc3a23f22e7ab. Source backfill plan fingerprint: 7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0. Scope: execute supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, extending internal market_reference_* warehouse constraints for reviewed ebay_active active-listing evidence. Then mark only migration version 20260625020000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No db push. No global apply.
```
