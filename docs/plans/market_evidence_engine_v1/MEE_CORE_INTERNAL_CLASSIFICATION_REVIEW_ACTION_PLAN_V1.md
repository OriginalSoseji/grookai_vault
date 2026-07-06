# MEE Core Internal Classification Review Action Plan V1

Status: plan only

## Purpose

Prepare a controlled review-action apply package for the 19 classification-blocked rows identified by `MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1`.

## Proposed Action

Use `public.apply_market_evidence_review_action_v1` with:

- action: `request_reclassification`
- reason: `classification_noise`
- actor: `system_classification_review_action_plan`

This records that the rows need classifier/reprocessing work before they can become rollup eligible. It does not publish pricing, does not create market truth, and does not write pricing observations.
