# MEE Core Internal Review Workflow V1

Status: plan only

## Objective

Define how Grookai reviews internal Market Evidence Engine card-level signals before any future publication gate can inspect them.

This is not a public pricing contract. It does not publish prices, write pricing tables, or change app-visible pricing.

## Review Lanes

### high_signal_review

Strongest internal review queue: enough rollup-eligible evidence and at least two source families in the current read model.

Default disposition: `review_pending_high_signal`

Allowed dispositions: `review_confirmed_internal_candidate`, `review_split_required`, `review_blocked`, `review_defer_more_evidence`

Future handoff: May become a publication-gate candidate only under a separate publication contract after lane separation, source independence, recency, and blocker checks pass.

### candidate_review

Basic internal rollup candidate: at least three rollup-eligible rows, but not enough independent signal for high-signal treatment.

Default disposition: `review_pending_candidate`

Allowed dispositions: `review_confirmed_internal_candidate`, `review_split_required`, `review_blocked`, `review_defer_more_evidence`

Future handoff: Cannot publish directly; may feed future publication-gate backlog after additional evidence or manual confirmation.

### classification_review

Large active-listing evidence pool with zero rollup-eligible rows. This means classification or quality gates are blocking, not that price is ready.

Default disposition: `review_pending_classification_fix`

Allowed dispositions: `review_reclassify`, `review_blocked_classification`, `review_split_required`, `review_defer_more_evidence`

Future handoff: Blocked from publication until classifier/quality-gate issues are resolved in a separate apply package.

### reference_only_review

Reference evidence exists without active-listing corroboration.

Default disposition: `review_pending_reference_only`

Allowed dispositions: `review_reference_crosscheck`, `review_defer_active_market_evidence`, `review_blocked`

Future handoff: Reference-only cards cannot become market truth or public pricing under this workflow.

### low_signal_monitor

Evidence is present but currently too thin for internal price review.

Default disposition: `monitor_only`

Allowed dispositions: `monitor_only`, `review_defer_more_evidence`, `review_blocked`

Future handoff: No publication handoff.

## Evidence Thresholds

- Minimum internal rollup candidate: 3 rollup-eligible rows.
- High-signal review: 10+ rollup-eligible rows and 2+ source families.
- Classification review: 25+ active-listing rows with zero rollup-eligible rows.
- Publication-gate minimums are explicitly out of scope.

## Separation Rules

- raw_single_count and slab_count must never be combined into one public-facing price.
- reference_metric_count may support review but cannot publish without independent publication-gate approval.
- active_listing evidence is asking-price evidence only and cannot be treated as sold value.
- mixed raw/slab evidence requires review_split_required before any future publication gate can inspect it.
- special card lanes, print-run lanes, signatures, stamps, and deck replicas require lane-specific review evidence.

## Hard Blockers

- publishable_count > 0 inside internal read models
- app_visible_count > 0 inside internal read models
- market_truth_count > 0 inside internal read models
- wrong identity or unresolved match ambiguity
- bulk/lot/sealed/proxy/custom evidence used as a raw-single card signal
- slab evidence mixed into raw-single medians
- reference-only evidence being treated as market truth
- active asking price being labeled as sold value

## Current Audit Snapshot

- Cards in review queue: 2152
- Internal rollup candidate rows: 1749
- Mixed raw/slab rows requiring split review: 574
- Publishable rows: 0
- App-visible rows: 0
- Market-truth rows: 0

## Future Publication Handoff

A card can only be handed to a future publication gate as a candidate when:

- it remains internal-only in this workflow,
- no publishable/app-visible/market-truth flags are present,
- the review lane disposition is explicitly confirmed,
- raw-single and slab signals are separated,
- reference-only evidence is not treated as market truth,
- active listings are labeled as asking-price evidence only,
- the future publication contract supplies its own source, recency, outlier, and independence thresholds.
