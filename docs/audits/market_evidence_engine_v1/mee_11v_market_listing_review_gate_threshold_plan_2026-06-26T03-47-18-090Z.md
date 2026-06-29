# MEE Market Listing Review Gate Threshold Plan V1

- Package: `MARKET-LISTING-REVIEW-GATE-THRESHOLD-PLAN-V1`
- Fingerprint: `89a82df27e6450dee4aa9560f5ead60df7f7d8ca2444dec0fa246fe2f4c8bb91`
- Source cleanup baseline: `fc70b2d5a34a6f5378ec1a219eb0e0e1933342e0743f86bcf5cd078bf6d1575e`

## Thresholds

```json
{
  "raw_single": {
    "minimum_listing_count": 5,
    "minimum_seller_count": 2,
    "maximum_max_to_median_ratio": 50,
    "maximum_trimmed_band_ratio": 20
  },
  "slab": {
    "minimum_listing_count": 3,
    "minimum_seller_count": 2,
    "maximum_max_to_median_ratio": 100,
    "maximum_trimmed_band_ratio": 75
  }
}
```

## Summary

```json
{
  "total_rollups": 2275,
  "raw_single_rollups": 1207,
  "slab_rollups": 1068,
  "review_ready_internal_candidate_count": 1159,
  "review_ready_raw_single_count": 886,
  "review_ready_slab_count": 273,
  "review_required_count": 1116
}
```

## Buckets

```json
{
  "review_ready_internal_candidate": 1159,
  "review_required_outlier_spread": 220,
  "review_required_more_evidence": 257,
  "review_required_contamination": 639
}
```

## Samples

```json
{
  "review_ready_internal_candidates": [
    {
      "gv_id": "GV-PK-TK-tk-xy-latia-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 411,
      "seller_count": 110,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 20,
      "max_to_median_ratio": 10.05,
      "trimmed_band_ratio": 3.28,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-TK-tk-bw-e-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 399,
      "seller_count": 103,
      "median_active_ask": 2.1,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 65.31,
      "max_to_median_ratio": 31.1,
      "trimmed_band_ratio": 2.22,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-TK-tk-sm-l-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 394,
      "seller_count": 142,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 14.24,
      "max_to_median_ratio": 7.16,
      "trimmed_band_ratio": 1.93,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-TK-tk-xy-latio-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 365,
      "seller_count": 140,
      "median_active_ask": 2.01,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 22.32,
      "max_to_median_ratio": 11.1,
      "trimmed_band_ratio": 4.41,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DF-12",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 255,
      "seller_count": 103,
      "median_active_ask": 45.63,
      "minimum_active_ask": 0.88,
      "maximum_active_ask": 399.99,
      "max_to_median_ratio": 8.77,
      "trimmed_band_ratio": 4.84,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DF-2",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 248,
      "seller_count": 105,
      "median_active_ask": 39.99,
      "minimum_active_ask": 1.74,
      "maximum_active_ask": 250,
      "max_to_median_ratio": 6.25,
      "trimmed_band_ratio": 7.49,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-HP-108",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 239,
      "seller_count": 148,
      "median_active_ask": 6,
      "minimum_active_ask": 0.77,
      "maximum_active_ask": 144.85,
      "max_to_median_ratio": 24.14,
      "trimmed_band_ratio": 5.53,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-TK-tk-bw-z-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 238,
      "seller_count": 97,
      "median_active_ask": 2.47,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 65.76,
      "max_to_median_ratio": 26.62,
      "trimmed_band_ratio": 2.39,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-TK-tk-xy-n-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 223,
      "seller_count": 112,
      "median_active_ask": 2.49,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 65.76,
      "max_to_median_ratio": 26.41,
      "trimmed_band_ratio": 7.43,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PK-8",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 219,
      "seller_count": 100,
      "median_active_ask": 8.43,
      "minimum_active_ask": 1.5,
      "maximum_active_ask": 89,
      "max_to_median_ratio": 10.56,
      "trimmed_band_ratio": 12.13,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PK-108",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 218,
      "seller_count": 126,
      "median_active_ask": 4.99,
      "minimum_active_ask": 0.77,
      "maximum_active_ask": 84.23,
      "max_to_median_ratio": 16.88,
      "trimmed_band_ratio": 11.19,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-LM-3",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 210,
      "seller_count": 137,
      "median_active_ask": 13.1,
      "minimum_active_ask": 0.7,
      "maximum_active_ask": 59.07,
      "max_to_median_ratio": 4.51,
      "trimmed_band_ratio": 4,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-EM-7",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 208,
      "seller_count": 93,
      "median_active_ask": 13,
      "minimum_active_ask": 1.7,
      "maximum_active_ask": 104.49,
      "max_to_median_ratio": 8.04,
      "trimmed_band_ratio": 11.81,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-CG-3",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 204,
      "seller_count": 105,
      "median_active_ask": 9.56,
      "minimum_active_ask": 1,
      "maximum_active_ask": 103.52,
      "max_to_median_ratio": 10.83,
      "trimmed_band_ratio": 14.08,
      "flags": [],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DR-3",
      "evidence_class": "raw_single",
      "review_bucket": "review_ready_internal_candidate",
      "listing_count": 202,
      "seller_count": 101,
      "median_active_ask": 10,
      "minimum_active_ask": 1.3,
      "maximum_active_ask": 179.14,
      "max_to_median_ratio": 17.91,
      "trimmed_band_ratio": 6.5,
      "flags": [],
      "warning_flags": []
    }
  ],
  "review_required_more_evidence": [
    {
      "gv_id": "GV-PK-MEP-047",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 9,
      "seller_count": 1,
      "median_active_ask": 202.77,
      "minimum_active_ask": 105.33,
      "maximum_active_ask": 202.77,
      "max_to_median_ratio": 1,
      "trimmed_band_ratio": 1.11,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MEP-048",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 9,
      "seller_count": 1,
      "median_active_ask": 215.94,
      "minimum_active_ask": 105.33,
      "maximum_active_ask": 229.11,
      "max_to_median_ratio": 1.06,
      "trimmed_band_ratio": 1.25,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MEP-049",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 9,
      "seller_count": 1,
      "median_active_ask": 163.27,
      "minimum_active_ask": 97.43,
      "maximum_active_ask": 163.27,
      "max_to_median_ratio": 1,
      "trimmed_band_ratio": 1.09,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PR-BLW-BW43",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 9,
      "seller_count": 1,
      "median_active_ask": 79.95,
      "minimum_active_ask": 79.95,
      "maximum_active_ask": 199.95,
      "max_to_median_ratio": 2.5,
      "trimmed_band_ratio": 1.5,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MEP-053",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 7,
      "seller_count": 1,
      "median_active_ask": 163.27,
      "minimum_active_ask": 97.43,
      "maximum_active_ask": 163.27,
      "max_to_median_ratio": 1,
      "trimmed_band_ratio": 1.68,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-WCD-2011-MEGAZONE-01-TRIUMPHANT-96-MAGNEZONE",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 7,
      "seller_count": 1,
      "median_active_ask": 230.99,
      "minimum_active_ask": 35.99,
      "maximum_active_ask": 1905.99,
      "max_to_median_ratio": 8.25,
      "trimmed_band_ratio": 17.37,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MEP-050",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 6,
      "seller_count": 1,
      "median_active_ask": 163.27,
      "minimum_active_ask": 163.27,
      "maximum_active_ask": 163.27,
      "max_to_median_ratio": 1,
      "trimmed_band_ratio": 1,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PR-BLW-BW76",
      "evidence_class": "slab",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 5,
      "seller_count": 1,
      "median_active_ask": 200,
      "minimum_active_ask": 200,
      "maximum_active_ask": 250,
      "max_to_median_ratio": 1.25,
      "trimmed_band_ratio": 1.15,
      "flags": [
        "insufficient_seller_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-BASE1-10-FIRST-EDITION",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 4,
      "median_active_ask": 29.5,
      "minimum_active_ask": 25,
      "maximum_active_ask": 49.99,
      "max_to_median_ratio": 1.69,
      "trimmed_band_ratio": 1.71,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-EX3-98-CITY-CHAMPIONSHIPS-STAMP",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 3,
      "median_active_ask": 46.5,
      "minimum_active_ask": 35.1,
      "maximum_active_ask": 235,
      "max_to_median_ratio": 5.05,
      "trimmed_band_ratio": 4.7,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MA-90",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 3,
      "median_active_ask": 86.16,
      "minimum_active_ask": 49.7,
      "maximum_active_ask": 92.31,
      "max_to_median_ratio": 1.07,
      "trimmed_band_ratio": 1.57,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-MEP-065-STAFF-STAMP",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 2,
      "median_active_ask": 28.97,
      "minimum_active_ask": 22.49,
      "maximum_active_ask": 40.36,
      "max_to_median_ratio": 1.39,
      "trimmed_band_ratio": 1.51,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 2,
      "median_active_ask": 1937.01,
      "minimum_active_ask": 1192.59,
      "maximum_active_ask": 2499.95,
      "max_to_median_ratio": 1.29,
      "trimmed_band_ratio": 1.68,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PR-BLW-BW49",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 4,
      "median_active_ask": 26.96,
      "minimum_active_ask": 20,
      "maximum_active_ask": 29.98,
      "max_to_median_ratio": 1.11,
      "trimmed_band_ratio": 1.38,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PR-BLW-BW53",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_more_evidence",
      "listing_count": 4,
      "seller_count": 4,
      "median_active_ask": 16.7,
      "minimum_active_ask": 1.99,
      "maximum_active_ask": 450,
      "max_to_median_ratio": 26.95,
      "trimmed_band_ratio": 58.46,
      "flags": [
        "insufficient_listing_count"
      ],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    }
  ],
  "review_required_contamination": [
    {
      "gv_id": "GV-PK-LM-10",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 257,
      "seller_count": 145,
      "median_active_ask": 408.2,
      "minimum_active_ask": 24.99,
      "maximum_active_ask": 38999,
      "max_to_median_ratio": 95.54,
      "trimmed_band_ratio": 7.85,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-EM-9",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 243,
      "seller_count": 151,
      "median_active_ask": 650,
      "minimum_active_ask": 19.75,
      "maximum_active_ask": 85000,
      "max_to_median_ratio": 130.77,
      "trimmed_band_ratio": 48.29,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DR-10",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 230,
      "seller_count": 134,
      "median_active_ask": 247.08,
      "minimum_active_ask": 15,
      "maximum_active_ask": 24005.99,
      "max_to_median_ratio": 97.16,
      "trimmed_band_ratio": 66.75,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DS-17",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 223,
      "seller_count": 97,
      "median_active_ask": 600,
      "minimum_active_ask": 30.5,
      "maximum_active_ask": 120000,
      "max_to_median_ratio": 200,
      "trimmed_band_ratio": 54.82,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DF-10",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 220,
      "seller_count": 132,
      "median_active_ask": 298.85,
      "minimum_active_ask": 24.99,
      "maximum_active_ask": 25000,
      "max_to_median_ratio": 83.65,
      "trimmed_band_ratio": 32.96,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DS-9",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 218,
      "seller_count": 128,
      "median_active_ask": 342.05,
      "minimum_active_ask": 23.49,
      "maximum_active_ask": 17093.79,
      "max_to_median_ratio": 49.97,
      "trimmed_band_ratio": 77.74,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-PK-6",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 218,
      "seller_count": 118,
      "median_active_ask": 556,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 35009.99,
      "max_to_median_ratio": 62.97,
      "trimmed_band_ratio": 34.16,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-CG-4",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 209,
      "seller_count": 112,
      "median_active_ask": 799,
      "minimum_active_ask": 23.99,
      "maximum_active_ask": 369420,
      "max_to_median_ratio": 462.35,
      "trimmed_band_ratio": 16.79,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DS-7",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 199,
      "seller_count": 102,
      "median_active_ask": 173.73,
      "minimum_active_ask": 15,
      "maximum_active_ask": 7450,
      "max_to_median_ratio": 42.88,
      "trimmed_band_ratio": 78.99,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-HP-10",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 199,
      "seller_count": 127,
      "median_active_ask": 351.95,
      "minimum_active_ask": 17.09,
      "maximum_active_ask": 14999.99,
      "max_to_median_ratio": 42.62,
      "trimmed_band_ratio": 34.7,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-LM-9",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 193,
      "seller_count": 130,
      "median_active_ask": 185.98,
      "minimum_active_ask": 15.99,
      "maximum_active_ask": 4009.99,
      "max_to_median_ratio": 21.56,
      "trimmed_band_ratio": 21.79,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-WCD-2009-STALLGON-12-MAJESTIC_DAWN-9-MEWTWO",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 190,
      "seller_count": 126,
      "median_active_ask": 305.99,
      "minimum_active_ask": 20.19,
      "maximum_active_ask": 6505.99,
      "max_to_median_ratio": 21.26,
      "trimmed_band_ratio": 22.23,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-LM-8",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 188,
      "seller_count": 124,
      "median_active_ask": 92.97,
      "minimum_active_ask": 12.98,
      "maximum_active_ask": 8003.98,
      "max_to_median_ratio": 86.09,
      "trimmed_band_ratio": 25.27,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-PK-9",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 184,
      "seller_count": 115,
      "median_active_ask": 125.5,
      "minimum_active_ask": 14.95,
      "maximum_active_ask": 2004.99,
      "max_to_median_ratio": 15.98,
      "trimmed_band_ratio": 19.56,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    },
    {
      "gv_id": "GV-PK-DF-8",
      "evidence_class": "slab",
      "review_bucket": "review_required_contamination",
      "listing_count": 182,
      "seller_count": 123,
      "median_active_ask": 191.49,
      "minimum_active_ask": 17.56,
      "maximum_active_ask": 5005.99,
      "max_to_median_ratio": 26.14,
      "trimmed_band_ratio": 18.94,
      "flags": [
        "candidate_exclusion_flags_present"
      ],
      "warning_flags": []
    }
  ],
  "review_required_outlier_spread": [
    {
      "gv_id": "GV-PK-TK-tk-xy-sy-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 380,
      "seller_count": 130,
      "median_active_ask": 2.49,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 225,
      "max_to_median_ratio": 90.36,
      "trimmed_band_ratio": 11.51,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-TK-tk-xy-p-30",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 377,
      "seller_count": 121,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 726.43,
      "max_to_median_ratio": 365.04,
      "trimmed_band_ratio": 10.33,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DS-2",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 243,
      "seller_count": 125,
      "median_active_ask": 15,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 157.88,
      "max_to_median_ratio": 10.53,
      "trimmed_band_ratio": 32.58,
      "flags": [],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DS-18",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 221,
      "seller_count": 145,
      "median_active_ask": 3.49,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 585,
      "max_to_median_ratio": 167.62,
      "trimmed_band_ratio": 67.29,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio",
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-LM-6",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 220,
      "seller_count": 104,
      "median_active_ask": 12.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 9999,
      "max_to_median_ratio": 769.75,
      "trimmed_band_ratio": 8.2,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-HP-15",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 207,
      "seller_count": 137,
      "median_active_ask": 25.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 306.36,
      "max_to_median_ratio": 11.79,
      "trimmed_band_ratio": 38.86,
      "flags": [],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-EM-102",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 206,
      "seller_count": 148,
      "median_active_ask": 2.17,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 255.99,
      "max_to_median_ratio": 117.97,
      "trimmed_band_ratio": 13.23,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DS-114",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 202,
      "seller_count": 144,
      "median_active_ask": 2.99,
      "minimum_active_ask": 1.49,
      "maximum_active_ask": 150,
      "max_to_median_ratio": 50.17,
      "trimmed_band_ratio": 18.98,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-EX2-1-PRERELEASE-STAMP",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 201,
      "seller_count": 107,
      "median_active_ask": 18,
      "minimum_active_ask": 1.35,
      "maximum_active_ask": 1967.12,
      "max_to_median_ratio": 109.28,
      "trimmed_band_ratio": 7.43,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-PR-BLW-BW65",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 196,
      "seller_count": 133,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 119.99,
      "max_to_median_ratio": 60.3,
      "trimmed_band_ratio": 1.84,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-PK-12",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 195,
      "seller_count": 127,
      "median_active_ask": 9.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 299.99,
      "max_to_median_ratio": 30.03,
      "trimmed_band_ratio": 29.59,
      "flags": [],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-DF-9",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 194,
      "seller_count": 151,
      "median_active_ask": 19.97,
      "minimum_active_ask": 1.48,
      "maximum_active_ask": 154.5,
      "max_to_median_ratio": 7.74,
      "trimmed_band_ratio": 26.38,
      "flags": [],
      "warning_flags": [
        "wide_trimmed_band_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-PR-NP-35",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 189,
      "seller_count": 140,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 199,
      "max_to_median_ratio": 100,
      "trimmed_band_ratio": 6.75,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-MCD-2021-5",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 188,
      "seller_count": 122,
      "median_active_ask": 1.99,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 240,
      "max_to_median_ratio": 120.6,
      "trimmed_band_ratio": 1.67,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    },
    {
      "gv_id": "GV-PK-MCD-2022-15",
      "evidence_class": "raw_single",
      "review_bucket": "review_required_outlier_spread",
      "listing_count": 185,
      "seller_count": 155,
      "median_active_ask": 2.68,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 785,
      "max_to_median_ratio": 292.91,
      "trimmed_band_ratio": 4.79,
      "flags": [],
      "warning_flags": [
        "extreme_max_to_median_ratio"
      ]
    }
  ]
}
```

## Findings

- none

## Recommended Next Step

Review the threshold buckets and sample rows. If the split looks reasonable, the next step is a local-only review queue export for human inspection, not public pricing.
