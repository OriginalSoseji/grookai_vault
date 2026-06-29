# MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1

## Status

- Package fingerprint: `39f67222b3d267a5d68ae36460b840aa5e01fc639aebb1ad089f35562e5fcac6`
- Status: `manual_or_threshold_required_no_auto_confirm`
- Candidate rows: `270`

## Lane Summary

| review_lane | evidence | rows | median evidence | median rollup | multi-source rows | zero-quality-flag rows |
| --- | --- | --- | --- | --- | --- | --- |
| candidate_review | raw_single | 224 | 78 | 6 | 27 | 0 |
| candidate_review | slab | 36 | 44 | 4 | 9 | 0 |
| high_signal_review | raw_single | 10 | 55 | 11 | 10 | 0 |

## Decision

The `270` remaining raw/slab candidate rows are not safe for automatic confirmation yet.

They remain manual or future threshold-gated because current review rows do not prove enough about independent source quality, condition/grade separation, outliers, freshness, and identity confidence.

## Required Before Automation

- independent-source rule that distinguishes sellers/listings from provider families
- freshness window for active listings
- outlier trim or robust spread gate
- condition/grade normalization split for raw and slab lanes
- identity-confidence readback to ensure listing title maps to one GV ID
- minimum evidence quality threshold that excludes quality-flagged rows
- publish-gate handoff contract that remains separate from review action confirmation

## Proposed Threshold Shape

```json
[
  {
    "lane": "raw_single",
    "minimum_rollup_eligible_count": 5,
    "minimum_source_family_count": 2,
    "allowed_action_without_manual_review": "none",
    "future_candidate_action": "confirm_internal_candidate_after_threshold_contract",
    "notes": "Raw singles can become internal candidates only after independent source, freshness, outlier, condition, and identity checks exist."
  },
  {
    "lane": "slab",
    "minimum_rollup_eligible_count": 5,
    "minimum_source_family_count": 2,
    "allowed_action_without_manual_review": "none",
    "future_candidate_action": "confirm_internal_candidate_after_threshold_contract",
    "notes": "Slabs must stay separate from raw singles and require grade/company parsing before any publish-gate handoff."
  },
  {
    "lane": "high_signal_raw_single",
    "minimum_rollup_eligible_count": 3,
    "minimum_source_family_count": 2,
    "allowed_action_without_manual_review": "none",
    "future_candidate_action": "priority_manual_review",
    "notes": "High-signal rows get priority, not automatic confirmation."
  }
]
```

## Boundary

No `confirm_internal_candidate` action is allowed by this contract.

No public pricing may be written by this contract.
