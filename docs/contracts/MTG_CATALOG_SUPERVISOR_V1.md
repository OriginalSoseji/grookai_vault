# MTG Catalog Supervisor V1

## Purpose

The MTG catalog supervisor keeps the approved hidden MTG canonical ingestion moving without local-computer uptime or repeated operator dispatches.

It is an orchestrator, not a writer. The existing frozen writer remains the only database mutation authority.

## Frozen Authority

- Runner workflow ID: `335602786`
- Runner ref: `agent/mtg-pointer-release-v1`
- Runner commit: `7e9f2bb92f56335a6a352f655e12000b344a63a4`
- Manifest SHA-256: `1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1`
- Eligibility boundary: `2026-08-16`
- Maximum dispatched range: `35` execution-order rows
- Maximum consecutive failed writer runs: `3`

## Operation

The default-branch workflow runs after every completed MTG writer run and every 15 minutes as a recovery watchdog.

For each invocation it:

1. Resolves the runner ref and requires the exact frozen commit.
2. Reads the writer workflow state.
3. Exits successfully when a writer is active or queued.
4. Stops after three consecutive failed, cancelled, or timed-out writer runs.
5. Opens a production database transaction in read-only mode.
6. Requires the MTG release control to remain `hidden`.
7. Reconciles each eligible manifest set by exact set, card, identity, printing, parent-mapping, and printing-mapping counts.
8. Stops on any partial or drifted set.
9. Selects the first absent eligible execution ordinal.
10. Writes `run_plan.json` before any dispatch request.
11. Rechecks runner activity and frozen-ref identity.
12. Dispatches at most one `apply` range through the existing writer.
13. Polls GitHub until the newly dispatched writer is visible as active.

The writer remains idempotent. A timeout or cancellation is resumed from production readback, not from an assumed cursor.

## Hard Boundaries

The supervisor has no authority to:

- write to the database;
- alter MTG release visibility;
- update or delete canonical rows;
- write Storage objects or image pointers;
- publish pricing;
- mutate Vault data;
- change the frozen manifest, payload inventory, writer branch, or writer commit;
- run more than one writer concurrently.

GitHub permissions are limited to `contents: read` and `actions: write`. The latter is used only to dispatch the frozen workflow.

## Stop Conditions

Automation fails closed when:

- the frozen runner ref moves;
- the manifest hash or contract validation changes;
- MTG is no longer hidden;
- a selected set is partially present or count-drifted;
- the database readback fails;
- GitHub workflow state cannot be read;
- three consecutive writer runs fail, time out, or are cancelled.

Every invocation preserves a summary, run plan, sanitized runner state, artifact hashes, and production readback when no writer is active.
