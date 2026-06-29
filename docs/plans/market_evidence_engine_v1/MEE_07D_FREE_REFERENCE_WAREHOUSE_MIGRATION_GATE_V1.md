# MEE_07D_FREE_REFERENCE_WAREHOUSE_MIGRATION_GATE_V1

## Status

Migration gate only.

No migration was created under `supabase/migrations`. No SQL was applied. No database writes, provider calls, scraper jobs, pricing rollups, or app-visible price rows were executed.

## Purpose

Add a guarded gate for turning the reviewed `MARKET-REFERENCE-WAREHOUSE-V1` migration candidate into a real Supabase migration only after exact approval.

The gate script is:

```text
scripts/audits/market_reference_warehouse_migration_gate_v1.mjs
```

## Gate Behavior

Without `--apply`, the script writes an audit report only.

With `--apply`, the script refuses to create the migration unless all checks pass:

- package fingerprint matches
- candidate SQL hash matches
- candidate SQL ends with `commit`
- candidate SQL has no `rollback`
- no `pricing_observations` writes
- no `ebay_active_prices_latest` writes
- no public pricing view creation
- no deletes
- no existing `market_reference_warehouse_v1` migration
- exact approval text matches

## Apply Target

If approved, the script creates:

```text
supabase/migrations/20260625000000_market_reference_warehouse_v1.sql
```

It does not backfill evidence.

## Approval Text

The exact required approval text remains documented in:

```text
docs/audits/market_evidence_engine_v1/mee_07c_market_reference_warehouse_migration_candidate_approval_packet.md
```

## Next Step

Run the gate in report-only mode and keep waiting for explicit approval before creating the migration.
