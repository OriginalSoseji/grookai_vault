# MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1

Mode: run only

Generated: 2026-06-27

## Scope

Audited the newly seeded `market_listing_candidate_cleanup_events` rows and internal cleanup read-model views after `MEE-CANDIDATE-CLEANUP-EVENT-SEED-APPLY-V1`.

No DB writes. No cleanup event inserts. No provider calls. No source fetches. No function invocation. No public pricing.

## Cleanup Event Readback

```json
{
  "cleanup_event_rows": 52630,
  "distinct_candidate_ids": 52630,
  "distinct_card_prints": 470,
  "public_boundary_leak_rows": 0
}
```

## Cleanup Card Summary

```json
{
  "card_summary_rows": 470,
  "cleanup_candidate_rows": 52630,
  "quarantined_candidate_rows": 1671,
  "matcher_reclassify_candidate_rows": 9610,
  "special_lane_policy_candidate_rows": 39180,
  "high_value_review_candidate_rows": 2169,
  "public_boundary_leak_rows": 0
}
```

## Publication Gate Comparison

The publication gate remains intentionally blocked/deferred:

```json
{
  "held_rows": 470,
  "raw_single_rows": 378,
  "slab_rows": 92,
  "public_boundary_leak_rows": 0
}
```

Cleanup coverage against held rows:

```json
{
  "held_card_rows": 470,
  "cleanup_card_rows": 470,
  "matched_held_cleanup_rows": 470,
  "held_without_cleanup_rows": 0
}
```

## Interpretation

The cleanup seed succeeded. The engine now has durable, internal cleanup state for all candidate evidence behind the 470 held publication-gate rows.

This does not make any price public. It gives the next layer a stable input for special-lane policy, matcher reclassification, high-value review, and quarantine workflows.

## Artifacts

- Readback JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1/readback.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1/report.json`
- Readback SQL: `docs/sql/mee_candidate_cleanup_post_seed_readback_v1.sql`
- Contract test: `tests/contracts/mee_candidate_cleanup_post_seed_readback_v1.test.mjs`

