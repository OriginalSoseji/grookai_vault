# Pricing Checkpoint 132: ME05 Exact Mapping Backfill Live

## Status

`PRODUCTION VERIFIED - 120 MAPPINGS - 194 CURRENT PRICE SNAPSHOTS`

## Outcome

The ME05: Pitch Black exact-mapping batch is live in the current TCGPlayer
market-price publication.

- 120 source products map to 120 intended canonical parents.
- The mappings expose 194 current price observations across their finishes.
- Independent production readback found zero mapping mismatches, zero snapshot
  target mismatches, and zero invalid USD market prices.
- Current production contains 165,769 verified snapshots from 208,577 fresh
  source observations.
- The remaining classified backlog is 42,808 observations.

## Authority and Apply Evidence

- Mapping implementation PR: `#642`
- Mapping producer commit: `42e549608a566d41246af1186a6f55f55ed457c7`
- Authority receipt:
  `artifacts/market_pricing_product_v1/me05_mapping_authority_v1/2026-10-14T06-55-27-538Z/receipt.json`
- Authority counts: 120 candidates, 120 parents, 199 printings, five bounded
  apply batches, and 194 projected gap observations.
- Durable apply run IDs:
  - `8fd238e6-f2bd-45d2-849f-e230ad9a4636`
  - `1947c026-d90c-4f28-9f35-fb472010520f`
  - `e3ffe6ac-aed9-493d-abb8-06335457d560`
  - `d7172c1e-c9f3-4bd7-9c41-e0a86a63eeaf`
  - `b5b87a25-a5a4-4dda-b9b1-c18c5141829b`

Every batch passed verified-TLS dry-run, rollback proof, durable apply, and
post-commit mapping readback. The writer changed only `external_mappings`.

## Publication Evidence

The first shadow began against the October 13 source run. While it was
materializing snapshots, the scheduled October 14 warehouse sync completed.
That correctly made the old Gym edition assignment non-current, and the guard
stopped the stale run with `edition_price_assignment_invalid`. It never
activated.

The scheduled production worker then used the fresh source and the newly
applied mappings:

- Publication run: `662685a2-d9bc-4178-8638-0da20491556d`
- Run key: `TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-10-14-publication`
- Source run: `6afde958-f5ca-4ab1-bc0d-47d8db954330`
- Producer commit: `43596c1db2d09711945fa32f8c1333ac93375e0c`
- Selected: 208,577
- Eligible and published: 165,769
- State: `verified`
- Current publication set: `d82e3e50-ab39-46b9-829b-a37c2b5bcf15`

Independent repeatable-read verification proved 120/120 exact active mappings,
194 scoped current snapshots, 120 distinct source products, 120 distinct
parents, zero target mismatches, and zero invalid prices.

## Remaining Backlog

The refreshed artifact is
`artifacts/tcgplayer_pricing_backlog_v1/2026-10-14T13-13-48-475Z`.

- Identity mapping: 30,814
- Catalog evidence: 7,422
- Exact printing: 1,874
- Source price: 1,704
- Finish assignment: 601
- Variant support: 393

All 42,808 non-published observations are assigned to an explicit repair lane.
The next high-value batch should continue exact identity mapping without
changing canonical identity, Vault state, or synthetic price policy.

