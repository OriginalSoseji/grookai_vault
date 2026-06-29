# MEE-10G Active Listing Normalized Evidence Schema Candidate

- Package: `MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-SCHEMA-V1`
- Ready: `true`
- Applied: `false`
- Migration hash: `0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90`
- Package fingerprint: `d1bf67580def34c834c68c2ae38b12bab178a503ac8861733f23330b2956f489`
- Migration path: `supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql`

## Scope

- Constraint-only extension for internal normalized evidence.
- Allows `ebay_active` review/quarantine dispositions.
- Enforces `model_eligible=false` for every `ebay_active` normalized evidence row.
- Preserves existing service-role-only RLS policies.
- No remote migration apply in this step.

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: 0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90. Package fingerprint: d1bf67580def34c834c68c2ae38b12bab178a503ac8861733f23330b2956f489. Scope: execute supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, extending internal market_reference_normalized_evidence constraints for review-only ebay_active normalized evidence with model_eligible=false. Then mark only migration version 20260625030000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No db push. No global apply.
```
