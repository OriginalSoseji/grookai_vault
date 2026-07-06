# Market Listing Nightly Ingest Readback V1

- Package: `MARKET-LISTING-NIGHTLY-INGEST-READBACK-V1`
- Fingerprint: `251870a988c8db6637dbe21aa5e50da6e6e37f074518a1671a93d11a110448c9`
- Contract hash: `2b87af4aa106d5ee621c2c212a9c6508e70ef9a41186b6a8b82b9b58644813d0`
- Run key: `MEE_EBAY_GVID_HARDENED_2026_06_28`

## Morning Summary

- Acquisition runs: 0
- Consumed calls: 0
- Provider errors: 0
- Listing observations: 0
- Price events: 0
- Raw singles: 0
- Slabs: 0
- Excluded/ambiguous: 0
- Candidate rows: 183635
- Strict-filtered rollups: 1662
- Strict-filtered review-ready: 1393
- Strict-filtered needs more evidence: 269

## Warehouse Counts

```json
{
  "market_listing_query_cache": 0,
  "market_listing_observations": 0,
  "market_listing_price_events": 0,
  "market_listing_raw_snapshots": 0,
  "market_listing_rollups_total": 10701,
  "market_listing_acquisition_runs": 0,
  "market_listing_seller_snapshots": 0,
  "market_listing_card_candidates_total": 183635
}
```

## Strict Filtered Rollups

```json
{
  "slab": 668,
  "total": 1662,
  "by_version": {
    "MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28": 668,
    "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28": 994
  },
  "raw_single": 994,
  "with_gv_id": 1662,
  "review_ready": 1393,
  "app_visible_true": 0,
  "publishable_true": 0,
  "top_review_ready": [
    {
      "gv_id": "GV-PK-PK-8",
      "seller_count": 82,
      "listing_count": 382,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 8.54,
      "maximum_active_ask": 85,
      "minimum_active_ask": 1.5
    },
    {
      "gv_id": "GV-PK-LM-6",
      "seller_count": 93,
      "listing_count": 365,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 12.99,
      "maximum_active_ask": 9999,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-MEP-069",
      "seller_count": 156,
      "listing_count": 349,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 1.99,
      "maximum_active_ask": 29.61,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-EM-7",
      "seller_count": 84,
      "listing_count": 347,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 14.89,
      "maximum_active_ask": 104.73,
      "minimum_active_ask": 2
    },
    {
      "gv_id": "GV-PK-MEP-018",
      "seller_count": 121,
      "listing_count": 346,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 1.99,
      "maximum_active_ask": 14.99,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-TK-tk-ex-latia-7",
      "seller_count": 84,
      "listing_count": 336,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.49,
      "maximum_active_ask": 65.17,
      "minimum_active_ask": 1.19
    },
    {
      "gv_id": "GV-PK-MEP-021",
      "seller_count": 121,
      "listing_count": 331,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2,
      "maximum_active_ask": 89.97,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-DR-3",
      "seller_count": 80,
      "listing_count": 321,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 10,
      "maximum_active_ask": 179.63,
      "minimum_active_ask": 2.1
    },
    {
      "gv_id": "GV-PK-MEP-020",
      "seller_count": 117,
      "listing_count": 317,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.28,
      "maximum_active_ask": 29.61,
      "minimum_active_ask": 1
    },
    {
      "gv_id": "GV-PK-MEP-034",
      "seller_count": 124,
      "listing_count": 312,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.74,
      "maximum_active_ask": 37.2,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-MEP-068",
      "seller_count": 135,
      "listing_count": 309,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 1.99,
      "maximum_active_ask": 60,
      "minimum_active_ask": 0.7
    },
    {
      "gv_id": "GV-PK-TK-tk-ex-latia-6",
      "seller_count": 76,
      "listing_count": 304,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.11,
      "maximum_active_ask": 64.77,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-MEP-019",
      "seller_count": 140,
      "listing_count": 303,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 1.99,
      "maximum_active_ask": 10,
      "minimum_active_ask": 1
    },
    {
      "gv_id": "GV-PK-MEP-025",
      "seller_count": 129,
      "listing_count": 297,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.29,
      "maximum_active_ask": 25,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-CG-3",
      "seller_count": 76,
      "listing_count": 287,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 10.95,
      "maximum_active_ask": 103.52,
      "minimum_active_ask": 2.46
    },
    {
      "gv_id": "GV-PK-MEP-036",
      "seller_count": 117,
      "listing_count": 285,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.99,
      "maximum_active_ask": 10.98,
      "minimum_active_ask": 1.15
    },
    {
      "gv_id": "GV-PK-MEP-035",
      "seller_count": 116,
      "listing_count": 282,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.49,
      "maximum_active_ask": 37.94,
      "minimum_active_ask": 1.49
    },
    {
      "gv_id": "GV-PK-DR-9",
      "seller_count": 74,
      "listing_count": 278,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 18.99,
      "maximum_active_ask": 89.77,
      "minimum_active_ask": 6.57
    },
    {
      "gv_id": "GV-PK-MEP-013",
      "seller_count": 126,
      "listing_count": 271,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.75,
      "maximum_active_ask": 27.34,
      "minimum_active_ask": 1.49
    },
    {
      "gv_id": "GV-PK-MEP-011",
      "seller_count": 126,
      "listing_count": 266,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.49,
      "maximum_active_ask": 295,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-TK-tk-ex-latia-5",
      "seller_count": 63,
      "listing_count": 261,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.5,
      "maximum_active_ask": 64.6,
      "minimum_active_ask": 1
    },
    {
      "gv_id": "GV-PK-TK-tk-dp-m-3",
      "seller_count": 50,
      "listing_count": 260,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2,
      "maximum_active_ask": 17.46,
      "minimum_active_ask": 0.7
    },
    {
      "gv_id": "GV-PK-TK-tk-ex-latio-7",
      "seller_count": 70,
      "listing_count": 260,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 2.13,
      "maximum_active_ask": 63.75,
      "minimum_active_ask": 0.99
    },
    {
      "gv_id": "GV-PK-EX2-1-PRERELEASE-STAMP",
      "seller_count": 63,
      "listing_count": 255,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 16.27,
      "maximum_active_ask": 285,
      "minimum_active_ask": 6.49
    },
    {
      "gv_id": "GV-PK-CG-11",
      "seller_count": 63,
      "listing_count": 251,
      "rollup_version": "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28",
      "median_active_ask": 9.99,
      "maximum_active_ask": 50.09,
      "minimum_active_ask": 0.99
    }
  ],
  "market_truth_true": 0,
  "needs_review_false": 0,
  "needs_more_evidence": 269,
  "strict_title_filtered_true": 1662
}
```

## Public Surface

```json
{
  "pricing_observations": {
    "total": 0,
    "distinct_card_print_ids": 0
  },
  "v_card_pricing_ui_v1": {
    "exists": true,
    "definition_md5": "6621f9428731334061ae9f8c560e7d77",
    "references_justtcg": false,
    "references_market_listing": false,
    "references_market_reference": false
  },
  "ebay_active_prices_latest": {
    "total": 1690,
    "distinct_card_print_ids": 1690
  }
}
```

## Boundary Proof

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "db_writes": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_view_writes": false,
  "strict_rollups_publishable": 0,
  "strict_rollups_app_visible": 0,
  "strict_rollups_market_truth": 0,
  "candidates_direct_publish": 0,
  "public_view_references_market_listing": false,
  "public_view_references_market_reference": false,
  "public_view_references_justtcg": false
}
```

## Findings

- none

## Recommended Next Step

Nightly readback boundary is clean. Build the one-approval nightly run wrapper next.
