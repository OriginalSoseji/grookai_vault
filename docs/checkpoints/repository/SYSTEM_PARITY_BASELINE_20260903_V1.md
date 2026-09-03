# SYSTEM_PARITY_BASELINE_20260903_V1

Status: COMPLETE - IMMUTABLE CURRENT-MAIN BASELINE

Date: 2026-09-03

Authority: `origin/main@9a6f62c077f02528ecb26ee7d660f501476475a6`

Producer: `ops/system-parity-baseline-v1@311dc50481714aee580f13daae75d3c70c2d1253`

## Context

Repository reconciliation and exact archive cleanup completed before Grookai
resumed MTG sealed, multilingual Pokemon, sealed automation, collectible
adapters, and Visual Search. Combining those domains in one candidate would
recreate the convergence problem that reconciliation removed.

This checkpoint freezes the current production authority across repository,
database, runtime, and signed-out product behavior. Every later capability lane
must begin from fresh main, merge serially, and be compared against this evidence
before release.

## Decision

- Current `origin/main` remains production authority.
- Parallel work is limited to read-only discovery, research, fixtures, and
  isolated experiments.
- Production integration is serial: one bounded capability per branch and PR.
- Main is rebaselined after every accepted merge.
- The final release candidate must pass the same parity crawl with zero
  unexplained regressions.

## Boundaries Proven

- Database: one read-only transaction; zero writes.
- Browser: signed out, GET navigation and screenshots only.
- GitHub: read-only CLI inspection.
- Repository: object reads from the exact authority ref.
- Local writes: permanent audit and checkpoint artifacts only.
- No auth user, Storage object, catalog row, price, Vault row, migration,
  deployment, approval, or publication was created or changed.

## Baseline Inventory

- 21,414 tracked files.
- 382 migration files, including one quarantined historical file.
- 58 GitHub workflow files.
- 95 web pages and route handlers.
- 160 workflow, worker, and Edge Function entrypoints.
- 418 production relations across captured schemas.
- 464 public functions.
- 437 RLS policies.
- 6,911 table grants.
- 380 production migration-ledger rows.
- 14 signed-out desktop/mobile product cases, all captured without page-level
  failure.
- 22 original crawl artifacts plus two explicit finding/alignment artifacts;
  every artifact is SHA-256 bound.

## Canonical Starting Truth

Production currently reports:

- MTG: 946 sets; 104,412 paper card rows; 104,250 with image evidence.
- One Piece: 61 sets; 6,899 card rows; 6,798 with image evidence.
- Pokemon English-standard: 25,330 card rows; 25,254 with image evidence.
- Pokemon Japanese domain: 31,628 card rows; 31,321 with image evidence; 62
  rows still lack `gv_id` across current runtime debt.
- TCG Pocket excluded domain: 2,012 rows.
- Yu-Gi-Oh: 500 hidden/current set-foundation rows.
- Gundam: 5 hidden/current set-foundation rows.

These are comparison anchors, not claims that every domain is complete or
publicly released.

## Migration Alignment

Production has no migration version that is absent from the repository. Two
repository versions are absent from the remote ledger:

1. `20260323221422` is preserved under `_quarantine` and is not active history.
2. `20260816170000_sealed_product_per_game_release_v2.sql` is the one active
   pending migration and remains unapplied.

This checkpoint does not authorize applying it.

## Known Baseline Defects

Capture success is not release-quality success. The crawl records:

- desktop Home at 9.169 seconds;
- desktop Pikachu Search at 10.012 seconds;
- mobile Pikachu Search at 8.692 seconds;
- failed visible images on desktop Sets (1), desktop Dex (92), mobile Search
  (6), mobile Sets (8), and mobile Dex (95);
- request failures on several Home, Sets, Dex, Privacy, and Search cases.

Later candidates must not hide these facts. Image and latency work should reduce
them, and parity blocks any increase from the recorded case-level values.

## Runtime Starting Truth

The most recent current-main MTG supervisor, operations control-plane, Catalog
Shadow Reconciliation, Universal Catalog Discovery, and CodeQL runs were green
at capture time. The only open PR recorded by the live crawl was PR 219,
`agent/mtg-sealed-world-v1`, and it was blocked from direct merge.

## Verification

- `node --check scripts/audits/system_parity_crawl_v1.mjs`: passed.
- `node --test tests/contracts/system_parity_crawl_v1.test.mjs`: 8/8 passed.
- Full Node contract suite after complete checkout: 2,779/2,779 passed.
- Full pre-commit ship gate: passed.
- Flutter suite inside ship gate: 653/653 passed.
- Artifact hash readback: zero mismatches.
- Exact-secret and credential-pattern scan: zero findings.

## Permanent Evidence

- `docs/contracts/SYSTEM_PARITY_CRAWL_V1.md`
- `docs/audits/system_parity_baseline_20260903/`
- `docs/audits/system_parity_baseline_20260903/SYSTEM_PARITY_MANIFEST.json`
- `docs/audits/system_parity_baseline_20260903/repository_tree.jsonl`
- `docs/audits/system_parity_baseline_20260903/database_snapshot.json`
- `docs/audits/system_parity_baseline_20260903/runtime_snapshot.json`
- `docs/audits/system_parity_baseline_20260903/product_snapshot.json`
- `docs/audits/system_parity_baseline_20260903/baseline_findings.json`
- `docs/audits/system_parity_baseline_20260903/migration_alignment.json`
- `docs/audits/system_parity_baseline_20260903/artifact_hashes.json`

## What Must Never Be Broken

- Current main remains the starting authority.
- Existing migrations are immutable.
- Canonical row counts cannot decrease without a separately governed decision.
- Existing RLS, policy, grant, and RPC boundaries cannot weaken.
- A source candidate cannot become canon merely because a parser found it.
- MTG sealed, multilingual Pokemon, sealed automation, collectible adapters, and
  Visual Search cannot converge into one integration branch.
- Recovery releases, tags, artifacts, and repository history remain preserved.

## Exact Next Gate

Reconcile the unique MTG sealed work from PR 219 onto a fresh branch based on the
then-current `origin/main`. Do not merge PR 219 wholesale. Inventory its unique
commits and files, compare them with current main, transplant only still-required
behavior, run the sealed-domain tests and parity checks, and stop before any
production migration apply or catalog write.
