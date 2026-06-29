# MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1

## Result

- Package fingerprint: `745d9e4ef336e2968de6aa6ada651fdd6ce2a30e1b032af289f3702de1163f55`
- SQL hash: `6b61d9777ccd9016a56b7e5bedf1452eff87e31d0d8131b446c1fd634bfe24d8`
- Findings: `0`

## Summary

- Remaining safe internal action rows: `0`
- Reviewer candidate rows: `0`
- Reference policy hold rows: `0`
- Unknown evidence rows: `0`
- Split required rows: `550`
- Classification blocked rows: `19`
- Monitor resolved rows: `380`

## Public Boundary

```json
{
  "app_visible_rows": 0,
  "can_publish_price_directly_rows": 0,
  "market_truth_rows": 0,
  "publication_gate_candidate_rows": 0,
  "publishable_rows": 0
}
```

## Current Status

| review_lane | evidence_lane | status | disposition | needs_review | rows |
| --- | --- | --- | --- | --- | --- |
| candidate_review | mixed_raw_slab | blocked | review_split_required | false | 544 |
| candidate_review | raw_single | blocked | review_blocked | false | 179 |
| candidate_review | raw_single | resolved | review_defer_more_evidence | false | 45 |
| candidate_review | reference_metric | resolved | review_defer_more_evidence | false | 714 |
| candidate_review | slab | blocked | review_blocked | false | 34 |
| candidate_review | slab | resolved | review_defer_more_evidence | false | 2 |
| candidate_review | unknown | blocked | review_blocked | false | 18 |
| classification_review | classification_blocked | blocked | review_reclassify | false | 19 |
| high_signal_review | mixed_raw_slab | blocked | review_split_required | false | 6 |
| high_signal_review | raw_single | blocked | review_blocked | false | 8 |
| high_signal_review | raw_single | resolved | review_defer_more_evidence | false | 2 |
| high_signal_review | reference_metric | resolved | review_defer_more_evidence | false | 197 |
| low_signal_monitor | low_signal | resolved | monitor_only | false | 156 |
| low_signal_monitor | mixed_raw_slab | resolved | monitor_only | false | 24 |
| low_signal_monitor | raw_single | resolved | monitor_only | false | 144 |
| low_signal_monitor | slab | resolved | monitor_only | false | 56 |
| reference_only_review | reference_metric | resolved | review_defer_active_market_evidence | false | 4 |

## Next Recommendation

No safe internal review batch remains. Next work is policy/manual review handling for candidate, reference, and unknown evidence lanes.
