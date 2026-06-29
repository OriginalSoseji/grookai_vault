# MEE Core Internal Review Action Workflow V1

Status: plan only

## Objective

Define the controlled internal action workflow for changing Market Evidence Engine review dispositions without publishing prices or mutating evidence.

This contract covers review actions only. It does not create market truth, app-visible pricing, public pricing views, or public rollups.

## Current Inputs

- Current disposition table: `market_evidence_review_dispositions`
- Dashboard queue view: `v_market_evidence_review_dashboard_queue_v1`
- Dashboard status summary view: `v_market_evidence_review_dashboard_status_summary_v1`
- Dashboard blocker view: `v_market_evidence_review_dashboard_blocker_queue_v1`

## Action Model

Every future review action must include:

- `disposition_id`
- `expected_updated_at` for optimistic locking
- `action_name`
- `review_actor`
- `reason_code` when required
- optional `review_note`
- optional `action_payload`

Every future implementation must write an append-only action event before or with the current disposition transition.

## Allowed Actions

### start_review

- From statuses: pending
- To status: in_review
- To disposition: unchanged
- Allowed review lanes: high_signal_review, candidate_review, classification_review, reference_only_review
- Allowed evidence lanes: lane-specific
- Requires reason code: false
- Future publication-gate handoff candidate after action: false

### confirm_internal_candidate

- From statuses: pending, in_review
- To status: resolved
- To disposition: review_confirmed_internal_candidate
- Allowed review lanes: high_signal_review, candidate_review
- Allowed evidence lanes: raw_single, slab
- Requires reason code: true
- Future publication-gate handoff candidate after action: true

### require_split

- From statuses: pending, in_review
- To status: blocked
- To disposition: review_split_required
- Allowed review lanes: lane-specific
- Allowed evidence lanes: mixed_raw_slab
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### block_evidence

- From statuses: pending, in_review
- To status: blocked
- To disposition: review_blocked
- Allowed review lanes: high_signal_review, candidate_review, reference_only_review, low_signal_monitor
- Allowed evidence lanes: lane-specific
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### block_classification

- From statuses: pending, in_review
- To status: blocked
- To disposition: review_blocked_classification
- Allowed review lanes: classification_review
- Allowed evidence lanes: classification_blocked
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### request_reclassification

- From statuses: pending, in_review
- To status: blocked
- To disposition: review_reclassify
- Allowed review lanes: classification_review
- Allowed evidence lanes: lane-specific
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### defer_more_evidence

- From statuses: pending, in_review
- To status: resolved
- To disposition: review_defer_more_evidence
- Allowed review lanes: high_signal_review, candidate_review, classification_review, low_signal_monitor
- Allowed evidence lanes: lane-specific
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### reference_crosscheck

- From statuses: pending, in_review
- To status: resolved
- To disposition: review_reference_crosscheck
- Allowed review lanes: reference_only_review
- Allowed evidence lanes: reference_metric
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### defer_active_market_evidence

- From statuses: pending, in_review
- To status: resolved
- To disposition: review_defer_active_market_evidence
- Allowed review lanes: reference_only_review
- Allowed evidence lanes: reference_metric
- Requires reason code: true
- Future publication-gate handoff candidate after action: false

### confirm_monitor_only

- From statuses: pending, in_review, resolved
- To status: resolved
- To disposition: monitor_only
- Allowed review lanes: low_signal_monitor
- Allowed evidence lanes: lane-specific
- Requires reason code: false
- Future publication-gate handoff candidate after action: false


## Reason Codes

- `approved_internal_raw_single_signal`
- `approved_internal_slab_signal`
- `mixed_raw_slab_requires_split`
- `classification_noise`
- `wrong_identity`
- `unresolved_match_ambiguity`
- `lot_bulk_sealed_proxy_noise`
- `reference_only_no_market_support`
- `low_signal_sample`
- `insufficient_source_independence`
- `stale_signal`
- `special_lane_ambiguous`
- `manual_hold`

## Handoff Eligibility

A resolved review may be considered by a future publication gate only when:

- action is `confirm_internal_candidate`
- resulting disposition is `review_confirmed_internal_candidate`
- resulting status is `resolved`
- review lane is `high_signal_review` or `candidate_review`
- evidence lane is `raw_single` or `slab`
- raw-single and slab evidence are not mixed
- all public flags remain false
- future publication contract independently checks source independence, recency, outliers, and display rules

This workflow never sets `publication_gate_candidate`, `can_publish_price_directly`, `publishable`, `app_visible`, or `market_truth` to true.

## Blockers

- mixed raw/slab evidence
- classification-blocked evidence
- reference-only evidence
- unknown evidence lane
- wrong identity
- unresolved match ambiguity
- lot/bulk/sealed/proxy/custom noise
- slab/raw contamination
- stale or insufficiently independent signal

## Required Future Schema

A future implementation should add an append-only service-role-only action table such as `market_evidence_review_action_events`.

Required columns:

- `id`
- `disposition_id`
- `card_print_id`
- `action_name`
- `from_status`
- `to_status`
- `from_disposition`
- `to_disposition`
- `reason_code`
- `review_note`
- `action_payload`
- `review_actor`
- `created_at`

The current disposition update should be mediated by a service-role-only function with optimistic locking. Direct client updates should not be used.
