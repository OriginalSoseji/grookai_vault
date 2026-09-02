# REPOSITORY_RECONCILIATION_CANDIDATE_COMPLETE_20260902_V1

Status: COMPLETE - NON-PRODUCTION CANDIDATE

Date: 2026-09-02 (America/Denver)

## Context

Repository work had accumulated across hundreds of branches and worktrees. A
direct cleanup or broad merge risked losing unmerged work, reviving stale code,
or applying production mutations without domain proof.

## Problem

Create one reviewable candidate from current `main` while preserving every source
and distinguishing already-merged work, superseded work, justified capabilities,
unapplied migrations, human-gated projects, and dirty states.

## Risk

- Silent branch or dirty-state loss.
- Stale whole-branch merges overriding newer authority.
- Database or Storage mutation during source reconciliation.
- Treating an archive recommendation as deletion authority.
- Presenting an integration candidate as production-ready without CI and review.

## Decision

1. Preserve all refs and dirty states before integration.
2. Prove off-machine bundle reconstruction and isolated dirty-state restoration.
3. Create `integration/reconciled-main-v1` from exact authority
   `b54ef91328c5a0093531338ca4d42f00bf601b9b`.
4. Reconcile by domain and file-level evidence, never by wholesale stale-branch
   merge.
5. Keep deferred and human-gated systems out of active runtime.
6. Produce a complete source ledger with zero deletion authority.
7. Stop at a draft, non-production pull request and full-checkout CI gate.

## Alternatives Rejected

- Deleting or archiving branches before restoration proof.
- Force-updating `main`.
- Merging every open branch.
- Applying included migrations as part of reconciliation.
- Activating Visual Search V2 or Japanese V5 to make the candidate appear more
  complete.
- Expanding the sparse checkout after disk exhaustion showed it was unsafe.

## Proof

- Recovery bundle SHA-256:
  `72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441`
- Off-machine verification run: `33598048695`
- Refs verified: `842/842`
- Dirty worktrees restored: `10/10`
- Source rows classified: `841`
- Deletion-authorized rows: `0`
- Candidate SHA before final checkpoint:
  `443d9478da4243dc2f023dc6232fdad5e6c02cb3`
- Aggregate reconciled-domain contracts: `58/58`
- MTG sealed migration contracts: `5/5`
- Japanese V4 focused contracts: `208/208`
- Flutter focused tests in final pass: `52/52`
- Web typecheck, targeted ESLint, Flutter analyze, and diff checks: passed

Full evidence is recorded in:

- `docs/audits/repository_reconciliation_20260902/FINAL_RECONCILIATION_REPORT.md`
- `docs/audits/repository_reconciliation_20260902/final_source_ledger.json`
- `docs/audits/repository_reconciliation_20260902/FINAL_SOURCE_LEDGER_SUMMARY.md`

## Current Truths

- The preservation and restoration gate is complete.
- The candidate is clean and based on current `origin/main` authority.
- The post-validation English Master Index refresh at `679ade906` was merged
  without conflict or candidate-path overlap before the final CI gate.
- No source branch or worktree was deleted.
- No production system was changed.
- MTG sealed migration remains unapplied.
- Visual Search V2, Japanese V5, and store-submission gates remain deferred.
- Two broad web guard assertions are stale on the authority branch and are
  documented as baseline debt, not candidate regressions.

## What Must Never Be Broken

- Recovery artifacts remain private and immutable.
- Source cleanup requires a separate, explicit post-acceptance contract.
- A draft PR is not deployment or migration approval.
- Human-gated and unapplied lanes cannot be silently activated.
- The candidate can always be abandoned without changing production authority.

## Explicit Next Gate

Push the candidate and open a draft non-production PR against `main`. Let a normal
full-checkout GitHub Actions run validate the complete repository. Repair only
candidate-caused failures. Stop before merge, deployment, migration apply, or
source cleanup.
