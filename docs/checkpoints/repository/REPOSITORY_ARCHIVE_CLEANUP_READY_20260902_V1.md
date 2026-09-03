# REPOSITORY_ARCHIVE_CLEANUP_READY_20260902_V1

Status: READY FOR EXACT OWNER AUTHORIZATION - NOT EXECUTED

Date: 2026-09-02 (America/Denver)

## Context

Repository reconciliation and the complete pre-archive recovery chain are
merged on `main`. The retained repository still contains hundreds of historical
local and remote branches and linked worktrees. Cleanup must reduce that
operational clutter without losing history or treating an earlier general
instruction as permission for irreversible deletion.

## Problem

Convert the verified 227-group recovery selection into one exact executable
manifest while proving every source is still unchanged, inactive, recoverable,
and safe relative to current production authority.

## Risk

- Deleting a moved, dirty, active, or newly referenced source.
- Removing a branch whose recovery object was not preserved.
- Partially deleting remote branches without a bounded rollback path.
- Letting a stale approval survive a later `main` or target-ref change.
- Expanding cleanup into tags, artifacts, PRs, data, deployments, or unrelated
  branches.

## Decision

1. Implement a dry-run-first executor governed by
   `REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_V1`.
2. Reuse the exact live-revalidation policy from the recovery planner.
3. Bind execution to selection, execution, action-manifest, and bundle hashes.
4. Require a second complete revalidation immediately before mutation.
5. Use one atomic remote deletion, clean worktree removals, and one local-ref
   transaction.
6. Attempt exact bounded restoration if an execution phase fails.
7. Stop before execution until the owner approves the exact generated values.

## Dry-Run Proof

- Producer SHA: `5de6414da0b3181562f8f33b905e39bbe55450dd`
- Authority: `origin/main` at
  `8084fe4e441c53b4d9efd9d0fcf16a5b6771bb9a`
- Selection fingerprint:
  `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Execution fingerprint:
  `8a38bd56c6da000141c5cdc0c12cf78f1201654f301a716150b5a24ccf49d6eb`
- Action-manifest SHA-256:
  `7bb06fc150d92a5a8f2791f6691f5176ef5f95274602ab3128c8c8e9ee1f2824`
- Candidate groups: `227`
- Local branches: `203`
- Remote branches: `135`
- Clean linked worktrees: `39`
- Live-revalidation passes: `227/227`
- Drifted groups: `0`
- Inventory failures: `0`
- Execution status: `not_executed`

## Recovery Proof

- Base release: `prearchive-recovery-20260902T150140Z`
- Base bundle SHA-256:
  `3436b1e8f506a153865285af5e69b682256275492c0664d2cff2a1294b9a2b09`
- Supplement release: `prearchive-recovery-20260902T160933Z`
- Supplement bundle SHA-256:
  `ebafc7ec45db5c5559767c375c252fd85fab6c4d8c122dc3d22078975d82992e`
- Local bundle verification: passed
- Private remote release digest verification: passed

## Current Truths

- The exact cleanup executor exists but has not run in execute mode.
- Every selected branch and worktree still exists at its frozen identity.
- No target has an open PR or live automation reference.
- No branch, worktree, tag, file, PR, artifact, database row, or Storage object
  was removed by this gate.
- Any authority or target drift invalidates the execution fingerprint.

## What Must Never Be Broken

- Recovery bundles and private recovery releases remain immutable.
- `main`, protected refs, the executor branch, tags, PRs, and artifacts remain
  outside cleanup scope.
- Cleanup never expands beyond the exact action manifest.
- Dirty or uncertain work is retained.
- Failed validation stops before mutation; failed execution attempts bounded
  restoration and reports the result.

## Evidence

- `docs/contracts/REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_V1.md`
- `docs/audits/repository_archive_cleanup_execution_20260902/cleanup_execution_plan.json`
- `docs/audits/repository_archive_cleanup_execution_20260902/cleanup_live_revalidation.jsonl`
- `docs/audits/repository_archive_cleanup_execution_20260902/CLEANUP_EXECUTION_CHECKPOINT_V1.md`
- `docs/audits/repository_archive_cleanup_execution_20260902/artifact_hashes.json`

## Explicit Next Gate

The owner must approve the exact selection fingerprint, execution fingerprint,
action-manifest SHA-256, both recovery bundle hashes, and action counts. Only
then may a matching authorization artifact be created and the executor run once
with `--execute`. Any drift requires a new dry-run and new approval.
