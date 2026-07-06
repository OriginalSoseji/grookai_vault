# MEE Core Post-Ingest Review Orchestrator V1

Generated: 2026-06-27T05:05:04.885Z

Mode: plan only

## Purpose

Replace manual lane-by-lane post-ingest cleanup with one deterministic internal review status and action grouping.

## Action Plan

- Action plan rows: `1753`
- Safe internal action rows: `550`
- Held action rows: `1203`

## Buckets

- auto_safe_require_raw_slab_split: `550`
- human_review_internal_candidate: `270`
- policy_hold_unclassified_candidate_review: `732`
- no_action_terminal_or_already_routed: `399`
- policy_hold_reference_metric_high_signal: `197`
- policy_hold_reference_only: `4`

## Actions

- require_split: `550`
- confirm_internal_candidate: `270`
- defer_more_evidence: `929`
- defer_active_market_evidence: `4`

## Current Status

- candidate_review/mixed_raw_slab/pending/review_pending_candidate, needs_review=true: `544`
- candidate_review/raw_single/pending/review_pending_candidate, needs_review=true: `224`
- candidate_review/reference_metric/pending/review_pending_candidate, needs_review=true: `714`
- candidate_review/slab/pending/review_pending_candidate, needs_review=true: `36`
- candidate_review/unknown/pending/review_pending_candidate, needs_review=true: `18`
- classification_review/classification_blocked/blocked/review_reclassify, needs_review=false: `19`
- high_signal_review/mixed_raw_slab/pending/review_pending_high_signal, needs_review=true: `6`
- high_signal_review/raw_single/pending/review_pending_high_signal, needs_review=true: `10`
- high_signal_review/reference_metric/pending/review_pending_high_signal, needs_review=true: `197`
- low_signal_monitor/low_signal/resolved/monitor_only, needs_review=false: `156`
- low_signal_monitor/mixed_raw_slab/resolved/monitor_only, needs_review=false: `24`
- low_signal_monitor/raw_single/resolved/monitor_only, needs_review=false: `144`
- low_signal_monitor/slab/resolved/monitor_only, needs_review=false: `56`
- reference_only_review/reference_metric/pending/review_pending_reference_only, needs_review=true: `4`

## Boundary

- app_visible_rows: `0`
- can_publish_price_directly_rows: `0`
- market_truth_rows: `0`
- publication_gate_candidate_rows: `0`
- publishable_rows: `0`

## Findings

- None
