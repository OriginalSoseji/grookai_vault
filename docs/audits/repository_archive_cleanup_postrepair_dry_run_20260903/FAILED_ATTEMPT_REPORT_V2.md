# Repository Archive Cleanup Failed Attempt Report V2

Status: FAILED SAFELY; EXACT WORKTREE RESTORED

Date: 2026-09-02 (America/Denver)

## Authorized Attempt

- Producer and authority SHA: `bd7675a2a3c1efd21a93dd4fd09d4be13395a18b`
- Selection fingerprint: `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Execution fingerprint: `45d1c55870ea2dde39fcc6ca189996339f0f4cced29ee5e8146c923e8a505445`
- Action-manifest SHA-256: `7bb06fc150d92a5a8f2791f6691f5176ef5f95274602ab3128c8c8e9ee1f2824`
- Authorized targets: 227 groups, 203 local branches, 135 remote
  branches, and 39 linked worktrees.

## Failure

The atomic remote deletion completed, then Git for Windows partially removed
the first linked worktree. `git worktree remove` unregistered the worktree and
removed its `.git` file, but failed to delete the remaining directory with
`Invalid argument`. The directory contained Windows reparse points in ignored
generated paths.

The executor restored all remote refs and left all local refs unchanged. Its
automatic restoration readback correctly reported the one missing worktree
registration, so the execution failed closed and did not claim completion.

## Manual Restoration

The partial directory was moved intact to:

`C:/grookai_vault_active_runtime_codeql_failed_cleanup_preserved_20260902T2208MDT`

The original path was reconstructed as a clean linked worktree on
`security/active-runtime-codeql-v2` at
`0d7856775f35d39d6bf6df55364a67ac1eaf1130`.

Direct readback proves all 203 target local branches, all 135 target remote
branches, and all 39 target worktrees are present. The preserved partial
directory contains 17,277 files and remains outside Git registration.

## Root Cause And Repair Gate

The target inventory contains 222 Windows reparse points across 20 of the 39
worktrees. A narrow top-level `node_modules` exception is therefore
insufficient. A direct Git index comparison confirmed that all 222 are
untracked generated links. The executor must bind every reparse point into its action
manifest, relocate those links into a collision-checked recovery path before
worktree removal, and reconstruct a partially unregistered worktree on any
failure while preserving its residual directory.

The authorization for execution fingerprint `45d1c558...` is consumed and must
not be reused. A repaired executor requires merge, post-merge checks, a fresh
dry run, and a new exact owner authorization.

## Evidence

- `cleanup_execution_authorization.json`
- `cleanup_execution_plan.json`
- `cleanup_live_revalidation.jsonl`
- `CLEANUP_EXECUTION_CHECKPOINT_V1.md`
- `manual_worktree_restoration_readback.json`
- `artifact_hashes.json`
