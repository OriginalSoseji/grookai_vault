# Pricing Checkpoint 55: One Piece Durable Staging Schema Offline Ready

## Current Truth

The One Piece production rollback-only canary and independent verifier passed.
The durable service-only staging schema now has an offline migration candidate,
zero-row-only rollback candidate, deterministic validator, plan generator,
contract tests, and hashable audit output.

No production connection was opened and no database or Storage write occurred.
The migration candidate remains outside `supabase/migrations`.

## Decision

Preserve the passed rollback draft unchanged and create a new durable migration
identity. The durable schema retains the proved two-table evidence boundary,
adds FORCE RLS, explicitly resets `service_role` privileges before granting
only SELECT/INSERT, and leaves the internal rejection function non-executable.

The schema apply is separated from payload staging. A future schema apply must
leave both tables empty; a later payload gate must independently authorize any
durable One Piece rows.

## Invariants

- One Piece staging is source evidence, not canonical identity.
- Singles, DON!!, sealed, quarantine, language, release, and price lanes remain
  distinct.
- No client or public role can read the tables.
- No app RPC or release pointer exists.
- Service role receives only SELECT and INSERT.
- Rows are append-only and update/delete are rejected.
- Schema apply and payload staging are separate gates.
- Canonical promotion, sealed promotion, pricing publication, and app visibility
  remain closed.
- Active MTG work is attribution-aware and may not be mutated by this gate.

## Artifacts

- Producing design commit:
  `e755cc28e9fae221f204b5dd470a7c3bf9165adf`
- Migration candidate SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Rollback candidate SHA-256:
  `60a17c8daeae7a7e306dec74178fd8b7f95368f701b41d8b5ed18447740b9bc1`
- Offline schema plan fingerprint:
  `75187d3758b726426aadcae8533ddb9ecd4083cb413850fd1c50dca5e4ad3d46`
- Contract:
  `docs/contracts/ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_V1.md`
- Migration candidate:
  `docs/sql/one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql`
- Rollback candidate:
  `docs/sql/one_piece_canonical_import_durable_staging_schema_v1_rollback_candidate.sql`
- Offline audit:
  `docs/audits/pricing/one_piece_canonical_import_durable_staging_schema_v1/offline_design_v1/`

## Exact Next Gate

Run the plan-bound production read-only preflight. Verify exact schema and
migration-version absence, security/default privileges, migration order, lock
safety, protected-domain baselines, and concurrent MTG attribution. Stop before
copying the candidate into `supabase/migrations` or applying it.
