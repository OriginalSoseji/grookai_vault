# MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Design the non-public candidate cleanup action model for `market_listing_card_candidates` behind held publication-gate rows.

No remote apply. No DB writes. No function invocation. No provider calls. No source fetches. No public pricing.

## Proposed Schema

```json
{
  "tables": [
    "public.market_listing_candidate_cleanup_events"
  ],
  "views": [
    "public.v_market_listing_candidate_cleanup_current_v1",
    "public.v_market_listing_candidate_cleanup_card_summary_v1"
  ],
  "indexes": 4,
  "policies": 2
}
```

## Cleanup Actions

```json
[
  "keep_review",
  "quarantine_candidate",
  "require_matcher_reclassify",
  "require_special_lane_policy",
  "require_high_value_review",
  "defer_until_more_evidence"
]
```

## Cleanup States

```json
[
  "review_open",
  "quarantined",
  "needs_matcher_reclassify",
  "needs_special_lane_policy",
  "needs_high_value_review",
  "deferred_more_evidence"
]
```

## Boundary

The schema candidate is internal-only. All event rows are constrained to keep:

- `can_publish_price_directly=false`
- `publishable=false`
- `app_visible=false`
- `market_truth=false`

No update or delete grant is proposed.

## Decision

No remote schema apply is performed by this package.

The next step, if approved, is a targeted remote schema apply for the local migration candidate. After that, a separate non-public seed/action package can insert cleanup events.

## Artifacts

- Contract: `docs/contracts/MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1.md`
- Plan: `docs/plans/market_evidence_engine_v1/MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1.md`
- Migration candidate: `supabase/migrations/20260625120000_market_listing_candidate_cleanup_action_model_v1.sql`
- SQL candidate mirror: `docs/sql/mee_candidate_cleanup_action_model_v1_migration_candidate.sql`
- Rollback dry run: `docs/sql/mee_candidate_cleanup_action_model_v1_rollback_dry_run.sql`
- Readback SQL: `docs/sql/mee_candidate_cleanup_action_model_v1_readback.sql`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1/report.json`
- Schema manifest: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1/schema_manifest.json`
- Contract test: `tests/contracts/mee_candidate_cleanup_action_model_v1.test.mjs`

