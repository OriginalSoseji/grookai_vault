# MEE-CORE-QUALITY-SCORING-READ-MODEL-V1

## Status

- Package fingerprint: `bc3e40eacd56fdde6f8068462df4ddb05ce8e2da72afcf78222442b25fd53296`
- Status: `clear_no_pending_candidate_evidence`
- Candidate evidence rows: `0`
- Quality rollup eligible rows: `0`

## Gate Summary

```json
{
  "candidate_evidence_rows": 0,
  "hard_exclusion_rows": 0,
  "lane_mismatch_rows": 0,
  "low_match_confidence_rows": 0,
  "manual_policy_rows": 0,
  "quality_rollup_eligible_rows": 0,
  "review_required_without_exclusion_rows": 0
}
```

## Lane Summary

| lane | rows | low confidence | lane mismatch | hard exclusions | manual policy | quality eligible |
| --- | --- | --- | --- | --- | --- | --- |

## Quality Actions

| lane | action | rows |
| --- | --- | --- |

## Decision

This package turns the quality taxonomy into a deterministic internal read-model candidate. Current remaining evidence is not quality-rollup eligible because every candidate evidence row is below the current match-confidence floor.

The model separates hard exclusions, raw/slab lane mismatch, manual-policy flags, and low confidence so later automation can fix the right problem instead of treating all review rows the same.
