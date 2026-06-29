# MEE-09F Market Reference Signal Rollup Backfill Package

- Package: `MARKET-REFERENCE-SIGNAL-ROLLUP-BACKFILL-V1`
- Ready for apply approval: `true`
- Rollup version: `MEE_09F_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_V1`
- Proposed rows: `993`
- Existing rows: `0`
- Row manifest hash: `1a0a57478fd6849da5a995fe31e30ae243d5a0ab7cf0e9d25cdc0fc997b02aae`
- Package fingerprint: `6f2582f8b83932608c3954c9bb9f24263ce4811a7ae7e1131cc42c89d4391d71`

## Boundary

- Dry-run report only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No public/app-visible pricing.

## Status Counts

| Status | Rows |
| --- | ---: |
| blocked_special_lane_review | 24 |
| review_required_context | 158 |
| review_required_high_variance | 241 |
| review_required_single_source | 570 |

## Flags

| Flag | Rows |
| --- | ---: |
| extreme_variance | 135 |
| high_variance | 122 |
| moderate_variance | 312 |
| non_usd_evidence_excluded | 197 |
| quarantined_context_present | 993 |
| single_source_only | 796 |
| special_lane_review_required | 24 |
| thin_evidence | 6 |

## Findings

- none

## Approval Prompt

```text
Approve real MARKET-REFERENCE-SIGNAL-ROLLUP-BACKFILL-APPLY-V1 apply only. Package fingerprint: 6f2582f8b83932608c3954c9bb9f24263ce4811a7ae7e1131cc42c89d4391d71. Row manifest hash: 1a0a57478fd6849da5a995fe31e30ae243d5a0ab7cf0e9d25cdc0fc997b02aae. Migration hash: eb2f1aa4a01977d455e131ec7f90b3d8250e2501f65cdc6199a9b2072dd82d41. Scope: insert 993 internal-only market_reference_signal_rollups rows with rollup_version MEE_09F_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_V1 into linked Supabase project ycdxbpibncqcchqiihfz only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
