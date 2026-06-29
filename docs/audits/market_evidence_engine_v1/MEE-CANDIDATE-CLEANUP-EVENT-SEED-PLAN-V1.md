# MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Prepared a local DB seed/apply package for the `52,630` audited `market_listing_card_candidates` behind the `470` held publication-gate rows.

No DB writes. No remote apply. No cleanup event inserts. No provider calls. No source fetches. No public pricing.

## Target Table

Future approved apply would insert append-only rows into:

`public.market_listing_candidate_cleanup_events`

No source evidence rows are mutated.

## Planned Rows

```json
{
  "cleanup_event_rows": 52630,
  "distinct_candidate_ids": 52630,
  "duplicate_candidate_id_rows": 0,
  "public_boundary_rows": 0,
  "sql_chunks": 11
}
```

## Cleanup Actions

```json
{
  "require_special_lane_policy": 39180,
  "quarantine_candidate": 1671,
  "require_matcher_reclassify": 9610,
  "require_high_value_review": 2169
}
```

## Cleanup States

```json
{
  "needs_special_lane_policy": 39180,
  "quarantined": 1671,
  "needs_matcher_reclassify": 9610,
  "needs_high_value_review": 2169
}
```

## Evidence Lanes

```json
{
  "raw_single": 46743,
  "slab": 5887
}
```

## Apply Package Shape

The future apply package is chunked:

- driver: `docs/sql/mee_candidate_cleanup_event_seed_v1/mee_candidate_cleanup_event_seed_v1_apply_candidate.sql`
- chunks: `docs/sql/mee_candidate_cleanup_event_seed_v1/mee_candidate_cleanup_event_seed_v1_apply_candidate_part_001.sql` through `part_011.sql`

The chunks are not executed by this package.

## Safety

Every planned event row keeps:

- `can_publish_price_directly=false`
- `publishable=false`
- `app_visible=false`
- `market_truth=false`
- `can_publish_price_directly_at_action=false`

The package includes preflight SQL to detect existing cleanup events for the same candidate IDs before any future apply.

## Artifacts

- Row manifest: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1/row_manifest.json`
- Full seed rows: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1/cleanup_event_seed_rows.json`
- Hashes: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1/hashes.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1/report.json`
- Preflight SQL: `docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql`
- Readback SQL: `docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql`
- Rollback candidate: `docs/sql/mee_candidate_cleanup_event_seed_v1_rollback_candidate.sql`
- Contract test: `tests/contracts/mee_candidate_cleanup_event_seed_plan_v1.test.mjs`

## Next Step

If accepted, the next approval should apply the chunked seed package in one bounded run, then read back row counts and public-boundary proofs.

