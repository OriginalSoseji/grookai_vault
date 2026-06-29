# MEE Core Lifecycle Post-Drain Readback V1

Generated: 2026-06-28T16:57:23.347Z

Mode: read-only post-drain integrity audit

## Summary

- Package: `MEE-CORE-LIFECYCLE-POST-DRAIN-READBACK-V1`
- Fingerprint: `6011ca00388fd750f6891e8dd305e3a0ec92b1cd0625f551525959ad3a3a1e9e`
- Findings: 2

## Coverage

```json
{
  "lifecycle_totals": {
    "active_listing_observations": 183635,
    "events": 1362641,
    "observations": 194663,
    "reference_observations": 11025
  },
  "remaining": {
    "active_listing": 0,
    "reference": 310744
  },
  "source_totals": {
    "active_listing_candidates": 183635,
    "reference_normalized_evidence": 321769
  }
}
```

## Stage Integrity

```json
{
  "app_visible_true_observations": 0,
  "duplicate_observation_keys": 0,
  "event_count": 1362641,
  "event_hash_distinct_count": 1362641,
  "expected_event_count": 1362641,
  "market_truth_true_observations": 0,
  "observation_count": 194663,
  "publishable_true_observations": 0,
  "stage_counts": {
    "acquired": 194663,
    "classified": 194663,
    "matched": 194663,
    "normalized": 194663,
    "quality_gated": 194663,
    "raw_stored": 194663,
    "rollup_eligible": 194663
  },
  "unexpected_stage_count": 0
}
```

## Public Boundary

```json
{
  "ebay_active_prices_latest_count": 1690,
  "pricing_observations_count": 0,
  "v_card_pricing_references_market_evidence": false
}
```

## Findings

- reference_rows_remaining
- reference_coverage_mismatch
