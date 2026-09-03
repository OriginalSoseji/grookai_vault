# Repository Archive Cleanup Execution Checkpoint V1

Status: failed

Date: 2026-09-02 (America/Denver)

## Boundary

This packet is an exact, fail-closed cleanup plan. A dry run performs no branch,
worktree, tag, pull-request, filesystem, database, or Storage mutation.

## Frozen Selection

- Authority at dry run: `origin/main` at `abcb1f6ac56dc575d0763f61e87dc7af629f9d87`
- Selection fingerprint: `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Execution fingerprint: `1ee9ce94e192ccf2155afa4d8ebeaccc9a7d19a87880f5267d154b13bb486223`
- Action manifest SHA-256: `7bb06fc150d92a5a8f2791f6691f5176ef5f95274602ab3128c8c8e9ee1f2824`
- Candidate groups: `227`
- Local branches: `203`
- Remote branches: `135`
- Clean linked worktrees: `39`

## Recovery Chain

- Base release: `prearchive-recovery-20260902T150140Z`
- Base bundle SHA-256: `3436b1e8f506a153865285af5e69b682256275492c0664d2cff2a1294b9a2b09`
- Supplement release: `prearchive-recovery-20260902T160933Z`
- Supplement bundle SHA-256: `ebafc7ec45db5c5559767c375c252fd85fab6c4d8c122dc3d22078975d82992e`
- Local bundle verification: `true`
- Private remote digest verification: `true`

## Live Revalidation

- Passed groups: `227`
- Drifted groups: `0`
- Inventory failures: `0`

## Authorization

- Execute authorized: `true`
- Reasons: `none`

## Failed Execute Attempt

- Failure stage: `remote_branch_delete`
- GitHub ref mutations accepted: `0`
- Worktrees removed before failure: `0`
- Local branches deleted before failure: `0`
- Cause: the local pre-push hook launched the repository-wide suite from an
  intentionally sparse worktree and failed on files absent from that checkout.
- Rollback attempted: `true`
- Rollback passed: `true`
- Direct restoration readback passed: `true`
- All `203` local branches, `135` remote branches, and `39` worktrees remain at
  their frozen identities.
- Nonmanifest refs, tags, open PRs, and both private recovery releases were
  independently compared before and after the attempt and remained unchanged.
- The complete failure command and restoration evidence are preserved in
  `cleanup_execution_plan.json`.

## Execution Order

1. Repeat complete live revalidation immediately before mutation.
2. Delete the exact remote branches in one atomic push.
3. Remove only the exact clean registered worktrees.
4. Delete local refs in one transactional `git update-ref` operation.
5. Verify every target is absent and every non-target boundary remains untouched.
6. On failure, restore remote and local refs to their frozen SHAs and reconstruct
   only worktrees removed by this execution.

## What Must Never Be Broken

- No target may move between approval and execution.
- No dirty, active, open-PR, automation-referenced, migration-bearing, protected,
  or unverified source may be removed.
- No tag, PR, artifact, database row, Storage object, deployment, or product data
  is in scope.
- Recovery releases and bundles remain immutable.

## Explicit Next Gate

Repair the sparse-incompatible hook boundary, merge that repair, run a fresh
dry-run from the new `main`, and obtain a new exact authorization. This failed
authorization must not be reused.
