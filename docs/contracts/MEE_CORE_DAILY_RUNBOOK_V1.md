# MEE Core Daily Runbook V1

Generated: 2026-06-27T05:23:02.004Z

Status: complete

## Daily Flow

1. Run ingestion only after foundation checks pass.
2. Run MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1.
3. Review orchestrator summary and safe-action count.
4. Run MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1 preflight.
5. Apply one safe internal review-action batch only when explicitly approved.
6. Run batch readback and post-apply audit.
7. Stop before public pricing unless a separate publish-gate package is prepared and approved.

## Boundary

Ingest, review, and publish are separate phases. Public pricing is never bundled with ingest or review.
