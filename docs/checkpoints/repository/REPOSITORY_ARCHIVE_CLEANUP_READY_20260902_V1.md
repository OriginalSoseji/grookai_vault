# REPOSITORY_ARCHIVE_CLEANUP_READY_20260902_V1

Status: COMPLETE

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

## Final Execution Proof

- Producer and authority SHA:
  `38d1c6a24328a5f05ab766cb37bce60c45e5ad72`
- Selection fingerprint:
  `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Execution fingerprint:
  `a7bf32adc68f806c729c1c6aa41dfe31279ef4e5debfe3210ba84d4a5895136a`
- Action-manifest SHA-256:
  `d2f93cc8755f8e30694b5b1b5dd325e223890cb3705f0bd8116496605d4bb9e3`
- Execution status: completed
- Rollback attempted: false
- Local branches removed: 203
- Remote branches removed: 135
- Clean linked worktrees removed: 39
- Reparse points preserved: 222
- Target refs, registrations, and paths remaining: 0
- Preserved reparse-point mismatches: 0

## Current Truths

- The reparse-safe executor repair merged to `main` as
  `38d1c6a24328a5f05ab766cb37bce60c45e5ad72`; all post-merge checks passed.
- The final dry run and execution used selection fingerprint
  `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`,
  execution fingerprint
  `a7bf32adc68f806c729c1c6aa41dfe31279ef4e5debfe3210ba84d4a5895136a`,
  and action-manifest SHA-256
  `d2f93cc8755f8e30694b5b1b5dd325e223890cb3705f0bd8116496605d4bb9e3`.
- Exact owner authorization passed with no mismatch.
- Execution completed without rollback: 203 local branches, 135 remote
  branches, and 39 clean linked worktrees were removed.
- All 222 manifest-bound Windows reparse points were relocated intact to the
  recovery root before their worktrees were removed.
- Executor readback and an independent readback both found zero remaining
  target refs, worktree registrations, or target filesystem paths and zero
  preserved reparse-point mismatches.
- Both private recovery releases remain available and verified.
- The prior failed-attempt directory remains preserved at
  `C:/grookai_vault_active_runtime_codeql_failed_cleanup_preserved_20260902T2208MDT`.
- Tags, PRs, recovery releases, recovery artifacts, databases, Storage,
  deployments, and nonmanifest refs remained outside the mutation boundary.

## Historical Failed Attempts

- One exactly authorized execute attempt ran against authority
  `abcb1f6ac56dc575d0763f61e87dc7af629f9d87` and execution fingerprint
  `1ee9ce94e192ccf2155afa4d8ebeaccc9a7d19a87880f5267d154b13bb486223`.
- The remote-deletion phase was intercepted by the sparse-incompatible local
  pre-push hook before GitHub accepted any ref mutation.
- Rollback passed, direct restoration readback passed, and zero worktrees had
  been removed before failure.
- Every selected branch and worktree still existed at its frozen identity after
  that failed attempt was restored.
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
- At that recovery checkpoint, direct readback proved all 203 local targets,
  135 remote targets, and 39 registered worktrees were present. The
  reconstructed worktree was clean before the final successful execution.
- The preserved partial directory remains at
  `C:/grookai_vault_active_runtime_codeql_failed_cleanup_preserved_20260902T2208MDT`.
- The pre-execution target inventory contained 222 Windows reparse points
  across 20 worktrees. All 222 were untracked generated links and were later
  preserved by the final execution.
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
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/cleanup_execution_plan.json`
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/cleanup_execution_authorization.json`
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/cleanup_live_revalidation.jsonl`
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/independent_post_execution_readback.json`
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/CLEANUP_EXECUTION_CHECKPOINT_V1.md`
- `docs/audits/repository_archive_cleanup_reparse_safe_dry_run_20260903/artifact_hashes.json`

## Explicit Next Gate

No further action is required for this archive-cleanup selection. Preserve all
recovery and audit evidence. Any future cleanup must begin with a new candidate
selection and a new fail-closed authorization cycle.
