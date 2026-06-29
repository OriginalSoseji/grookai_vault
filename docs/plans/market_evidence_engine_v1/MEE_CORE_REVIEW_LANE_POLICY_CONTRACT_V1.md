# MEE Core Review Lane Policy Contract V1

Status: plan only

## Role In Foundation

This package completes the lane-policy blocker. It does not complete the whole MEE foundation.

## Policy Summary

- Auto-safe internal actions: `confirm_monitor_only`, `request_reclassification`, `require_split`.
- Held actions: `confirm_internal_candidate`, reference-metric deferrals, unknown/manual holds.
- No lane policy may write pricing, create market truth, or set public/app-visible flags.
- Publish-gate eligibility is only a future handoff concept and still requires `MEE-CORE-PUBLISH-GATE-CONTRACT-V1`.

## Next

Build `MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1` so current safe internal actions can be handled as one package instead of lane-by-lane approvals.
