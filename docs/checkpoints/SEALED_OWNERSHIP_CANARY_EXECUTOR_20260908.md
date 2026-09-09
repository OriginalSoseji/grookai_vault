# Sealed Ownership Canary Executor

Date: September 8, 2026 MDT. Scope: implement/test the next bounded transition;
no production activation, inventory mutation, deployment or schema change.
Parent checkpoint: `SEALED_OWNERSHIP_CANARY_SCHEMA_APPLIED_20260908.md`.
Starting commit: `904ad110d03fa83e50abc5cea3195a23a45be4ef`.

## Implemented

- Shared snapshot collector for the original read-only planner and executor.
- Exact source-plan byte/hash validation and producer ancestry checks.
- Read-only prepare/readback and separately gated activate/rollback commands.
- Fresh checks before writes and again under bounded control/owner/release locks.
- One grant, two variant grants, one canary flag update; global flag stays false.
- Rollback revokes only the exact sole grant and preserves current inventory,
  allocator, request journal, dispositions and protected release state.
- No automatic retries; exclusive per-action marker beside the source plan.
- A lost COMMIT response requires independent readback. It never implies a
  failed transaction can safely be submitted again.
- Stored enrollment status and current open/closed window are separate.

## Evidence

Fresh production discovery and the executor's shared preflight match the frozen
source plan: 393 migrations, both switches false, zero grants and sealed copies.
The read-only collector confirmed the canonical project counts. No production
transaction was opened for writes.

64 targeted Node contracts passed. Nine real PostgreSQL checks passed on the
disposable local55430 database, including exact writes, zero-write retries,
authenticated owner/outsider capability checks, failed affected-row assertion,
preservation, revocation and two-second contention timeout. All local scenarios
ran inside one outer rollback transaction. Independent cleanup confirms zero
users, copies and grants, and restores both disabled controls/empty allowlists.

The SQL tests use synthetic canonical-evidence inputs to exercise the mutation
core; they do not prove production source facts or a real founder inventory.
The separate production preflight supplies that read-only evidence. Initial
fixture setup errors (UUID typing, duplicate dummy fingerprint, missing sealed
fields) were corrected without changing production or relaxing schema checks.
No local migrations or fixture commits were needed.

Evidence root:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_canary_executor/`.
It contains discovery, targeted contracts and local SQL logs. After committing
through the full shipcheck, generate the frozen execution envelope with:

```powershell
node scripts/schema/sealed_ownership_account_canary_execute_v1.mjs --mode=prepare --plan-dir=C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_account_activation_preparation/frozen --out-dir=C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_canary_executor/frozen
```

Check the actual output before claiming execution readiness. The source plan
fingerprint remains `9f6fe85507f10cde296a4d2d9e7c6b5931a37041e61f47f5d0df284f08e97405`.
Its window ends 2026-09-10T01:15:50.439Z. If drift or expiry blocks preparation,
retain the failure and prepare new source evidence; never silently substitute
variants, extend a plan in place or change production to match a stale plan.

## Remaining Release Work

1. Reconcile/deploy the verified production-configured web and mobile clients.
   Do not ship the local-only simulator build316 or local Supabase definitions.
2. Execute the separately authorized, current account-canary scope and record
   independent readback. The prior schema-only authority is consumed.
3. Add only genuinely owned products through the app. Never fabricate ownership,
   sale/trade events or transfers to satisfy acceptance.
4. Verify live totals, privacy, Wall, sharing/printing and intended lifecycle
   operations; reconcile before broader release. Keep rollback available.

Local transition tests are complete, not production ownership rollout.
