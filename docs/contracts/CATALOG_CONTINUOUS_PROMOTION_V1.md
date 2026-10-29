# Catalog Continuous Promotion V1

Status: Active
Date: 2026-10-29

## Purpose

Convert exact, source-governed catalog gaps into canonical insert-only rows
without turning general discovery into identity authority. This is a separate
write workflow triggered by a completed Universal Catalog Discovery run. The
discovery workflow and Catalog Shadow Automation remain read-only.

## Activation Authority

The founder explicitly directed Grookai to repair the catalog promotion path
and run verified catalog completion continuously on 2026-10-29. Runtime
activation is still explicit and reversible through the repository variable
`CATALOG_CONTINUOUS_PROMOTION_ACTIVE=true`. Removing or changing that value
stops new executions without modifying canonical data.

## Frozen Input Boundary

Every cycle must:

1. originate from a successful `Universal Catalog Discovery` run on the
   default branch;
2. check out that run's exact 40-character commit SHA;
3. download that run's immutable 90-day evidence artifact;
4. verify the outcome-package artifact hash and every package fingerprint;
5. accept no more than five unique targets;
6. use only a repository-registered source-specific writer;
7. reject target, source-run, commit, count, or fingerprint drift.

The workflow must never execute artifacts produced by pull requests, forks,
failed discovery runs, non-default branches, or arbitrary user-provided code.

## Admitted Writers

- MTG exact missing-set insertion and exact partial-set extension through
  `mtg_incremental_promotion_v1`;
- One Piece exact missing-set insertion through the registered V1/V2 writer;
- English Pokemon Master-Index-admitted incremental completion;
- Japanese Pokemon structured full-set incremental completion.

The frozen-official Japanese checklist lane, raw English Pokemon missing sets,
ambiguous source identities, future releases, and any unregistered writer stay
held. The English Pokemon `30th-c` missing set is not admitted until the Master
Index and its dedicated writer package admit it.

## Exact MTG Partial Extension Gate

An MTG partial set may enter the writer only when:

- the authority is `scryfall_sets_and_prints`;
- source and canonical set codes match exactly after case normalization;
- the comparison scope is `full_set`;
- existing, expected, and missing counts are exact integers;
- `missing = expected - existing` and both counts are positive;
- the writer accounts for every retained Scryfall mapping and retained
  canonical row before selecting new parents;
- collision preflight is zero.

Any unaccounted retained parent, mapping drift, duplicate identity, or count
disagreement blocks the target.

## Rollback-Before-Commit Rule

For every target, the executor must run the exact fingerprinted writer in
`dry-run` mode first. The dry run must insert the complete bounded delta inside
a transaction, verify exact row counts, roll back, and prove zero retained rows.
Only then may the same commit, target, source constraints, and payload
fingerprint run in `apply` mode.

Source drift between dry run and apply changes the payload fingerprint and
fails closed. A failed target stops the cycle; it is not substituted, broadened,
or retried with changed inputs.

## Write Envelope

Permitted:

- insert-only canonical set/card/identity/printing/evidence/mapping rows emitted
  by the registered writer and frozen package.

Forbidden:

- updates or deletes;
- Storage writes or image-pointer changes;
- pricing, publication, Vault, ownership, or customer-state writes;
- public-visibility activation;
- child printing creation from pricing evidence or inferred finish truth;
- arbitrary SQL, scripts, URLs, environment values, or target substitution.

## Durable Operations Evidence

The executor registers as `catalog-continuous-promotion-v1` and persists
running, succeeded, or failed heartbeats in `operations_agent_runs`. Each run
records its source run, commit, target counts, receipts, failure class, rollback
proof, and durable readback. GitHub retains the complete execution artifact for
90 days and reconciles one deduplicated failure issue.

Success means every selected target has both a verified rollback proof and an
exact committed durable readback. Console success alone is insufficient.

## Stop Rules

Stop before commit when activation is absent, the source artifact is invalid,
more than five targets are present, a writer is unregistered, collision counts
are nonzero, rollback leaves rows, the worktree or commit changes, the payload
fingerprint changes, or durable readback cannot prove every expected count.

Commit acknowledgement uncertainty is a failure requiring readback and human
inspection; never retry blindly.
