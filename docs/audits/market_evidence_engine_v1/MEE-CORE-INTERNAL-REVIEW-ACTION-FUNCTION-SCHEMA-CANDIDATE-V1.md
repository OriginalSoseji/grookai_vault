# MEE Core Internal Review Action Function Schema Candidate V1

Generated: 2026-06-26T20:27:06.649Z

Mode: plan only, local artifacts only

## Summary

- Package: `MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1`
- Fingerprint: `5de312992d413cc504bf93c9d6c1092cbb90e1d982eb7a7ed93fe613ddd0a2ec`
- Migration hash: `99132c3c9f7f17715acfe8e67b26f1b5cd9811d69734a21ffb7ecf795a76de3b`
- Function: `public.apply_market_evidence_review_action_v1`
- Service-role execute only
- Optimistic locking required
- No invocation in this package

## Function Behavior When Later Invoked

- validates action name and reason code
- locks one review disposition row
- checks `expected_updated_at`
- validates transition against the internal workflow
- inserts one action event row
- updates only the matching disposition row
- forces all public pricing flags false

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, actual action event inserts, actual disposition updates, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, or global apply.
