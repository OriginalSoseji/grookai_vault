# MEE-10H Active Listing Normalized Evidence Schema Remote Apply

- Package: `MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-SCHEMA-V1`
- Scope: targeted remote schema apply only
- Linked project: `ycdxbpibncqcchqiihfz`
- Migration: `supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql`
- Migration hash: `0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90`
- Package fingerprint: `d1bf67580def34c834c68c2ae38b12bab178a503ac8861733f23330b2956f489`

## Apply Proof

- Executed `supabase db query --linked -f supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql`
- Apply returned package id `MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1_MIGRATION_CANDIDATE`
- Proposed table count: `0`
- Proposed index count: `0`
- Proposed new policy count: `0`
- Keeps existing service-role-only policies: `true`
- Forces active-listing `model_eligible = false`: `true`
- Writes evidence backfill: `false`
- Writes pricing observations: `false`
- Writes eBay latest prices: `false`
- Publishes public prices: `false`
- Creates app-facing pricing view: `false`
- Creates price rollup: `false`

## Migration History

- Executed `supabase migration repair 20260625030000 --status applied --linked --yes`
- Repaired only migration version `20260625030000` as applied.
- Verified `20260625000000` remains applied.
- Verified `20260625010000` remains applied.
- Verified `20260625020000` remains applied.
- Verified unrelated local-only migration `20260523183000` remains unapplied remotely.

## Remote Readback

- `market_reference_normalized_evidence_source_check` allows `tcgcsv_reference`, `pokemontcg_io_reference`, and `ebay_active`.
- `market_reference_normalized_evidence_disposition_check` allows reference dispositions only for reference sources.
- `market_reference_normalized_evidence_disposition_check` allows `review_required_active_listing`, `quarantined_active_listing_context`, and `blocked_candidate` only for `ebay_active`.
- `market_reference_normalized_evidence_active_listing_review_only` requires every `ebay_active` normalized evidence row to keep `model_eligible = false`.

## Row Count Proof

- `market_reference_normalized_evidence` rows with `source = ebay_active`: `0`
- `market_reference_normalized_evidence` rows with `source = ebay_active` and `model_eligible = true`: `0`

## Boundary

- No evidence backfill.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No price rollups.
- No identity-table writes.
- No vault writes.
- No image writes.
- No deletes.
- No merges.
- No `db push`.
- No global apply.
