# Pricing Checkpoint 58: One Piece Durable Staging Schema Applied

## Current Truth

The exact One Piece durable staging migration was applied to production from
frozen commit `b9f7c458c3eaf6876031fdc4c1015d5b788e51b3`. The writer's fresh readback
and a separate read-only verifier both passed. The two tables remain empty and
private. No One Piece payload, canonical, pricing, Vault, sealed, Storage,
publication, deployment, or app-visible row was written.

## Safe Failure And Repair

The first apply attempt reached only inside-transaction verification. It found
two incorrect expected index names and rolled back before commit. A fresh
read-only residue check proved both tables and the function absent and found
zero migration-ledger rows. A rollback-only diagnostic captured PostgreSQL's
actual index inventory. The validator and plan were narrowly repaired, all 148
integrated contracts passed again, and the second execution succeeded.

The migration bytes did not change during this repair.

## Applied Proof

- Producer commit:
  `b9f7c458c3eaf6876031fdc4c1015d5b788e51b3`
- Migration SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Apply-plan fingerprint:
  `ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58`
- Ledger fingerprint:
  `6895ee219cc369ebb29e0cd66e7f30d41ab805e3c8e6d6b02a74db4ac0ef185f`
- Migration-ledger rows: `1`
- Tables: `2`
- Staging rows: `0`
- Constraints: `19`
- Indexes: `7`
- Functions: `1`
- Triggers: `2`
- Policies: `4`
- Service table grants: `4` (`SELECT` and `INSERT` only)
- Routine grants: `0`
- App-role privileges: `0`
- Service excess privileges: `0`
- Effective function execute privileges: `0`
- Protected-table writes attributable to execution: `0`
- Independent findings: `0`
- Artifact hash mismatches: `0`
- MTG release status: `hidden`

## Invariants

- One Piece staging is immutable service-only source evidence.
- Staging rows do not become canonical identities or public search records.
- Singles, DON!! cards, sealed products, quarantine, language, release state,
  and pricing evidence remain separate typed lanes.
- Service role may only read and append; update, delete, truncate, references,
  trigger, and function execution remain denied.
- Anonymous and authenticated roles have no access.
- Schema apply does not authorize payload staging.
- Payload staging does not authorize canonical or sealed promotion.
- MTG remains hidden and independently operated.

## Artifacts

- Plan:
  `docs/audits/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1/schema_apply_plan_v1/`
- Production apply:
  `docs/audits/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1/production_schema_apply_v1/`
- Independent verifier:
  `docs/audits/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1/production_schema_apply_v1_independent_verify/`

## Exact Next Gate

Create one separately fingerprinted bounded payload-staging plan from the
already frozen One Piece source manifest. The plan must preserve every selected
source payload exactly, authorize a fixed batch and row count, write only to
the two private staging tables, reconcile all hashes and counts, and stop
before canonical promotion, sealed promotion, pricing publication, or app
visibility.
