# REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_V1

Status: ACTIVE - EXECUTION NOT AUTHORIZED

Effective date: 2026-09-02

Owner: Grookai Vault founder

## Purpose

This contract governs the only cleanup path for the exact repository sources
that passed post-merge disposition review, live revalidation, private recovery
publication, and remote readback. It converts an owner-reviewed archive
candidate set into a deterministic execution plan without treating planning
evidence as deletion permission.

## Frozen Recovery Authority

- Selection fingerprint:
  `7cb57ac86be732687c9fe6ac2292a859de4bca8c89e6e42981102c4d2e2a0221`
- Base recovery release: `prearchive-recovery-20260902T150140Z`
- Base bundle SHA-256:
  `3436b1e8f506a153865285af5e69b682256275492c0664d2cff2a1294b9a2b09`
- Supplement release: `prearchive-recovery-20260902T160933Z`
- Supplement bundle SHA-256:
  `ebafc7ec45db5c5559767c375c252fd85fab6c4d8c122dc3d22078975d82992e`
- Candidate groups: `227`
- Frozen refs: `339`

## Authorized Planning Scope

Before destructive approval, the project may:

1. load and hash the frozen selection and recovery artifacts;
2. verify both local Git bundles;
3. verify the private GitHub recovery releases by SHA-256 and byte size;
4. inventory current local and remote refs, worktrees, open pull requests,
   repository automation, Windows scheduled tasks, and running processes;
5. recompute authority relationships against current `origin/main`;
6. generate an exact dry-run action manifest and execution fingerprint;
7. test rollback command construction without performing cleanup.

## Destructive Authorization Boundary

Execution is prohibited unless a separate authorization artifact contains all
of the following and matches the current dry-run plan exactly:

- schema `GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_AUTHORIZATION_V1`;
- `execute_authorized: true`;
- owner identity, timestamp, and explicit approval statement;
- selection fingerprint;
- execution fingerprint;
- action-manifest SHA-256;
- base and supplement bundle SHA-256 values;
- exact action counts.

General statements such as `continue`, prior blanket access, creation of this
contract, or approval of repository reconciliation do not authorize cleanup.

## Execution Invariants

1. Dry-run is the default. Destructive behavior requires `--execute` and a
   matching authorization artifact.
2. Every target must retain its frozen SHA and remain contained in or
   patch-equivalent to current `origin/main`.
3. Every linked worktree must still exist, be clean, remain on the expected
   branch, and retain its frozen SHA.
4. No target may have an open PR, active repository automation reference,
   scheduled-task reference, or running-process reference.
5. Any inventory failure or target drift stops the entire execution before the
   first mutation.
6. Remote branch deletion is one atomic push.
7. Worktrees are removed only after remote deletion succeeds and while their
   local branches still exist.
8. Local branch deletion is one `git update-ref --stdin` transaction with old
   SHA leases.
9. A failure triggers restoration of exact local and remote refs and recreation
   of only worktrees removed by that execution.
10. Post-execution readback must prove all targets absent and all boundaries
    unchanged before cleanup can be called complete.

## Never In Scope

- `main`, `master`, the executor branch, protected refs, or tags;
- force push, history rewrite, reset, or filesystem-wide cleanup;
- pull-request closure or GitHub repository-setting changes;
- recovery release, bundle, audit, checkpoint, or artifact deletion;
- database, Supabase Storage, catalog, pricing, Vault, deployment, or client
  mutation;
- any branch, ref, or worktree outside the exact action manifest.

## Stop Conditions

Stop before mutation when any hash, count, ref, worktree, authority,
inventory, private-release, or authorization value fails to reconcile. Stop
and attempt bounded restoration if any execution phase fails. Never weaken a
guard or substitute a different target to make the run proceed.

## Current Gate

Generate and review the no-write execution packet. Destructive execution remains
locked until the owner explicitly approves the exact generated fingerprints,
bundle hashes, and action counts.
