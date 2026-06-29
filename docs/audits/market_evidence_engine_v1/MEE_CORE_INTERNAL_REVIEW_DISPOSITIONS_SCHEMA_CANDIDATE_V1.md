# MEE Core Internal Review Dispositions Schema Candidate V1

Status: plan only, local files only

## Objective

Create a local Supabase migration candidate for internal-only Market Evidence Engine review disposition tracking.

This package gives Grookai a place to record review decisions such as `review_confirmed_internal_candidate`, `review_split_required`, `review_blocked`, and `monitor_only` without creating public pricing.

## Proposed Object

- `public.market_evidence_review_dispositions`

## Hashes

- Migration hash: `E175C56D372A5AAF50464535A344562198C596A98A5273398AD001B1BF3339BD`
- SQL candidate hash: `E175C56D372A5AAF50464535A344562198C596A98A5273398AD001B1BF3339BD`
- Rollback-only dry-run SQL hash: `1E4EFBC6392D8F1FE95382072B07987ED08D93E9D9ED4A5EA6B5B2E7913B2036`
- Readback SQL hash: `1028BFA91ACCD43F128AA2E9BB874278AF988C25B7A216D5AC12C9C5AB41AEC2`

## Files

- `supabase/migrations/20260625080000_market_evidence_review_dispositions_v1.sql`
- `docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql`
- `docs/sql/mee_core_internal_review_dispositions_v1_rollback_dry_run.sql`
- `docs/sql/mee_core_internal_review_dispositions_v1_readback.sql`
- `tests/contracts/mee_core_internal_review_dispositions_schema_candidate_v1.test.mjs`

## Design

The table records one active review disposition per `card_print_id`, `review_lane`, and `evidence_lane`.

Allowed review lanes:

- `high_signal_review`
- `candidate_review`
- `classification_review`
- `reference_only_review`
- `low_signal_monitor`

Allowed statuses:

- `pending`
- `in_review`
- `resolved`
- `blocked`
- `superseded`

The table is internal-only and hard-checks all public-facing flags to `false`:

- `publication_gate_candidate`
- `can_publish_price_directly`
- `publishable`
- `app_visible`
- `market_truth`

## Boundaries

- No remote migration apply.
- No DB writes.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes, upserts, merges, or global apply.

## Findings

- none
