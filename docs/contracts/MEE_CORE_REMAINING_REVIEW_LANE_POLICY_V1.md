# MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1

## Status

- Package fingerprint: `36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f`
- Status: `ready_for_batch_plan_generation`
- Source fast readback: `61130638ec16dc75a5fd6e05410349e7b5ddb26f7f3f1b9a5b6f9ee48e382c0a`

## Purpose

Finish the remaining review-lane policy after mixed raw/slab split rows were routed.

This package does not apply actions. It defines what can be automated later and what must stay manual or threshold-gated.

## Policy

| lane | evidence | rows | action | class |
| --- | --- | --- | --- | --- |
| candidate_review | raw_single | 224 | manual_review_or_future_threshold | manual_or_threshold_required |
| high_signal_review | raw_single | 10 | priority_manual_review | manual_or_threshold_required |
| candidate_review | slab | 36 | manual_review_or_future_threshold | manual_or_threshold_required |
| candidate_review, high_signal_review | reference_metric | 911 | defer_more_evidence | auto_safe_internal_after_policy |
| reference_only_review | reference_metric | 4 | defer_active_market_evidence | auto_safe_internal_after_policy |
| candidate_review | unknown | 18 | block_evidence | auto_safe_internal_after_policy |

## Safe Internal Actions After This Policy

- Reference metric defer-more-evidence rows: `911`
- Reference-only defer-active-market-evidence rows: `4`
- Unknown block-evidence rows: `18`
- Total safe internal rows: `933`

## Not Auto Safe

- Raw single candidate rows: `224`
- Raw single high-signal rows: `10`
- Slab candidate rows: `36`
- Total manual or threshold-required rows: `270`

## Boundaries

No public pricing may be produced by this policy.

No app-visible pricing may be produced by this policy.

Reference metrics and active listings remain evidence, not truth.
