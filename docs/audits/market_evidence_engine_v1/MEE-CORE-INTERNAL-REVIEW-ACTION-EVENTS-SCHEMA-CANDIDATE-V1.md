# MEE Core Internal Review Action Events Schema Candidate V1

Generated: 2026-06-26T20:18:54.113Z

Mode: plan only, local artifacts only

## Summary

- Package: `MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1`
- Fingerprint: `f9f9f413dc70ad380e8d65cb0d6d0c8e7e1ccc4a29be62d43857ff6771889e23`
- Source workflow: `MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1`
- Migration hash: `8b56c0f2edd36aac3e47fb376a87c02ee22b31da1202848f44af83a6e9b33216`
- Proposed table: `public.market_evidence_review_action_events`
- Proposed indexes: 4
- Proposed policies: 2

## Allowed Actions

- `start_review`
- `confirm_internal_candidate`
- `require_split`
- `block_evidence`
- `block_classification`
- `request_reclassification`
- `defer_more_evidence`
- `reference_crosscheck`
- `defer_active_market_evidence`
- `confirm_monitor_only`

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, disposition updates, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, or global apply.
