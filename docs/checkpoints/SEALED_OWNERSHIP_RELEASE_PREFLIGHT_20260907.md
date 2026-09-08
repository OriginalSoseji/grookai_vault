# Sealed Ownership Release Preflight

Date: 2026-09-07 America/Denver (evidence 2026-09-08 UTC).
Status: narrow privilege repair verified locally; NOT production-applied or live.
Historical preflight status. The approved batch is now applied and independently
verified; see `SEALED_OWNERSHIP_SCHEMA_APPLIED_20260907.md`. Do not reapply it.
Branch: `feature/sealed-owned-collectibles-v1`.

## Fresh Production Evidence

Read-only canonical project check: 170,404 cards, 3,397 sets and 32,903 traits.
Production has 387 migration versions. No remote-only versions; exactly the
four planned migrations remain pending. The new ownership objects are absent.

All 3,401 existing owned copies satisfy the current anchor precondition; all
three disposition rows have card anchors. No invalid image dimension tuples
would block the pending repair. These are aggregate checks, not a copy of user data.
Active frozen sealed releases have 2,182 MTG, 1,720 Pokemon and 332 One Piece
members. Release membership alone does not prove signed-in client eligibility,
fresh pricing or image visibility.

The read-only public schema comparison found 871 existing security objects
unchanged. Two existing relation records differ only in the new column list;
their owners, ACLs and RLS remain unchanged. New objects are confined to sealed
ownership. Two Storage SELECT policies differ as specified by the migration.
Generated diagnostic SQL is NEVER an apply script.

## Repair Found At This Gate

Supabase's default privileges gave the new service-only control table, request
journal and evidence view broad service-role privileges despite narrower GRANT
statements. PostgreSQL GRANT adds permissions; it does not remove inherited ones.

Both still-unapplied ownership migrations now explicitly REVOKE service-role
defaults before granting only:

- Controls: SELECT, UPDATE.
- Request journal: SELECT, INSERT. No UPDATE, DELETE or TRUNCATE.
- Evidence view: SELECT.

Anonymous and authenticated direct access remains denied. RPC behavior, client
code, default-off controls and existing card/slab grants are unchanged.
No production repair or cleanup was necessary because the feature is not applied.

The new SQL test first failed against the prior candidate on unexpected
`sealed_ownership_controls_v1: service_role INSERT`, then passed after the repair.
It checks all eight table privileges for service/anonymous/authenticated roles
and attempts actual journal UPDATE, DELETE and TRUNCATE under service_role.

## Evidence

Root: `C:/grookai_vault_operator_artifacts/sealed_ownership/`.

- `20260907_frozen_rollout_plan/2026-09-08T03-32-51-355Z_readiness`: fresh read-only data and ledger check.
- `20260907_frozen_rollout_plan/2026-09-08T03-34-52-078Z_footprint`: preserved pre-repair schema/security finding.
- `2026-09-08T03-37-23-239Z_checks`: 97 targeted contracts, 38 Flutter tests, 12 web tests; analysis/types/lint/diff pass.
- `2026-09-08T03-37-49-730Z_fixtures`: 36 SQL scenarios including concurrency and real local Auth/Storage readback pass.
- `2026-09-08T03-37-59-800Z_replay`: strict four-ID full replay passes in 37.225 seconds; 33 post-replay rollback scenarios pass.

Only the isolated replay database on port 55430 was reset. Fixture database
metadata was removed by replay; do not infer physical Storage file deletion.
The original local project, production, Samsung and iPhone remain unchanged.

## Next Gate

The earlier plan at source `6d46b8c2c93cb7ecabfabdcac59efbbebd886136` is
superseded, NOT valid for the repaired SQL. Preserve it as historical evidence.
Commit the repair, generate a new exact plan in
`20260907_least_privilege_rollout_plan/`, and repeat the read-only footprint check.
Do not change the old two-ID schema-baseline exception to suppress ownership DDL.

Production remains gated on exact migration authority, fresh strict preflight,
bounded migration application/readback, default-off deployment and authorized
owner lifecycle canary. Native OS share/print and iOS acceptance remain open.
Existing mixed-lot differences are documented in the local acceptance checkpoint.
Do not claim full production completion or activate clients ahead of schema.
