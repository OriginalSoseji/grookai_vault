# MEE TCGdex Reference Signal Rollup Refresh V1

- Package: `MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1`
- Mode: `dry_run_report_only`
- Ready: `false`
- Applied: `false`
- Rollup version: `MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1`
- Proposed rows: 9596
- Inserted rows: 0

## Input Counts

- Candidates: 332504
- Normalized evidence: 332489
- TCGdex candidates: 319219
- TCGdex normalized: 315811
- Signal candidates: 9596
- Currency-excluded evidence: 211227

## Rollup Summary

```json
{
  "row_count": 9596,
  "publishable_count": 0,
  "app_visible_count": 0,
  "market_truth_count": 0,
  "status_counts": {
    "blocked_special_lane_review": 268,
    "review_required_context": 277,
    "review_required_high_variance": 4459,
    "review_required_single_source": 4592
  },
  "variance_band_counts": {
    "bounded_variance": 2948,
    "extreme_variance": 2902,
    "high_variance": 1580,
    "moderate_variance": 2166
  },
  "flag_counts": {
    "extreme_variance": 2902,
    "high_variance": 1580,
    "moderate_variance": 2166,
    "non_usd_evidence_excluded": 9110,
    "quarantined_context_present": 9559,
    "single_source_only": 9232,
    "special_lane_review_required": 268,
    "thin_evidence": 74
  },
  "source_count_counts": {
    "1": 9232,
    "2": 302,
    "3": 62
  }
}
```

## Readback

```json
null
```

## Findings

- tcgdex_candidate_count_mismatch
- tcgdex_normalized_count_mismatch
