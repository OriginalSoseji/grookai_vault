# Pricing Checkpoint 56: One Piece Durable Staging Preflight Passed

## Current Truth

The plan-bound production read-only preflight passed from frozen commit
`59dd290a2ffc48bd2268d99553b1295910b29550` with zero findings and zero
database writes. The proposed migration version and name are unused, all
candidate objects are absent, the protected domains are present, and the
production connection was rolled back before local artifacts were written.

Production currently contains 7,261 active One Piece source products. No
durable One Piece staging table or row exists yet. The migration candidate
remains outside `supabase/migrations`.

## Production Readback

- Preflight fingerprint:
  `e74201c72c226c2b32e2f73f858157a86ee84124d88c7f304f72667a7d0d80f5`
- Findings: `0`
- Artifact hash mismatches: `0`
- Reserved migration version rows: `0`
- Reserved migration name rows: `0`
- Later production migrations: `0`
- Active One Piece source products: `7,261`
- MTG game rows: `1`
- MTG sets: `110`
- MTG cards: `10,346`
- MTG release status: `hidden`
- Sealed-domain rows: `0`
- Ungranted locks: `0`
- Long transactions: `0`
- Connection utilization: `0.30`

## Invariants

- This proof authorizes no One Piece staging data.
- One Piece staging remains source evidence, not canonical identity.
- No canonical, pricing, Vault, sealed, Storage, app, or publication row may
  be changed by the schema-only gate.
- The two staging tables must remain empty after schema apply.
- Public, anonymous, and authenticated roles receive no access.
- Service role receives only SELECT and INSERT on the staging tables.
- The immutable rejection function receives no external execute grant.
- MTG remains hidden and its active worker is outside this gate.
- Any schema apply must use the exact frozen migration bytes and fresh
  before/after readback.

## Artifacts

- Contract:
  `docs/contracts/ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_PREFLIGHT_V1.md`
- Live preflight:
  `docs/audits/pricing/one_piece_canonical_import_durable_staging_preflight_v1/2026-08-14T07-08-51-316Z_production_read_only/`
- Migration candidate SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Rollback candidate SHA-256:
  `60a17c8daeae7a7e306dec74178fd8b7f95368f701b41d8b5ed18447740b9bc1`
- Offline plan fingerprint:
  `75187d3758b726426aadcae8533ddb9ecd4083cb413850fd1c50dca5e4ad3d46`

## Exact Next Gate

Promote the exact migration candidate to the reserved migration path and
create a separately fingerprinted schema-only apply/readback plan. The plan
must prove exact migration-ledger insertion, empty staging tables, FORCE RLS,
effective privileges, immutable triggers, protected-domain stability, and
fresh independent verification. Do not stage One Piece payload rows in that
gate.
