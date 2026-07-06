# MEE-07C Market Reference Warehouse Migration Candidate Approval Packet

## Status

Approval packet only.

No migration was created under `supabase/migrations`. No SQL was applied. No database writes, provider calls, scraper jobs, pricing rollups, or app-visible price rows were executed.

## Candidate

```text
docs/sql/market_reference_warehouse_v1_migration_candidate.sql
```

## Verification

```text
node --test tests/contracts/market_evidence_engine_*.test.mjs
50/50 passing
```

## Hashes

```text
Dry-run SQL hash: 1c546a65a6e898033037ca42cbcfd26a069a955fe1dff4469c8870c4696c344d
Migration candidate SQL hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f
Package fingerprint: 8a10a0213297ee37d44cc038560569b2a22fcde31222771d0b5aab1ee9fea39d
```

## Approval Text

Use this exact text only if the migration candidate should become a real Supabase migration:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-V1 migration candidate apply only. Fingerprint: 8a10a0213297ee37d44cc038560569b2a22fcde31222771d0b5aab1ee9fea39d. SQL hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: create 5 free-reference Market Evidence Engine warehouse tables, supporting indexes, RLS enablement, and service-role-only policies only. No evidence backfill. No provider calls. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```

## Apply Boundary

If approved, the next step is to copy the reviewed SQL shape into a timestamped file under:

```text
supabase/migrations/<timestamp>_market_reference_warehouse_v1.sql
```

That step should not backfill evidence. Backfill should be a separate package after the schema exists.
