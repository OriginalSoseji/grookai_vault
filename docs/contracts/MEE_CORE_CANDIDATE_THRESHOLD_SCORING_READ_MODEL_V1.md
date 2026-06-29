# MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1

## Status

- Package fingerprint: `b44fa84d772fba911f0e0155944a4638dd1136661244f594de262e390a9df7b6`
- Status: `candidate_ready_no_remote_apply`
- Candidate rows scored: `270`

## Bucket Summary

| threshold_lane | bucket | rows |
| --- | --- | --- |
| high_signal_raw_single | blocked_quality_flags | 10 |
| raw_single | blocked_quality_flags | 224 |
| slab | blocked_quality_flags | 36 |

## Score Summary

| threshold_lane | score | rows |
| --- | --- | --- |
| high_signal_raw_single | 3 | 10 |
| raw_single | 1 | 24 |
| raw_single | 2 | 101 |
| raw_single | 3 | 99 |
| slab | 1 | 11 |
| slab | 2 | 19 |
| slab | 3 | 6 |

## Boundary

This read model candidate cannot confirm candidates, publish prices, or create market truth.

```json
{
  "auto_confirm_rows": 0,
  "score_public_flag_rows": 0,
  "source_public_flag_rows": 0
}
```
