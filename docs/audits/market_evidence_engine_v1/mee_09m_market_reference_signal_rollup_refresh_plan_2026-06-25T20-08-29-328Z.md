# MEE-09M Market Reference Signal Rollup Refresh Plan

- Package: `MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-PLAN-V1`
- Ready: `true`
- Rollup version: `MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1`
- Proposed rows: `993`
- Existing rows for version: `0`
- Row manifest hash: `1f29724993b556969857df8752d4598867f10fd10250e8d24ba8e1b5b1952d8d`
- Package fingerprint: `cd7b04fba4e2f7d672267a15b20be4846223051b03c0377cfa7ba0425408672f`

## Status Counts

| Status | Rows |
| --- | ---: |
| blocked_special_lane_review | 24 |
| review_required_context | 702 |
| review_required_high_variance | 249 |
| review_required_single_source | 18 |

## Source Counts

| Source Count | Rows |
| --- | ---: |
| 1 | 244 |
| 2 | 749 |

## Findings

- none

## Approval Prompt

```text
Approve real MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-APPLY-V1 apply only. Package fingerprint: cd7b04fba4e2f7d672267a15b20be4846223051b03c0377cfa7ba0425408672f. Row manifest hash: 1f29724993b556969857df8752d4598867f10fd10250e8d24ba8e1b5b1952d8d. Migration hash: eb2f1aa4a01977d455e131ec7f90b3d8250e2501f65cdc6199a9b2072dd82d41. Scope: insert 993 internal-only market_reference_signal_rollups rows with rollup_version MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1 into linked Supabase project ycdxbpibncqcchqiihfz only. Preserve existing rollup versions. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
