# MEE Operational Recovery V1

## Context

The Market Evidence Engine had accumulated production-only hotfixes in a mutable checkout. Raw acquisition continued to succeed, but downstream projection repeatedly failed at production scale. The nightly timer was disabled after disk pressure and repeated partial failures.

The recovery branch starts from the exact deployed Git SHA `00206f724946ad6842f32185376886cd4c5bca10`. The production runtime code and tracked diff were archived before repair.

## Problem

The failures were not one defect:

- the nightly planner repeatedly selected batch one, so the same first 4,000 requests were refreshed instead of rotating through the 8,400-request manifest;
- rollup planning scanned large unscoped evidence sets and timed out;
- successful provider and warehouse phases were not a durable resume boundary;
- retrying the wrapper could repeat paid acquisition;
- runtime artifacts were written into the deployed Git checkout;
- optional aggregate readbacks could turn a successful ingest into a failed service;
- the deployed checkout was dirty, so its SHA did not identify the code that actually ran.

## Risk

Blind retries could spend provider quota twice, produce more duplicate evidence, fill the host disk, or obscure a partial success. A broad cleanup could destroy valid market evidence. A direct cutover to a new timer could repeat the same failure unattended.

## Decision

Repair the pipeline without deleting or rewriting evidence:

- preserve all existing warehouse rows;
- make the schema change additive;
- scope every projection to one exact acquisition run;
- persist an append-only rotating acquisition cursor;
- persist phase `started`, `succeeded`, and `failed` evidence;
- refuse automatic provider refetch after any prior provider attempt for a run;
- resume idempotent non-provider phases from an external state artifact;
- deploy immutable Git releases through an atomic symlink;
- keep the timer disabled until bounded canaries and unattended-cycle gates pass;
- keep candidates, rollups, and all recovery output non-public and review-only.

## Alternatives Rejected

- Delete old rows and restart: rejected because valid evidence would be destroyed.
- Rerun the failed night from the beginning: rejected because raw acquisition already succeeded.
- Increase statement timeouts only: rejected because it preserves unscoped scans and does not address retries or rotation.
- Continue patching `/opt/grookai_vault_mee_nightly`: rejected because a dirty checkout has no reproducible provenance.
- Enable the timer immediately after migration: rejected because bounded live proof must come first.

## Preserved Baseline

- Production code archive: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/mee-runtime-code-baseline-20260802.tar.zst`
- Archive SHA-256: `ff7456d7485decd37bf4ad9af9119957e6e422ae49ac03760743244de6554ba2`
- Raw deployed diff archive: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/deployed_runtime_tracked_raw.diff.zip`
- Raw diff archive SHA-256: `af8b296c27fa12b87bc61acdbb2076be2df0d4ee016f870123ebc27b8dd2a395`
- Runtime status: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/deployed_runtime_status.txt`
- Database baseline: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/pre_repair_database_readback.json`

No market evidence was deleted, truncated, remapped, or published during baseline capture.

## Current Truths

- The production timer is intentionally disabled.
- The August 2 raw acquisition and warehouse backfill succeeded.
- That run is `MEE-11L-DAILY-BATCH-802cd59b40ea`, acquisition-run ID `24eea869-8fab-2b1a-7da9-a124e18caa22`.
- The August 2 candidate projection failed from a statement timeout.
- The recovery migration and runtime are implemented locally but are not considered production-proven until apply/readback and canary gates complete.
- Existing MEE evidence remains internal and does not authorize a public or app-visible price.
- Production migration history contains `20260801153800` and `20260801160000`, originally applied from `fix/mobile-runtime-performance-images-v1`. Their exact SQL files are carried forward in this branch to close repository-history drift; they are already applied and are not part of the MEE write gate.

## Invariants

- No delete, truncate, or destructive evidence rewrite.
- No canonical identity, vault, image, or public pricing writes.
- A provider phase is never repeated automatically after success, failure, or indeterminate termination.
- Every downstream plan receives the exact source acquisition run key.
- Cursor movement is append-only and occurs only after warehouse apply succeeds.
- Source-manifest drift blocks an incomplete rotating cycle.
- The disk floor is checked before provider calls.
- Runtime artifacts live outside immutable release directories.
- Optional reporting failures are warnings; critical warehouse/projection failures remain failures.

## What Must Never Be Broken

- Raw and derived market evidence must remain distinguishable.
- Review-only candidates and rollups must never become market truth through this worker.
- A service exit code must report partial success accurately.
- Missing local state plus a prior provider attempt must fail closed.
- Deployment SHA must identify the exact tracked release that ran.
- Rollback must switch code releases without deleting additive database state.

## Verification State

- Targeted recovery contracts: `30/30` passed.
- Repository contract suite: `683/683` passed.
- Node syntax checks: passed.
- Pipeline V2 dry-run: passed with zero provider calls and zero DB writes.
- `git diff --check`: passed.
- The local commit hook's database preflight could not run because the isolated recovery worktree intentionally has no production `SUPABASE_DB_URL`; production readback is a separate protected-server gate.

## Release Gates

1. Freeze and push a clean repair commit.
2. Confirm the MEE timer and service are stopped.
3. Apply the additive migration and verify schema, grants, RLS, policies, and migration history.
4. Reprocess the August 2 run from its existing warehouse rows, with zero provider calls.
5. Deploy the immutable release with the timer disabled.
6. Run a bounded 50-call live canary.
7. Run a bounded 500-call live canary only if the 50-call gate reconciles.
8. Run a full 4,000-call rotating-cycle canary only if the bounded gates pass.
9. Enable the timer only after code, data, artifact, cost, and disk reconciliation is clean.
10. Observe three successful unattended cycles before declaring operational recovery complete.

## Exact Next Gate

Freeze the repair commit, apply the additive migration while the timer remains disabled, and perform schema/security readback. Do not make a provider call at this gate.
