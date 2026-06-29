# MEE TCGdex Reference Signal Rollup Refresh Apply

Package: `MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1`

Rollup version: `MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1`

## Result

The optimized SQL apply inserted `14,572` internal-only reference signal rollup rows into `public.market_reference_signal_rollups`.

## Readback

Guard summary:

| Check | Rows |
| --- | ---: |
| Total rows | 14,572 |
| `needs_review=false` rows | 0 |
| `publishable=true` leaks | 0 |
| `app_visible=true` leaks | 0 |
| `market_truth=true` leaks | 0 |
| Non-USD rows | 0 |

Review status distribution:

| Review status | Rows |
| --- | ---: |
| `blocked_special_lane_review` | 402 |
| `review_required_context` | 587 |
| `review_required_high_variance` | 6,862 |
| `review_required_single_source` | 6,721 |

## Boundary

This apply stayed internal-only.

- No public pricing views were written.
- No app-visible pricing was written.
- No `pricing_observations` rows were written.
- No `ebay_active_prices_latest` rows were written.
- No identity, card, vault, image, or storage tables were written.
- No deletes, upserts, merges, or global apply were used.

## Verification

Focused contracts passed:

```text
node --test tests/contracts/market_reference_tcgdex_signal_rollup_refresh_v1.test.mjs tests/contracts/market_reference_tcgdex_pricing_backfill_apply_v1.test.mjs tests/contracts/market_reference_tcgdex_pricing_source_constraints_v1.test.mjs
```

Result: `6` passing tests, `0` failures.
