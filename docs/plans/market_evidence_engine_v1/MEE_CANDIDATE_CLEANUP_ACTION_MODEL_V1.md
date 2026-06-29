# MEE Candidate Cleanup Action Model V1

Mode: plan only

## Scope

Create a local schema candidate for append-only cleanup decisions against `market_listing_card_candidates`.

## Proposed Local SQL

- Migration candidate: `supabase/migrations/20260625120000_market_listing_candidate_cleanup_action_model_v1.sql`
- SQL candidate mirror: `docs/sql/mee_candidate_cleanup_action_model_v1_migration_candidate.sql`
- Rollback-only proof: `docs/sql/mee_candidate_cleanup_action_model_v1_rollback_dry_run.sql`
- Readback SQL: `docs/sql/mee_candidate_cleanup_action_model_v1_readback.sql`

## Proposed Objects

- `public.market_listing_candidate_cleanup_events`
- `public.v_market_listing_candidate_cleanup_current_v1`
- `public.v_market_listing_candidate_cleanup_card_summary_v1`

## Boundary

This package is local only. It does not apply the schema remotely and does not write cleanup events.

