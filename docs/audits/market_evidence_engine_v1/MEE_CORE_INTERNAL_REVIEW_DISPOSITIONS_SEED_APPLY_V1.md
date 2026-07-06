# MEE Core Internal Review Dispositions Seed Apply V1

Status: applied to linked Supabase project `ycdxbpibncqcchqiihfz`

## Approval

`MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-APPLY-V1`

## Package

- Package fingerprint: `cd2a778a0aa248f6bb33840fc35c05af3a8ce920c1bd152d460c2cd5a6cfdd2f`
- Row manifest hash: `5bd62cf2b87ed82fdb7bb5c288a62bd5a17aabcb8eab87147b13cb4ff591f406`
- SQL hash: `d474eec66b6f39c8fbfe10160f4eec09af2576076af445a85016cc875a05d7c8`

## Command

```bash
supabase db query --linked -f docs/sql/mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql
```

## Apply Result

The apply returned the expected boundary row:

```json
{
  "package_id": "MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1",
  "planned_insert_rows": 2152,
  "public_price_publication": false,
  "app_visible_pricing": false,
  "public_price_rollup": false,
  "market_truth": false
}
```

## Readback

- Total disposition rows: `2,152`
- Seed-plan rows: `2,152`
- Duplicate active keys: `0`
- Publication-gate candidate rows: `0`
- Direct-publish rows: `0`
- Publishable rows: `0`
- App-visible rows: `0`
- Market-truth rows: `0`
- `pricing_observations` rows: `0`
- `v_card_pricing_ui_v1` references to `market_evidence_review_dispositions`: `0`
- `anon` / `authenticated` grants: none

## Lane Counts

| Review lane | Disposition | Rows |
| --- | --- | ---: |
| `candidate_review` | `review_pending_candidate` | 1,536 |
| `low_signal_monitor` | `monitor_only` | 380 |
| `high_signal_review` | `review_pending_high_signal` | 213 |
| `classification_review` | `review_pending_classification_fix` | 19 |
| `reference_only_review` | `review_pending_reference_only` | 4 |

## Evidence Lanes

| Evidence lane | Rows |
| --- | ---: |
| `reference_metric` | 915 |
| `mixed_raw_slab` | 574 |
| `raw_single` | 378 |
| `low_signal` | 156 |
| `slab` | 92 |
| `classification_blocked` | 19 |
| `unknown` | 18 |

## Boundaries

- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes.
- No upserts.
- No merges.
- No migrations.
- No global apply.

## Findings

- Apply succeeded.
- Readback passed.
- Review disposition queue is seeded and remains internal-only.
