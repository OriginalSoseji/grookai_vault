# MEE Core Lifecycle Tiny Backfill Apply V1

Generated: 2026-06-26T15:27:11.839Z

Mode: targeted tiny insert apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-TINY-BACKFILL-APPLY-V1`
- Package fingerprint: `ccae8cc94580eb30ce15fec487d603f369ce5de0eb2cea7db8052fd10c0717a9`
- Source plan fingerprint: `aabb3f8d7556afed1ff8a85a75cc44007f7d468a225f60f813650251b0218e2f`
- Inserted observations: 6
- Inserted lifecycle events: 42

## Readback

```json
{
  "events": {
    "actual": 42,
    "expected": 42,
    "distinct_event_hashes": 42
  },
  "current_view": {
    "actual": 6,
    "expected": 6,
    "app_visible_true": 0,
    "market_truth_true": 0,
    "rollup_eligible_state_count": 6
  },
  "observations": {
    "actual": 6,
    "expected": 6
  },
  "stage_sequences": [
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "1f678516-0156-4676-aefa-cfa2fd25dbc6",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    },
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "4ecb7360-0b47-442f-a610-ee529f1e6e5a",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    },
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "8045dbf8-8fe3-4e00-acdd-a1ce76a2ffe6",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    },
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "9df9367e-7249-49ce-a30e-0d9c7a2088a2",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    },
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "c14fbcfb-629a-4934-ae0b-9a7bc4ff2780",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    },
    {
      "stages": [
        "acquired",
        "raw_stored",
        "normalized",
        "matched",
        "classified",
        "quality_gated",
        "rollup_eligible"
      ],
      "event_count": 7,
      "observation_id": "d11bac55-63ce-4571-ad35-e079bcb90085",
      "app_visible_leak": false,
      "publishable_leak": false,
      "market_truth_leak": false,
      "needs_review_leak": false
    }
  ],
  "public_pricing_surface": {
    "pricing_observations_count": 0,
    "v_card_pricing_references_market_evidence": false
  }
}
```

## Boundary Proof

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "identity_table_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "deletes": false,
  "upserts": false,
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Findings

- none

## Next Step

Create a readback/view smoke for `v_market_evidence_lifecycle_current_v1`, then plan the next bounded batch size.
