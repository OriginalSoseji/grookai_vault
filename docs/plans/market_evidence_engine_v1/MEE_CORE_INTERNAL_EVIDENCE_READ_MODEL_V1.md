# MEE Core Internal Evidence Read Model V1

Status: plan only

## Objective

Create internal-only card-level evidence read models on top of completed lifecycle data. These models summarize evidence coverage, source mix, review burden, lifecycle flags, and internal rollup candidacy without creating public pricing.

## Proposed Objects

- `v_market_evidence_card_signal_summary_v1`
- `v_market_evidence_card_review_queue_v1`

## Boundaries

No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public price rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.

## SQL Candidate

`docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql`
