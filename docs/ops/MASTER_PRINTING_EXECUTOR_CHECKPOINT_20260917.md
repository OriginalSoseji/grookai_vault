# Master Printing Executor Checkpoint

Date: 2026-09-17 UTC
Status: Full local transaction proof and fresh production read-only plan; no production repair.

## Latest Evidence

Read-only audit run `35188899452` completed with failure. Source discovery hit
Bulbapedia HTTP 403 on Storm Emeralda. The independent publication gate still
ran, selected 2,389 sets including 1,382 Pokemon sets, reconciled with zero
count mismatches and updated issue #475 despite the upstream failure. This
proves the repaired deployed inclusion/notification path. The discovery HTTP
failure remains a separate unresolved automation defect. All 1,382 Pokemon
cover probes also lack evidence in this reader; do not interpret that as proof
that every collector UI cover is missing without checking its separate read path.

The runner and guards now have 43 contract tests. Production preparation passed
with zero writes through verified TLS using the existing Linux execution host.
The exact producer is preserved under `production-read-v1/producer`; it has
not been deployed as an unattended writer.

Production plan fingerprint:
`d4b2adec770af1547c29dfa2b9f65252f465cd89dcc1707f00ff0e6e14c36798`

Production environment: 170,658 cards, 3,399 sets, 32,903 traits. The fresh plan
preserves 25 parent mappings and no existing Vault/binder/disposition rows were
found in the five scoped footprint queries. Local and production columns,
constraints, indexes, triggers, rewrite rules and public printing RPC match
exactly. Read `rehearsal-production-parity.json`.

Source root for these receipts:
`C:/grookai_vault_operator_artifacts/master_index_executor_20260917/`

Preparation receipts:
`production-read-v1/read-only-preparation-v3/`

Two earlier read-only attempts were preserved: the first used the wrong
dependency directory; the second correctly refused a direct-host environment
instead of the required pooler. Neither reached a database mutation. The working
dependency root is `/opt/grookai_vault/backend`. The existing pooler environment
was discovered and verified, not copied or changed; its path is in the private
operator command receipt. Do not print its contents or commit credentials.

Exact write authorization, production rollback/apply, independent readback and
collector verification remain pending. Source review is not execution authority.

## Safeguard Release

PR #474 received two valid review findings. Commit
`e9fc2654d700afd83a8105fff901dda0525ec06b` repairs full parent-field
readback and publication issue notifications after upstream failure. Both
normal local hooks passed, including the web build and 728 Flutter tests.
The 103-test targeted suite includes 19 new regressions. Review threads were
answered and resolved after the fix was pushed. All GitHub code checks passed.
PR #474 was squash-merged normally at `2026-09-17T06:13:04Z`, producing main
`4badc65ff7bf470edb99cd83559a94a0c0046110`. No branch protection was bypassed.
The new Vercel preview independently confirmed the unchanged activation guard.

Read-only audit run `35188899452` was dispatched once from that exact main SHA
at `2026-09-17T06:13:28Z` and verified queued. Poll that same run, do not start a
duplicate. It must prove the deployed default-public Pokemon coverage and issue
reporting; expected catalog findings are not proof of an executor failure.
Latest older scheduled run `35185762972` failed against the previous main SHA.

## Executor

Worktree: `C:/grookai_vault_master_printing_executor_20260917`
Branch: `fix/master-printing-executor-20260917`

`backend/catalog/master_index_printing_execution_v1.mjs` provides a bounded
transaction for the reviewed McDonald's 2021 English base release only:

- One raw evidence record containing the reviewed Master Index manifest.
- 25 new Holo children, retaining all 25 existing Normal UUIDs.
- Compare-and-swap changes to only two absent provenance fields on existing rows.
- 50 append-only truth reviews; no overwritten reviews.
- Exact full-parent and retained-child checks, schema/trigger/rule fingerprint,
  cross-scope UUID/GV-ID collision reads, fixed counts and dependency digests.
- Exact public printing RPC parity before commit.
- Rollback, independent readback and zero-write repeat classification.
- Uncertain COMMIT and failed ROLLBACK are reported, never silently retried.

The runner contract is `docs/contracts/MASTER_PRINTING_EXECUTION_V1.md`.
Its transaction double is explicitly not a substitute for PostgreSQL proof.
The CLI's read-only production path is verified; production write modes remain
gated by exact authority and rollback proof.

## Full Local PostgreSQL Proof

Evidence: `C:/grookai_vault_operator_artifacts/master_index_executor_20260917/local-transaction-v1/`

An isolated local database, `grookai_mcd21_executor_20260917_v3`, was restored
from the existing loopback backend without resetting the original. Local schema,
constraints and public RPC were used. Production parent snapshots were seeded
with only the game foreign key adapted to the local game's UUID. Existing child
JSON matched the frozen production before rows exactly, including image fields
and microsecond timestamps. This is not a production plan or freshness proof.

Verified:

1. Preflight issued no canonical mutation.
2. Complete raw/child/provenance/review transaction produced 50 exact RPC options.
3. Rollback restored the exact original state.
4. An actual duplicate-key error immediately before commit rolled back all work.
5. A local commit succeeded; an independent connection verified exact readback.
6. A repeat execution wrote zero rows, including zero raw evidence records.

Read `result.json`, `rollback.json`, `forced_collision_rollback.json`,
`local_apply.json`, `independent_readback.json`, `zero_write_replay.json`,
`schema_and_rpc.json` and `execution_plan_local_only.json`.

Local restore exclusions are explicit: scheduler/network extensions and their
entries, plus privilege event triggers, are not replayed. Two failed local
restore attempts were preserved: pg_cron requires the configured primary
database; the ordinary local role cannot restore a realtime function's logging
setting. The successful restore used the existing local admin role, without
changing roles or production permissions. No local replay databases were deleted.

## Remaining Gates

1. Repair the separate discovery HTTP 403 failure classification; verify an actual
   scheduled run subsequently uses the merged code. Merge and deployed printing
   issue reporting are complete. Do not dispatch duplicate audit runs.
2. Finish normal code release checks for the executor and freeze its final
   source/code hashes with the reviewed checked-in manifest. Rebind a changed
   producer; never reuse an older fingerprint for different code.
3. Repeat fresh production preflight immediately before an authorized execution;
   current schema/RPC parity is proven, not a substitute for transactional checks.
4. Follow the bounded production-apply authority contract. The local rehearsal
   is not mutation approval and its local plan must never be used in production.
5. Production rollback/readback/idempotency and collector/Vault verification.
6. Continue the full catalog worklist; this first set is not catalog completion.

Preserve the completed anniversary repair, ME04 truth constraints, existing IDs,
ownership, mappings, prices, images and all unrelated worktrees. No production
database, Storage, pricing, ownership or visibility writes occurred in this step.
