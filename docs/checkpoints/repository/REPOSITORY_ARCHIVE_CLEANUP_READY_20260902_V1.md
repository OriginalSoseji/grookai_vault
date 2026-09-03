# REPOSITORY_ARCHIVE_CLEANUP_READY_20260902_V1

Status: SECOND ATTEMPT FAILED SAFELY - REPARSE-SAFE EXECUTOR REPAIR REQUIRED

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

- One exactly authorized execute attempt ran against authority
  `abcb1f6ac56dc575d0763f61e87dc7af629f9d87` and execution fingerprint
  `1ee9ce94e192ccf2155afa4d8ebeaccc9a7d19a87880f5267d154b13bb486223`.
- The remote-deletion phase was intercepted by the sparse-incompatible local
  pre-push hook before GitHub accepted any ref mutation.
- Rollback passed, direct restoration readback passed, and zero worktrees had
  been removed before failure.
- Every selected branch and worktree still exists at its frozen identity.
- No target has an open PR or live automation reference.
- No branch, worktree, tag, file, PR, artifact, database row, or Storage object
  was removed by this gate.
- A second exactly authorized attempt ran from
  `bd7675a2a3c1efd21a93dd4fd09d4be13395a18b` with execution fingerprint
  `45d1c55870ea2dde39fcc6ca189996339f0f4cced29ee5e8146c923e8a505445`.
- Its atomic remote deletion succeeded, but the first Windows worktree removal
  unregistered `C:/grookai_vault_active_runtime_codeql` and then failed on a
  reparse point with `Invalid argument`.
- Automatic remote rollback passed. The partial directory was preserved intact,
  and the exact worktree was reconstructed at its original path on
  `security/active-runtime-codeql-v2` at
  `0d7856775f35d39d6bf6df55364a67ac1eaf1130`.
- Direct readback now proves all 203 local targets, 135 remote targets, and 39
  registered worktrees are present. The reconstructed worktree is clean.
- The preserved partial directory remains at
  `C:/grookai_vault_active_runtime_codeql_failed_cleanup_preserved_20260902T2208MDT`.
- The target inventory contains 222 Windows reparse points across 20 worktrees.
  All 222 are untracked generated links and require manifest-bound preservation
  before removal.
- Both prior execution authorizations are consumed and cannot be reused.
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
- `docs/audits/repository_archive_cleanup_final_revalidation_20260903/cleanup_execution_plan.json`
- `docs/audits/repository_archive_cleanup_final_revalidation_20260903/cleanup_execution_authorization.json`
- `docs/audits/repository_archive_cleanup_final_revalidation_20260903/CLEANUP_EXECUTION_CHECKPOINT_V1.md`
- `docs/audits/repository_archive_cleanup_final_revalidation_20260903/artifact_hashes.json`
- `docs/audits/repository_archive_cleanup_postrepair_dry_run_20260903/cleanup_execution_plan.json`
- `docs/audits/repository_archive_cleanup_postrepair_dry_run_20260903/FAILED_ATTEMPT_REPORT_V2.md`
- `docs/audits/repository_archive_cleanup_postrepair_dry_run_20260903/manual_worktree_restoration_readback.json`
- `docs/audits/repository_archive_cleanup_postrepair_dry_run_20260903/artifact_hashes_v2.json`

## Explicit Next Gate

Merge the reparse-safe repair, complete all post-merge checks, rerun the full
no-write execution plan from the new frozen `main`, and obtain a new exact
authorization bound to its producer SHA, reparse-aware action manifest, and
execution fingerprint. Neither failed authorization may be reused.
