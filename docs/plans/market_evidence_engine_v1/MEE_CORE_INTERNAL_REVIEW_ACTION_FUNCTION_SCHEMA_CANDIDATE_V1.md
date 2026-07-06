# MEE Core Internal Review Action Function Schema Candidate V1

Status: plan only

## Objective

Create a local migration candidate for the internal service-role-only function that applies one review action safely.

## Proposed Function

`public.apply_market_evidence_review_action_v1`

## Safety Controls

- service-role execute only
- optimistic lock via `expected_updated_at`
- transition matrix enforced in PL/pgSQL
- one action event insert when invoked
- one matching disposition update when invoked
- public/app-visible/market-truth flags forced false

## Next Step After This Plan

Request targeted remote schema apply only, using the migration hash in the report.
