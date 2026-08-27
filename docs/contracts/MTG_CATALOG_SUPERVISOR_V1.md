# MTG Catalog Supervisor V1

## Purpose

The MTG catalog supervisor is a read-only watchdog. It proves current catalog
coverage and records the next eligible shadow candidate without dispatching
canonical ingestion from any scheduled invocation.

It is an observer, not a writer. The historical frozen writer is outside
background catalog automation and requires a separate explicit authorization.

## Frozen Authority

- Runner workflow ID: `335602786`
- Runner ref: `agent/mtg-pointer-release-v1`
- Runner commit: `7e9f2bb92f56335a6a352f655e12000b344a63a4`
- Manifest SHA-256: `1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1`
- Frozen manifest eligibility baseline: `2026-08-16`
- Maximum observed candidate range: `35` execution-order rows
- Maximum consecutive failed writer runs: `3`

## Operation

The default-branch workflow runs after every completed historical MTG writer run
and every 15 minutes as a shadow-only recovery watchdog.

For each invocation it:

1. Resolves the runner ref and requires the exact frozen commit.
2. Reads the writer workflow state.
3. Exits successfully when a writer is active or queued.
4. Stops after three consecutive failed, cancelled, or timed-out writer runs.
5. Opens a production database transaction in read-only mode.
6. Requires the MTG release control to be `hidden` or `signed_in`.
7. Reconciles each eligible manifest set by exact set, card, identity, printing, parent-mapping, and printing-mapping counts.
8. Stops on any partial or drifted set.
9. When the release is `signed_in`, requires every eligible set to be complete and exits successfully with no dispatch.
10. When the release is `hidden`, identifies the first absent eligible execution ordinal.
11. Writes `run_plan.json` and marks the row as a shadow candidate.
12. Performs no dispatch and grants no canonical authority.

The writer remains idempotent. A timeout or cancellation is resumed from production readback, not from an assumed cursor.

## Hard Boundaries

The supervisor has no authority to:

- write to the database;
- dispatch a canonical writer from a scheduled invocation;
- alter MTG release visibility;
- update or delete canonical rows;
- write Storage objects or image pointers;
- publish pricing;
- mutate Vault data;
- change the frozen manifest, payload inventory, writer branch, or writer commit;
- run more than one writer concurrently.

GitHub permissions are limited to `contents: read` and `actions: read`.

## Stop Conditions

Automation fails closed when:

- the frozen runner ref moves;
- the manifest hash or contract validation changes;
- MTG release control is neither `hidden` nor `signed_in`;
- an eligible set is absent after the release becomes `signed_in`;
- a selected set is partially present or count-drifted;
- the database readback fails;
- GitHub workflow state cannot be read;
- three consecutive writer runs fail, time out, or are cancelled.

Historical writer failures do not block a complete `signed_in` no-dispatch result because no writer authority is exercised. Every invocation preserves a summary, run plan, sanitized runner state, artifact hashes, and production readback when no writer is active.
