# MEE Core Review Lane Policy Contract V1

Generated: 2026-06-27T05:09:36.186Z

Status: plan only

## Purpose

Define reusable post-ingest review lane policy before any batch review action workflow or publish gate exists.

## Global Policy

- providers_create_market_truth: `false`
- active_listings_are_market_truth: `false`
- reference_metrics_are_market_truth: `false`
- review_actions_can_publish_prices: `false`
- lane_policy_can_write_pricing_observations: `false`
- lane_policy_can_write_ebay_active_prices_latest: `false`
- lane_policy_can_set_public_flags: `false`
- public_pricing_requires_separate_publish_gate: `true`
- post_ingest_orchestrator_is_plan_only_until_batch_workflow: `true`

## Lane Policies

- `low_signal_monitor_auto_monitor`: lane=`low_signal_monitor`, evidence=`*`, action=`confirm_monitor_only`, class=`auto_safe_internal`, publish_gate_candidate=`false`
- `classification_blocked_request_reclassification`: lane=`classification_review`, evidence=`classification_blocked`, action=`request_reclassification`, class=`auto_safe_internal`, publish_gate_candidate=`false`
- `mixed_raw_slab_require_split`: lane=`candidate_review, high_signal_review`, evidence=`mixed_raw_slab`, action=`require_split`, class=`auto_safe_internal`, publish_gate_candidate=`false`
- `raw_single_internal_candidate_review_hold`: lane=`candidate_review, high_signal_review`, evidence=`raw_single`, action=`confirm_internal_candidate`, class=`reviewer_or_explicit_policy_required`, publish_gate_candidate=`true`
- `slab_internal_candidate_review_hold`: lane=`candidate_review, high_signal_review`, evidence=`slab`, action=`confirm_internal_candidate`, class=`reviewer_or_explicit_policy_required`, publish_gate_candidate=`true`
- `reference_metric_hold`: lane=`candidate_review, high_signal_review, reference_only_review`, evidence=`reference_metric`, action=`defer_more_evidence_or_defer_active_market_evidence`, class=`hold_until_reference_policy`, publish_gate_candidate=`false`
- `unknown_evidence_manual_hold`: lane=`*`, evidence=`unknown`, action=`defer_more_evidence`, class=`hold_until_manual_review`, publish_gate_candidate=`false`
- `terminal_no_action`: lane=`*`, evidence=`*`, action=`none`, class=`no_action`, publish_gate_candidate=`false`

## Current Policy Impact

- Safe internal action rows: `550`
- Held action rows: `1203`
- Current safe action to apply next: `require_split`
- Current safe rows to apply next: `550`

## Foundation Status

- Satisfies blocker: `lane_policy_contract`
- Foundation after this package: `not_complete`
- Remaining blockers: `batch_review_action_workflow`, `publish_gate_contract`, `runbook`

## Findings

- None
