# MEE Core Internal Evidence Read Model Schema Candidate V1

Status: plan only, local files only

## Objective

Package the completed internal read-model SQL candidate as a local Supabase migration candidate without applying it remotely.

## Candidate Objects

- `public.v_market_evidence_card_signal_summary_v1`
- `public.v_market_evidence_card_review_queue_v1`

Both views are internal-only read models over `market_evidence_observations` and `market_evidence_lifecycle_events`.

## Hashes

- Migration hash: `5D26257DB0C987922B942E56D7E8924901784A31FDCCDE9C21740EA0CA30D5E1`
- SQL candidate hash: `5D26257DB0C987922B942E56D7E8924901784A31FDCCDE9C21740EA0CA30D5E1`
- Rollback-only dry-run SQL hash: `9796D2B503BC9C86987CEB7E0CEB53E24EAF91EA41C4A3A8C58BD8B7500426AB`

## Files

- `supabase/migrations/20260625070000_market_evidence_internal_read_model_v1.sql`
- `docs/sql/mee_core_internal_evidence_read_model_v1_migration_candidate.sql`
- `docs/sql/mee_core_internal_evidence_read_model_v1_rollback_dry_run.sql`
- `docs/sql/mee_core_internal_evidence_read_model_v1_readback.sql`
- `tests/contracts/mee_core_internal_evidence_read_model_schema_candidate_v1.test.mjs`

## Boundaries

- No remote migration apply.
- No DB writes.
- No provider calls.
- No source fetches.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity, vault, image, or storage writes.
- No deletes, upserts, merges, or global apply.

## Readback Plan

After a separate targeted remote schema apply, use `docs/sql/mee_core_internal_evidence_read_model_v1_readback.sql` to verify:

- both internal views exist
- grants remain service-role oriented
- card signal rows do not expose publishable, app-visible, or market-truth rows
- review lane counts are available for operator review

## Findings

- none
