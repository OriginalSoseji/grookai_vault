# REPOSITORY_RECONCILIATION_PRESERVATION_COMPLETE_20260902_V1

Status: COMPLETE

Date: 2026-09-02 (America/Denver)

## Context

The repository reconciliation contract required complete recovery proof before
any branch or dirty worktree could be reconciled into a clean-main candidate.
Local disk had only about 1.6 GiB free while the deduplicated Git bundle was about
2.13 GB, so a normal local bundle file could not be created safely.

## Decision

Stream the bundle into bounded 256 MiB chunks and upload each chunk to a dedicated
private recovery release. A local chunk was removed only after GitHub reported the
exact uploaded byte count. Reconstruct and verify the bundle off-machine through a
private GitHub workflow.

Dirty worktree patches and untracked files were captured separately, scanned for
secret patterns, archived, and restored in isolated temporary worktrees.

## Proof

- Bundle bytes: `2129477351`
- Bundle SHA-256:
  `72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441`
- Bundle chunks: `8`
- Pinned refs: `842`
- Ref mismatches: `0`
- Dirty worktrees restored: `10/10`
- Untracked files restored: `95/95`
- Secret-pattern findings: `0`
- Off-machine verification run: `33598048695` (`pass`)

The first dirty restore attempt failed safely because PowerShell newline
conversion changed Git patch context from LF to CRLF. No source was changed. Patch
capture was changed to raw Git redirection, after which all ten restores passed.

## Current Truths

- Every inventoried remote, local, and worktree HEAD is recoverable from the
  private bundle.
- Every dirty worktree state is independently recoverable.
- `integration/reconciled-main-v1` was created from exact production authority
  `b54ef91328c5a0093531338ca4d42f00bf601b9b`.
- Existing sources remain untouched.
- The integration candidate is non-production.

## What Must Never Be Broken

- No source deletion during reconciliation.
- No wholesale stale-branch merges.
- No migration apply or production write from this project.
- No direct `main` mutation.
- No cleanup classification treated as deletion authority.
- No accepted change without source-to-destination and test evidence.

## Explicit Next Gate

Proceed one domain wave at a time on `integration/reconciled-main-v1`, beginning
with the two-commit lot-sharing/pricing repair. Record source commits, conflicts,
tests, destination commits, and rollback instructions before proceeding to MTG
supervisor and MTG sealed.

