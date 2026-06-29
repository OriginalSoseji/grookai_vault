# MEE-09E Market Reference Signal Rollups Remote Schema Apply

- Package: `MARKET-REFERENCE-SIGNAL-ROLLUPS-V1`
- Scope: targeted remote schema apply only
- Linked project: `ycdxbpibncqcchqiihfz`
- Migration: `supabase/migrations/20260625010000_market_reference_signal_rollups_v1.sql`
- Migration hash: `eb2f1aa4a01977d455e131ec7f90b3d8250e2501f65cdc6199a9b2072dd82d41`

## Apply Proof

- Executed `supabase db query --linked -f supabase/migrations/20260625010000_market_reference_signal_rollups_v1.sql`
- Apply returned package id `MARKET_REFERENCE_SIGNAL_ROLLUPS_V1_MIGRATION_CANDIDATE`
- Proposed table count: `1`
- Proposed index count: `4`
- Proposed service-role policy count: `1`
- Writes pricing observations: `false`
- Writes eBay latest prices: `false`
- Publishes public prices: `false`
- Creates app-facing pricing view: `false`
- Creates market truth rollup: `false`

## Migration History

- Executed `supabase migration repair 20260625010000 --status applied --linked --yes`
- Repaired only migration version `20260625010000` as applied.
- Verified `20260625000000` remains applied.
- Verified unrelated local-only migration `20260523183000` remains unapplied remotely.

## Remote Readback

- `public.market_reference_signal_rollups` exists: `1`
- Row count: `0`
- RLS enabled: `true`
- Service-role policy: `market_reference_signal_rollups_service_role_all`
- Policy roles: `{service_role}`
- Policy command: `ALL`

## Boundary

- No rollup backfill.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No identity-table writes.
- No vault writes.
- No image writes.
- No deletes.
- No merges.
- No `db push`.
- No global apply.
