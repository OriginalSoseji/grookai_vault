# Repository Reconciliation Final Report

Status: NON-PRODUCTION CANDIDATE COMPLETE

Date: 2026-09-02 (America/Denver)

## Objective

Preserve every discoverable repository source, prove that preserved state can be
restored, then reconcile justified capabilities onto a branch created from the
current `main` authority. The project was governed by
`REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1`.

This project did not authorize deleting branches or worktrees, applying database
migrations, deploying clients, mutating Supabase or Storage, or merging the
candidate into `main`.

## Authority And Candidate

- Authority branch: `origin/main`
- Reconciliation baseline SHA: `b54ef91328c5a0093531338ca4d42f00bf601b9b`
- Latest authority SHA incorporated after the first CI pass:
  `679ade906` (English Master Index refresh, PR #384)
- Candidate branch: `integration/reconciled-main-v1`
- Candidate SHA before this final report: `443d9478da4243dc2f023dc6232fdad5e6c02cb3`
- Main divergence after the authority refresh: `0` authority-only commits and
  `22` candidate-only commits
- Existing source branches and worktrees modified or deleted: `0`

## Preservation And Restoration Proof

- Recovery directory:
  `C:\grookai_reconciliation_recovery_20260902T054000Z`
- Private recovery repository:
  `OriginalSoseji/grookai-vault-reconciliation-recovery-20260902`
- Recovery release: `reconciliation-20260902T054000Z`
- Off-machine verification run: `33598048695`
- Bundle bytes: `2129477351`
- Bundle SHA-256:
  `72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441`
- Bundle chunks verified: `8/8`
- Refs verified: `842/842`
- Ref mismatches: `0`
- Dirty worktrees restored in isolation: `10/10`
- Tracked dirty paths restored: `35/35`
- Untracked paths restored: `95/95`
- Secret-pattern findings: `0`

## Reconciled Capabilities

- MTG catalog supervisor batch bounding and retry protection.
- Per-game MTG sealed release controls and governed sealed-world tooling.
- Chat Safety V1 review and client enforcement.
- Unified collector search across governed Pokemon, One Piece, and MTG scopes.
- Vault bulk-removal decision evidence; newer `main` behavior remains authority.
- Launch operator playbook and Apple/Google store-readiness contracts.
- Pricing trust spot checks and a three-TCG production catalog crawl contract.
- Bounded emulator video-agent tooling that cannot publish.
- Japanese V4 lineage and pause evidence.
- Visual Search V2 handoff boundary without importing its unfinished runtime.
- A complete source ledger covering every inventoried source.

The temporary lot-sharing migration commit was immediately forward-reverted after
comparison proved that PR #230 had already placed the newer authority on `main`.
No stale implementation remains active in the candidate.

## Preserved But Not Activated

- `20260816170000_sealed_product_per_game_release_v2.sql` is included but has not
  been applied.
- Visual Search V2 remains human-calibration gated. No embeddings, migration,
  release load, or activation occurred.
- Japanese V5 global-catalog work remains a deferred non-launch lane.
- Store submission remains blocked by external-console state and six media assets.
- No live production catalog crawl or social-media recording was run.

## Final Source Ledger

- Source records classified: `841`
- Unique source SHAs: `461`
- Deletion-authorized rows: `0`

Final dispositions:

- Superseded by merged PR: `363`
- Superseded by current main: `175`
- Preserved deferred project: `125`
- Preserved migration review: `95`
- Preserved Japanese lineage: `25`
- Preserved dirty/do-not-touch: `17`
- Preserved closed/unmerged: `15`
- Preserved deferred human gate: `12`
- Capability reconciled, source preserved: `9`
- Capability reconciled, unapplied: `3`
- Protected authority: `2`

Archive recommendations in the ledger are planning metadata only. They are not
authority to delete a branch, ref, worktree, PR, artifact, or local directory.

## Validation

Passed:

- Aggregate Node contract suite for reconciled domains: `58/58`
- MTG sealed migration atomicity and isolation contracts: `5/5`
- Japanese V4 focused suite: `208/208`
- Flutter focused tests in the final pass: `52/52`
- Web TypeScript typecheck
- Targeted web ESLint
- Flutter analyzer: zero issues
- `git diff --check`
- Final source-ledger contracts: `3/3`

The initial full-checkout PR run found three candidate integration defects: two
search contracts asserted the pre-reconciliation implementation shape, the
catalog crawl eagerly resolved a web-only dependency during contract import, and
the legacy-key scan found a deprecated environment-variable alias. Those defects
were repaired at `7068ac358`. CodeQL then found an authentication-error dataflow
into a diagnostic SHA-256 fingerprint; the error path was redacted at
`5c2936a88`. The subsequent full-checkout run passed CodeQL, runtime protection,
the security scan, Windows tests and goldens, Samsung visual/accessibility, drift,
binder, and Vercel preview gates.

While that run completed, `main` advanced through PR #384. Its 14 generated
English Master Index audit files had no path overlap with candidate work and were
merged without conflict at `acdfa8202` before the final CI gate.

Known baseline debt:

- Two assertions in
  `apps/web/src/components/performance/publicRenderingCacheGuards.test.mjs`
  expect symbols absent from the corresponding `origin/main` implementation.
  Both target implementations are unchanged by this candidate. The remaining
  fourteen tests in that run passed.
- The local pre-commit shipcheck could not complete its live Supabase preflight:
  the candidate first lacked ignored local environment configuration, and after
  local configuration was supplied the database connection timed out at
  `3.134.172.186:5432`. No database operation was attempted by this project.
- Disk capacity does not safely permit expanding this sparse candidate to a full
  checkout. A normal GitHub Actions checkout is the definitive broad-suite gate.

## Invariants

- No source is deleted or rewritten.
- No direct change is made to `main`.
- No production deployment or publication occurs from this branch.
- No database, Storage, pricing, Vault, or catalog data is mutated.
- Included migrations remain unapplied until their own governed gate.
- Human-gated projects remain human-gated.
- Every candidate capability remains traceable to preserved source evidence.

## Rollback

Abandon or close `integration/reconciled-main-v1`. The production authority and
all original sources remain intact. The private recovery bundle and dirty-state
archives provide independent restoration proof.

## Explicit Next Gate

Push `integration/reconciled-main-v1`, open a draft non-production pull request to
`main`, and run the repository's normal full-checkout CI. Repair only failures
introduced by the candidate. Do not merge, deploy, apply migrations, or clean up
source branches as part of that gate.
