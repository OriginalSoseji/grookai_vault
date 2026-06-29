# MEE-CORE-QUALITY-FLAG-TAXONOMY-V1

## Status

- Package fingerprint: `9df93c01b147687a1dce409a779da9d3883ba37a70840dc4fb3b30014d8c342c`
- Status: `ready_for_quality_scoring_model`
- Candidate evidence rows: `25989`

## Lane Summary

| lane | rows | low confidence | lane mismatch | exclusion flagged | median confidence |
| --- | --- | --- | --- | --- | --- |
| raw_single | 23677 | 23677 | 1499 | 298 | 0.58 |
| slab | 2312 | 2312 | 553 | 611 | 0.5499999999999999 |

## Taxonomy

| quality flag | gate | rows | resolution |
| --- | --- | --- | --- |
| low_match_confidence | hard_until_identity_confidence_v2 | 25989 | raise deterministic match confidence or keep manual review |
| lane_mismatch_raw_vs_slab | hard_until_lane_reclassification | 2052 | move candidate evidence into raw/slab lane matching listing_evidence_class before scoring |
| explicit_exclusion_flag | hard_or_manual_by_flag | 909 | exclude hard flags such as lot/sealed/menu/accessory; manual-policy foreign-language handling |
| review_required_without_exclusion | manual_or_threshold | 25080 | requires identity confidence, source independence, freshness, and outlier gates |

## Exclusion Flags

Hard exclusion flags:

- `lot`
- `sealed`
- `choose_your_card`
- `jumbo`
- `menu_listing`
- `sleeve_accessory`

Manual-policy flags:

- `foreign_language`

## Decision

Quality flags are not one thing. They mean at least four different gates:

1. Low deterministic match confidence.
2. Raw/slab lane mismatch.
3. Explicit listing exclusion flags.
4. Review-required rows that need source, freshness, identity, and outlier gates.

No candidate confirmation can be automated until these gates are separately scored.
