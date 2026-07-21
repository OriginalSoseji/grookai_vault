# Card Visual Search Eligibility Audit V1 Checkpoint

Date: 2026-07-21

Status: REVIEW PACKET READY; POLICY LOCK NOT CLAIMED

## Context

The Card Visual Corpus V1 source inventory reconciled `11,000` unique card-print IDs. The deterministic eligibility policy then classified every source row as Tier A, Tier B, or Tier C. Before artwork grouping or search projection work can begin, the eligibility contract requires one stratified audit of both included and excluded rows.

This checkpoint records the deterministic sample and its mechanical reconciliation. It does not claim that a human has completed the row-level policy review.

## Decision

Use a deterministic, seeded audit sample that covers:

- every Tier A and Tier B prompt branch;
- every Tier B projection-guard class;
- every critical Tier C exclusion reason; and
- every source-gap outcome.

The review unit is the eligibility decision, not approval of the generated visual facts. Reviewers must determine whether the assigned tier and projection guards are defensible from the preserved source evidence.

## Producing State

- Branch: `feature/card-visual-description-agent`
- Producing commit: `c6352ae2e5e1b5fa84504616099cbacd30f3be3b`
- Eligibility source run: `bf56850e0cb0a5d2bae3ae05137762c604408401382ef1656d45ba2cbce2141f`
- Audit run key: `47702cd6a1fcf1c11e99a25c7f5679abcf5add5a7b5d7dfd44a8f7a0b67b1f04`
- Seed: `CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_V1`
- Tracked worktree was clean before the audit run.

## Reconciliation

- Source decisions: `11,000`
- Sample rows: `59`
- Unique sampled IDs: `59`
- Required strata: `28`
- Satisfied strata: `28`
- Bad eligibility-decision hashes: `0`
- Missing source evidence: `0`
- Reconciliation findings: `0`

### Sample Distribution

- Tier A: `8`
- Tier B: `36`
- Tier C: `15`
- Pokemon: `38`
- Trainer: `10`
- Item / Tool / Supporter: `7`
- Stadium: `4`
- Structurally valid source rows: `53`
- Quarantined source rows: `2`
- Image skips: `2`
- Unprocessed source rows: `2`

## Current Truths

- The sample deterministically covers every intended eligibility-policy stratum.
- Every sampled decision retains its source evidence and valid decision hash.
- The audit has not changed any Tier A, Tier B, or Tier C decision.
- The generated review template remains unfilled.
- `human_review_status` remains `awaiting_stratified_policy_review`.
- This checkpoint does not approve any visual description or fact graph.
- Artwork grouping, projections, embeddings, indexes, and public reads remain disabled.

## Invariants

- Tier C rows cannot enter search projections.
- Tier B projection guards must be enforced by each downstream field projection.
- Raw observation labels and source fact graphs remain immutable evidence.
- Normalization and canonical concepts must remain versioned derived data.
- A mechanically reconciled sample is not equivalent to a completed policy audit.
- Suspicious canonical branch metadata must remain visible for review; it cannot be silently corrected in the search layer.

## Boundaries Preserved

- Provider calls: `0`
- Database connections: `0`
- Database writes: `0`
- Approval changes: `0`
- Embeddings: `0`
- Artwork groups: `0`
- Search projections: `0`
- Index writes: `0`
- Public reads: `0`

## Artifacts

Audit directory:

`docs/audits/card_visual_search_eligibility_audit_v1/2026-07-21T16-04-48-712Z_audit_47702cd6a1fc/`

Permanent audit files:

- `run_plan.json`
- `eligibility_audit_sample.jsonl`
- `eligibility_audit_review_template.jsonl`
- `AUDIT_SAMPLE_RECONCILIATION.json`
- `ELIGIBILITY_POLICY_AUDIT_PACKET.md`
- `artifact_hashes.json`

Artifact hashes verify `5/5` permanent audit files.

## Verification

- Corpus inventory, eligibility, and audit contract tests: `19/19` passed.
- Audit reconciliation: passed with `0` findings.
- `git diff --check`: passed before the producing commit.
- Full repository shipcheck was not run. The repository pre-commit hook requires `SUPABASE_DB_URL`, which was unavailable; the producing commit was created only after the targeted offline checks passed.

## Explicit Next Gate

Complete the one-time stratified policy review over the `59` sampled decisions and record each row as policy-correct or policy-incorrect with a concise reason. The eligibility policy may lock only if no material Tier A or Tier B row is too permissive and no material Tier C row is incorrectly excluded.

If the review passes, freeze `CARD_VISUAL_SEARCH_ELIGIBILITY_V1` and proceed to a fail-closed artwork-grouping contract and offline grouping audit. If it fails, repair only the demonstrated eligibility class, replay all `11,000` decisions offline, regenerate the same seeded audit, and stop before artwork grouping.
