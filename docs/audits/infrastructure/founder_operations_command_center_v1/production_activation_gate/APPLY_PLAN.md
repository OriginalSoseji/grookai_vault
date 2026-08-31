# Founder Operations Production Apply Plan V1

- Status: **FROZEN / NOT EXECUTED**
- Source SHA: `a5fdcbc09571934266d967f6fc039c9ce3ea3123`
- Branch: `feature/founder-operations-command-center-v1`
- Migration: `20260830233000_founder_operations_command_center_v1.sql`
- Migration SHA-256: `02072d8460785539a6ceed76eef18e39f2fc4eaa99afb5e5064f4b2e24f90fdb`
- Ledger fingerprint: `e9f0988184dad7cd2034f6d8a29d0c6630a2e13f7a06eb5dadf0f44862bc5572`
- Apply-plan fingerprint: `da0069bb9502815b4e4e3cfefda9465864bc3d40468fa02b89f1f3a4e210952a`

## Production Preflight

The read-only production preflight found the current migration head at
`20260830210500`, zero candidate ledger rows, zero later ledger rows, zero
target relation collisions, and zero target function collisions. All required
roles and prerequisite functions are present.

## Exact Boundary

The apply may execute only the checked-in migration, create its one disabled
`operations_control_state` singleton, and insert its exact single-statement
payload into `supabase_migrations.schema_migrations` in the same transaction.
It may not write catalog, pricing, Vault, Storage, founder work-item, command,
approval, client configuration, or automation data.

Post-commit verification must independently prove schema objects, triggers,
RLS, policies, grants, RPC signatures, exact migration history, and unchanged
canonical/Vault row counts before the gate can advance.
