# MEE Core Internal Classification Review Action Plan V1

Generated: 2026-06-27T02:43:07.678Z

Mode: plan only

## Action

- Action: `request_reclassification`
- Reason code: `classification_noise`
- Review actor: `system_classification_review_action_plan`
- Target count: `19`
- Transition: `pending/review_pending_classification_fix` -> `blocked/review_reclassify`

## Rationale

The rows have active-listing evidence but no safe raw_single/slab classification and no rollup eligibility. They should be sent back to classifier/reprocessing before any high-signal or publication workflow.

## Hashes

- Package fingerprint: `18c7e2a590956b473f0989b19b5c9ebc9a88806fd5b0efb2bf8a8f71e0326f00`
- Row manifest hash: `87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc`
- Apply SQL hash: `cba22496f117b140a32d26b1eac7442a0892497c31eea750053ea6893009f7f7`

## Findings

- None
