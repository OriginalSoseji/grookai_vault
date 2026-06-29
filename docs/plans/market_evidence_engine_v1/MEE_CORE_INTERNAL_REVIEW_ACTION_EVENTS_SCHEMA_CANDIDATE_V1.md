# MEE Core Internal Review Action Events Schema Candidate V1

Status: plan only

## Objective

Create a local migration candidate for append-only internal review action event tracking.

## Proposed Objects

- Table: `market_evidence_review_action_events`
- Indexes: 4
- Policies: service-role select and insert only

## Why This Exists

The current review disposition row represents current state. The action events table records the auditable history of how a reviewer or system moved that row through the internal workflow.

## Next Step After This Plan

Request targeted remote schema apply only, using the migration hash in the report.
