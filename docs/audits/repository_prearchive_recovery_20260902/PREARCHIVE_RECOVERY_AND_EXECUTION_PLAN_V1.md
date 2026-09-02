# Repository Pre-Archive Recovery And Execution Plan V1

## Boundary

This gate created and verified recovery evidence for an exact candidate set. It
did not remove a worktree, delete a branch, mutate a tag, close a PR, delete a
file, or write to the database or Storage.

**NO CLEANUP OR DELETION IS AUTHORIZED BY THIS PLAN.**

## Frozen Inputs

- Producer commit: `20a5fc70f12b992e0b222f0080b303c9c35d98e6`
- Authority ref: `origin/main`
- Authority SHA: `e2f97b75c48b2a21febea2818f4466dce3a2f3b8`
- Candidate packet SHA-256: `6e58202451296e74ec2de841573f7a49a6e768b8855060030ae87cf637acb8dc`
- Revalidation fingerprint: `a2c84bd6869a5aaf6a711b7ee09ff21b0a5b6314e410f9e8fdd1043536366b6a`
- Input candidate groups: `227`
- Selected for recovery: `92`
- Excluded after revalidation: `135`
- Frozen refs in bundle: `93`

## Recovery Proof

- Private recovery repository: `OriginalSoseji/grookai-vault-reconciliation-recovery-20260902`
- Release: `prearchive-recovery-20260902T150140Z`
- Release URL: https://github.com/OriginalSoseji/grookai-vault-reconciliation-recovery-20260902/releases/tag/prearchive-recovery-20260902T150140Z
- Bundle file: `grookai-prearchive-a2c84bd6869a5aaf.bundle`
- Bundle bytes: `817732010`
- Bundle SHA-256: `3436b1e8f506a153865285af5e69b682256275492c0664d2cff2a1294b9a2b09`
- Local bundle verification: `true`
- Remote asset readback hash match: `true`
- Downloaded bundle verification: `true`

## Revalidation Policy

Every selected group retained its packet SHA, remained contained in or
patch-equivalent to current `origin/main`, had no dirty or moved worktree, no
current open PR, no automation reference, and no migration-domain change.

## Revalidation Exclusions

| Reason | Groups |
|---|---:|
| `named_ref_missing` | 135 |
| `named_ref_moved_since_packet` | 135 |

Complete records are preserved in `prearchive_selection.jsonl` and
`prearchive_exclusions.jsonl`.

## Exact Future Execution Sequence

The next gate remains destructive and requires explicit owner approval tied to
the selection fingerprint and recovery bundle hash above. A future executor
must recheck all evidence immediately before each mutation, stop on any drift,
change only the exact approved refs/worktrees, and prove restoration from the
downloaded bundle after execution.

No future approval may be inferred from creation of this recovery release.
