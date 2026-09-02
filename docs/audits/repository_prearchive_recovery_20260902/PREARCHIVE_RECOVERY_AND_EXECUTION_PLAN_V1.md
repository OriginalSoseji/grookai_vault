# Repository Pre-Archive Recovery And Execution Plan V1

## Boundary

This gate created and verified recovery evidence for an exact candidate set. It
did not remove a worktree, delete a branch, mutate a tag, close a PR, delete a
file, or write to the database or Storage.

**NO CLEANUP OR DELETION IS AUTHORIZED BY THIS PLAN.**

## Frozen Inputs

- Producer commit: `ee10374e2a2d63673e4c880565054905eec3ac3e`
- Authority ref: `origin/main`
- Authority SHA: `e2f97b75c48b2a21febea2818f4466dce3a2f3b8`
- Candidate packet SHA-256: `6e58202451296e74ec2de841573f7a49a6e768b8855060030ae87cf637acb8dc`
- Revalidation fingerprint: `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Input candidate groups: `227`
- Selected for recovery: `227`
- Excluded after revalidation: `0`
- Frozen recovery refs: `339`
- New refs requiring supplement objects: `141`

## Recovery Proof

- Private recovery repository: `OriginalSoseji/grookai-vault-reconciliation-recovery-20260902`
- Release: `prearchive-recovery-20260902T160933Z`
- Release URL: https://github.com/OriginalSoseji/grookai-vault-reconciliation-recovery-20260902/releases/tag/prearchive-recovery-20260902T160933Z
- Bundle file: `grookai-prearchive-supplement-7cb57ac86be73268.bundle`
- Bundle bytes: `132954`
- Bundle SHA-256: `ebafc7ec45db5c5559767c375c252fd85fab6c4d8c122dc3d22078975d82992e`
- Recovery mode: `base_plus_incremental_supplement`
- Base bundle SHA-256: `3436b1e8f506a153865285af5e69b682256275492c0664d2cff2a1294b9a2b09`
- Supersedes recovery releases: `prearchive-recovery-20260902T153330Z, prearchive-recovery-20260902T160411Z`
- Local bundle verification: `true`
- Remote asset readback hash match: `true`
- Downloaded bundle verification: `true`

## Recovery Sequence

1. Download and verify `grookai-prearchive-a2c84bd6869a5aaf.bundle` from `prearchive-recovery-20260902T150140Z`.
2. Import that base bundle into a recovery clone.
3. Download, verify, and fetch `grookai-prearchive-supplement-7cb57ac86be73268.bundle` from `prearchive-recovery-20260902T160933Z` into the same clone.
4. Recreate the exact refs from the immutable `recovery_refs` map in `recovery_bundle_manifest.json`.

## Revalidation Policy

Every selected group retained its packet SHA, remained contained in or
patch-equivalent to current `origin/main`, had no dirty or moved worktree, no
current open PR, no automation reference, and no migration-domain change.

## Revalidation Exclusions

| Reason | Groups |
|---|---:|
| None | 0 |

Complete records are preserved in `prearchive_selection.jsonl` and
`prearchive_exclusions.jsonl`.

## Exact Future Execution Sequence

The next gate remains destructive and requires explicit owner approval tied to
the selection fingerprint and recovery bundle hash above. A future executor
must recheck all evidence immediately before each mutation, stop on any drift,
change only the exact approved refs/worktrees, and prove restoration from the
downloaded bundle after execution.

No future approval may be inferred from creation of this recovery release.
