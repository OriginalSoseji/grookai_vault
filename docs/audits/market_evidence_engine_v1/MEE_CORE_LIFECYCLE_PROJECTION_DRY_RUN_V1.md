# MEE Core Lifecycle Projection Dry Run V1

Generated: 2026-06-26T15:16:11.024Z

Mode: read-only local projection, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-PROJECTION-DRY-RUN-V1`
- Fingerprint: `99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d`
- Reference samples: 3
- Active-listing samples: 3
- Projected observations: 6
- Projected lifecycle events: 42
- Stage sequence valid: true

## Boundary Proof

```json
{
  "db_writes": false,
  "evidence_backfill": false,
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
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Projected Stage Sequence

- 1. `acquired`
- 2. `raw_stored`
- 3. `normalized`
- 4. `matched`
- 5. `classified`
- 6. `quality_gated`
- 7. `rollup_eligible`

## Samples

```json
[
  {
    "lane": "reference",
    "observation": {
      "id": "c14fbcfb-629a-4934-ae0b-9a7bc4ff2780",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "pokemontcg_io_reference",
      "source_type": "reference",
      "provider_route": null,
      "source_record_id": "pokemontcg_io_reference:5498e1891ee56d753b92f84c2fa9ab4d7d84dc9a050c4b0e0d8cdd7b6336a559",
      "source_url": "https://prices.pokemontcg.io/cardmarket/det1-9",
      "acquisition_run_table": "market_reference_acquisition_runs",
      "acquisition_run_id": null,
      "raw_snapshot_table": "market_reference_raw_snapshots",
      "raw_snapshot_id": "7eda7964-adbd-40a9-9d27-bd8856c796f4",
      "provider_observation_table": "market_reference_normalized_evidence",
      "provider_observation_id": "09f47220-13a9-4500-9873-180b16d3ddc9",
      "provider_candidate_table": "market_reference_candidates",
      "provider_candidate_id": "8af9bf7a-5059-4fa4-a102-aeb0a203d466",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "65ec5d3e-5fe2-4d23-b077-cc89eb8b38c1",
      "gv_id": "GV-PK-DET-9",
      "observed_at": "2026-06-25 00:00:00+00",
      "adapter_version": "market_reference_existing_warehouse",
      "normalizer_version": "MEE_06C_REFERENCE_NORMALIZER_V1",
      "matcher_version": "market_reference_candidates_existing_match_hint",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "match_confidence_hint": "high",
        "metric_key": "trendprice",
        "metric_family": "reference_market_bucket"
      },
      "source_payload": {
        "model_disposition": "reference_model_candidate",
        "model_eligible": true,
        "normalized_currency": "EUR",
        "normalized_price_present": true
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  },
  {
    "lane": "reference",
    "observation": {
      "id": "8045dbf8-8fe3-4e00-acdd-a1ce76a2ffe6",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "pokemontcg_io_reference",
      "source_type": "reference",
      "provider_route": null,
      "source_record_id": "pokemontcg_io_reference:06480beb19cb2a269730fb04ff225fa005ab3df98be055a2de88dc54f2900869",
      "source_url": "https://prices.pokemontcg.io/cardmarket/det1-6",
      "acquisition_run_table": "market_reference_acquisition_runs",
      "acquisition_run_id": null,
      "raw_snapshot_table": "market_reference_raw_snapshots",
      "raw_snapshot_id": "53dcc41b-3ba6-4dfc-9636-577387b38fd8",
      "provider_observation_table": "market_reference_normalized_evidence",
      "provider_observation_id": "13ec0eb6-421e-4326-92b0-762eb45a999e",
      "provider_candidate_table": "market_reference_candidates",
      "provider_candidate_id": "ffed27a1-ff3b-4b1d-ae57-e9678c7553fc",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "6753532d-0a05-49ff-8606-ffe885128ffe",
      "gv_id": "GV-PK-DET-6",
      "observed_at": "2026-06-25 00:00:00+00",
      "adapter_version": "market_reference_existing_warehouse",
      "normalizer_version": "MEE_06C_REFERENCE_NORMALIZER_V1",
      "matcher_version": "market_reference_candidates_existing_match_hint",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "match_confidence_hint": "high",
        "metric_key": "reverseholoavg1",
        "metric_family": "unknown_reference_bucket"
      },
      "source_payload": {
        "model_disposition": "reference_model_candidate",
        "model_eligible": true,
        "normalized_currency": "EUR",
        "normalized_price_present": true
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  },
  {
    "lane": "reference",
    "observation": {
      "id": "4ecb7360-0b47-442f-a610-ee529f1e6e5a",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "pokemontcg_io_reference",
      "source_type": "reference",
      "provider_route": null,
      "source_record_id": "pokemontcg_io_reference:69797e622edd4c230a9d4977a026f57c52aa00a22b3a6d7dbea17e66b84e49d4",
      "source_url": "https://prices.pokemontcg.io/tcgplayer/det1-9",
      "acquisition_run_table": "market_reference_acquisition_runs",
      "acquisition_run_id": null,
      "raw_snapshot_table": "market_reference_raw_snapshots",
      "raw_snapshot_id": "d79cb3fe-5f2d-4e30-86ba-dbf8ba6785f3",
      "provider_observation_table": "market_reference_normalized_evidence",
      "provider_observation_id": "16a824e7-9373-4b17-a7ee-fa448c8c24db",
      "provider_candidate_table": "market_reference_candidates",
      "provider_candidate_id": "5606b727-ae4b-4dc5-8328-297a683a6da6",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "65ec5d3e-5fe2-4d23-b077-cc89eb8b38c1",
      "gv_id": "GV-PK-DET-9",
      "observed_at": "2026-06-25 00:00:00+00",
      "adapter_version": "market_reference_existing_warehouse",
      "normalizer_version": "MEE_06C_REFERENCE_NORMALIZER_V1",
      "matcher_version": "market_reference_candidates_existing_match_hint",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "match_confidence_hint": "high",
        "metric_key": "directlow",
        "metric_family": "reference_low_bucket"
      },
      "source_payload": {
        "model_disposition": "reference_model_candidate",
        "model_eligible": true,
        "normalized_currency": "USD",
        "normalized_price_present": true
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  },
  {
    "lane": "active_listing",
    "observation": {
      "id": "9df9367e-7249-49ce-a30e-0d9c7a2088a2",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "ebay_active",
      "source_type": "active_listing",
      "provider_route": "ebay_browse_api",
      "source_record_id": "ebay_active:v1|137423780138|0",
      "source_url": "https://www.ebay.com/itm/137423780138?_skw=Pokemon+%22Treecko%22+7&hash=item1fff18792a:g:yfMAAeSwCeVqMe7f",
      "acquisition_run_table": "market_listing_acquisition_runs",
      "acquisition_run_id": "28226719-47d6-7c35-7dab-4d57a2c3e3d9",
      "raw_snapshot_table": "market_listing_raw_snapshots",
      "raw_snapshot_id": "d096fcd9-f2e4-959c-ab23-bcb1e2f629d5",
      "provider_observation_table": "market_listing_observations",
      "provider_observation_id": "ee7b4ad2-04ac-d4df-a314-c5d27d38b5c1",
      "provider_candidate_table": "market_listing_card_candidates",
      "provider_candidate_id": "0000374b-660a-b483-227d-546927f37fe4",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "a7163b6b-ed6c-4daf-8cfb-5e55414d3bca",
      "gv_id": "GV-PK-PR-NP-7",
      "observed_at": "2026-06-26 00:30:41.703+00",
      "adapter_version": "market_listing_existing_warehouse",
      "normalizer_version": "market_listing_observations_existing_shape",
      "matcher_version": "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "listing_title": "Treecko 7/168 Common Celestial Storm Pokemon Lightly Played",
        "match_status": "needs_review",
        "match_confidence": "0.58"
      },
      "source_payload": {
        "listing_status": "active",
        "listing_format": "fixed_price",
        "currency": "USD",
        "total_ask_price_present": true,
        "listing_evidence_class": "raw_single"
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  },
  {
    "lane": "active_listing",
    "observation": {
      "id": "d11bac55-63ce-4571-ad35-e079bcb90085",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "ebay_active",
      "source_type": "active_listing",
      "provider_route": "ebay_browse_api",
      "source_record_id": "ebay_active:v1|206007706529|0",
      "source_url": "https://www.ebay.com/itm/206007706529?_skw=Pokemon+%22Computer+Search%22+137&hash=item2ff70423a1:g:e4oAAeSwek1pbVgJ",
      "acquisition_run_table": "market_listing_acquisition_runs",
      "acquisition_run_id": "28226719-47d6-7c35-7dab-4d57a2c3e3d9",
      "raw_snapshot_table": "market_listing_raw_snapshots",
      "raw_snapshot_id": "c7e2b74a-8481-c847-ef57-43be67119278",
      "provider_observation_table": "market_listing_observations",
      "provider_observation_id": "6e2ef38a-16b5-b3c1-987a-4c3bf33d5774",
      "provider_candidate_table": "market_listing_card_candidates",
      "provider_candidate_id": "00009020-8203-2c46-965d-65101c5d0a03",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "7e0ad953-5a9e-4984-a5be-c64601b95c65",
      "gv_id": "GV-PK-WCD-2013-ULTIMATE_TEAM_PLASMA-04-BOUNDARIES_CROSS-137-COMPUTER_SEARCH",
      "observed_at": "2026-06-26 00:30:41.703+00",
      "adapter_version": "market_listing_existing_warehouse",
      "normalizer_version": "market_listing_observations_existing_shape",
      "matcher_version": "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "listing_title": "Computer Search 137/149 Boundaries Crossed Holo Ace Spec Pokemon TCG Card LP",
        "match_status": "needs_review",
        "match_confidence": "0.58"
      },
      "source_payload": {
        "listing_status": "active",
        "listing_format": "fixed_price",
        "currency": "USD",
        "total_ask_price_present": true,
        "listing_evidence_class": "raw_single"
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  },
  {
    "lane": "active_listing",
    "observation": {
      "id": "1f678516-0156-4676-aefa-cfa2fd25dbc6",
      "contract_version": "MARKET_EVIDENCE_ENGINE_CORE_V1",
      "source": "ebay_active",
      "source_type": "active_listing",
      "provider_route": "ebay_browse_api",
      "source_record_id": "ebay_active:v1|366396767858|0",
      "source_url": "https://www.ebay.com/itm/366396767858?_skw=Pokemon+%22Victini%22+5&hash=item554ef2fe72:g:nZIAAeSwH5Fp~hJx",
      "acquisition_run_table": "market_listing_acquisition_runs",
      "acquisition_run_id": "28226719-47d6-7c35-7dab-4d57a2c3e3d9",
      "raw_snapshot_table": "market_listing_raw_snapshots",
      "raw_snapshot_id": "82001441-b758-be82-5bf8-5d39086b1d81",
      "provider_observation_table": "market_listing_observations",
      "provider_observation_id": "e5f78fb5-cea0-5b0b-a60a-66d461dd8844",
      "provider_candidate_table": "market_listing_card_candidates",
      "provider_candidate_id": "0001504e-101b-8d15-3872-d9e8768d2521",
      "provider_rollup_table": null,
      "provider_rollup_id": null,
      "card_print_id": "60efdde4-8b1e-4d21-b2d5-c8163d93691d",
      "gv_id": "GV-PK-MCD-2022-5",
      "observed_at": "2026-06-26 00:30:41.703+00",
      "adapter_version": "market_listing_existing_warehouse",
      "normalizer_version": "market_listing_observations_existing_shape",
      "matcher_version": "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1",
      "classifier_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "quality_gate_version": "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1",
      "rollup_version": null,
      "publication_gate_version": null,
      "identity_payload": {
        "listing_title": "Victini 5/15 McDonaldΓÇÖs 2022 Promo Holo Rare Pokemon Card",
        "match_status": "needs_review",
        "match_confidence": "0.58"
      },
      "source_payload": {
        "listing_status": "active",
        "listing_format": "fixed_price",
        "currency": "USD",
        "total_ask_price_present": true,
        "listing_evidence_class": "raw_single"
      }
    },
    "lifecycle_event_count": 7,
    "final_state": "rollup_eligible",
    "final_rollup_eligible": true
  }
]
```

## Findings

- none

## Next Step

If this projection shape is accepted, the next step is a tiny real backfill candidate plan, still capped and still internal-only.
