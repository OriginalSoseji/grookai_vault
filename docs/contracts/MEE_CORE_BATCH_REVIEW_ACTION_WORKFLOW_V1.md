# MEE Core Batch Review Action Workflow V1

Generated: 2026-06-27T05:23:01.992Z

Status: plan only

## Purpose

Convert post-ingest safe internal review actions into one auditable apply package instead of lane-by-lane approvals.

## Current Batch

- Safe internal action rows: `550`
- Action: `require_split`
- Public pricing: `false`
- Market truth: `false`
- Public flags: `false`

## Files

- `docs/sql/mee_core_batch_review_action_workflow_v1_preflight.sql`
- `docs/sql/mee_core_batch_review_action_workflow_v1_apply_candidate.sql`
- `docs/sql/mee_core_batch_review_action_workflow_v1_readback.sql`
- `docs/sql/mee_core_batch_review_action_workflow_v1_rollback_candidate.sql`
