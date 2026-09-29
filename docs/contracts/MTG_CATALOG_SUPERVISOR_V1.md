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
6. Requires the MTG release control to be `hidden`, `signed_in` or `public`.
7. Reconciles each eligible manifest set by exact set, card, identity, printing, parent-mapping, and printing-mapping counts.
8. Stops on any partial or drifted set.
9. When the release is `signed_in` or `public`, requires every eligible set to be complete and exits successfully with no dispatch.
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
- MTG release control is not `hidden`, `signed_in` or `public`;
- an eligible set is absent after the release becomes `signed_in` or `public`;
- a selected set is partially present or count-drifted;
- the database readback fails;
- GitHub workflow state cannot be read;
- three consecutive writer runs fail, time out, or are cancelled.

Historical writer failures do not block a complete `signed_in` or `public` no-dispatch result because no writer authority is exercised. Public visibility does not relax completeness checks or grant dispatch authority. Every invocation preserves a summary, run plan, sanitized runner state, artifact hashes, and production readback when no writer is active.

## Worker timer recovery — September 29, 2026

The independently pinned worker runs the same frozen supervisor in
`--shadow-only --public-read-only` mode every 15 minutes. Its entry point accepts
no CLI arguments and cannot select dispatch mode. Public GitHub GETs resolve the
frozen writer ref and inspect bounded, unfiltered writer history; missing provider
state is a failure, never an assumed idle writer. No GitHub credential is needed.

The worker uses the existing production session pooler with a verified CA and
hostname, a read-only session and transaction, and a 60-second per-statement cap.
Its systemd unit serializes execution with flock, limits resources, and stops the
process group after ten minutes. Below 15 GB free space, or without fresh healthy
launch-critical evidence, it persists a failure/pause receipt before provider or
database access. It does not expand catalog, Storage, pricing or account authority.

Every attempt has a unique directory and an append-only terminal receipt. The
atomic latest pointer includes hashes of the saved summary, plan and readback.
The control plane verifies these hashes, runtime identity, timestamps, read-only
and TLS evidence, exact coverage, active timer and service result. Worker failures
remain failures even if GitHub has an older success. GitHub history remains in the
report; worker health does not claim GitHub's native schedule has recovered.

The unchanged freshness limit is 45 minutes. The initial automatic timer fires
after one minute, then follows a 15-minute cadence. Deployment proof requires an
actual timer-triggered terminal run, not just an enabled unit or manual execution.
Evidence remains local and append-only; off-worker archival follows the separately
authorized backup destination. No artifact cleanup is added by this repair.
