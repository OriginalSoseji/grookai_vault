# MEE Core Internal Review Workflow V1

Status: plan only

## Objective

Create the internal review workflow contract for the MEE read-model views.

## Artifacts

- `docs/contracts/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md`
- `docs/sql/mee_core_internal_review_workflow_v1_readback.sql`
- `docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/report.json`

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, public pricing, app-visible pricing, public price rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.
