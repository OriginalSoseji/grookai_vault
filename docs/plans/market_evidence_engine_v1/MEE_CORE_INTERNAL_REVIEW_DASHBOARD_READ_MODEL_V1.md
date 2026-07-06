# MEE Core Internal Review Dashboard Read Model V1

Status: plan only

## Objective

Create local internal-only review dashboard read-model SQL candidates over seeded MEE review dispositions.

## Proposed Views

- `v_market_evidence_review_dashboard_queue_v1`
- `v_market_evidence_review_dashboard_status_summary_v1`
- `v_market_evidence_review_dashboard_blocker_queue_v1`

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.
