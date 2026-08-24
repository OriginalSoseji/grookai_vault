# Production Supabase Nonproduction Restore Exercise V1

**Status:** prepared, not authorized for execution

## Purpose

Prove that the production Supabase backup can be restored into an isolated
nonproduction destination and reconciled without modifying production.

## Hard Boundaries

- No restore into the production project.
- No production DNS, Vercel, mobile, Edge Function, Storage, or database
  pointer changes.
- No RLS or grant widening.
- No production database, Auth, Storage, pricing, canonical, or Vault writes.
- No destination project creation or paid capacity allocation without explicit
  cost authorization.
- No destination deletion until its audit artifacts and teardown scope are
  reconciled.

## Frozen Inputs

Before execution, write `restore_plan.json` with:

- production project ref;
- source backup identifier and timestamp;
- source migration-ledger head;
- source schema fingerprint;
- destination organization and project ref;
- destination region, compute, and disk allocation;
- expected one-time and hourly cost;
- executor commit SHA;
- zero-production-write boundary; and
- reconciliation query-set version and hash.

## Preflight

Run the read-only preflight first:

```powershell
npm run production:supabase:restore-preflight
```

With an existing isolated destination, provide its exact evidence:

```powershell
npm run production:supabase:restore-preflight -- `
  --destination-project-ref=<20-character-ref> `
  --destination-capacity-gb=<provider-confirmed-gb> `
  --destination-isolation-confirmed
```

The command reads project and backup inventory, opens a read-only production
database transaction, fingerprints the migration ledger and schema, calculates
the minimum destination capacity with 20 percent restore headroom, and writes
hashed artifacts under `C:\secure-ops`. It cannot create a project or start a
restore. Even a passing preflight reports `restore_execution_allowed: false`;
execution remains a separately authorized provider action.

1. Confirm the selected backup remains within the seven-day retention window.
2. Confirm destination isolation and that no production secret points to it.
3. Confirm destination disk is large enough for the source database plus
   restore working headroom.
4. Capture source counts and fingerprints using read-only queries.
5. Confirm production connection, lock, disk, and backup health.
6. Hash the frozen plan before restore starts.

Current read-only result on `2026-08-24`:

- only the production project exists in the organization;
- latest physical backup is completed and WAL-G is enabled;
- source schema and migration-ledger fingerprints were captured;
- minimum isolated destination capacity is `277 GB`; and
- preflight is blocked because no isolated destination or destination-capacity
  evidence exists.

## Restore

1. Start one Supabase restore-to-new-project operation from the frozen backup.
2. Record provider operation ID, start time, heartbeat state, and completion.
3. Do not retry automatically. Preserve a provider failure exactly and stop.
4. Record destination ref and deployed database version after completion.

## Reconciliation

Read only from source and destination. Compare:

- migration-ledger versions and hashes;
- schemas, tables, views, functions, grants, and RLS policies;
- canonical game, set, card, printing, and mapping counts;
- pricing source, qualification, publication, and active-pointer counts;
- Vault ownership, binder, wall, memory, profile, and relationship counts;
- Auth user count without exporting secrets;
- Storage bucket and object-reference counts without copying objects; and
- representative signed-in search, Vault, pricing, image, memory, and sharing
  reads against the destination.

Every mismatch must be classified as expected-after-backup-time,
source-volatile, restore defect, or unresolved. An unresolved mismatch fails
the exercise.

## Pass Criteria

- Provider restore completes once without an unbounded retry.
- Destination schema and migration ledger match the selected recovery point.
- Durable source data reconciles to that recovery point.
- RLS, grants, and service-role boundaries remain intact.
- Representative signed-in reads pass against the destination.
- Production receives zero writes and zero pointer changes.
- Restore duration and achieved recovery point are recorded.
- Artifacts reconcile and hashes verify.

## Teardown

Destination deletion is a separate destructive action. Before deletion:

1. preserve the final report, provider metadata, hashes, and count readbacks;
2. prove the exact destination project ref;
3. confirm no client, worker, secret, or DNS reference points to it; and
4. obtain explicit deletion authorization.

If teardown is not authorized, pause the destination and record its owner,
cost, and expiry decision.
