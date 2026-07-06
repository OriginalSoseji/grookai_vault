# MEE-REFERENCE-ANCHORED-PRICING-COMPAT-VIEW-V1 Remote Schema Apply

## Status

Applied to linked Supabase project `ycdxbpibncqcchqiihfz`.

## Why

The reference/evidence-anchored pricing bridge was already DB-wide, but the legacy compatibility view `public.v_card_pricing_ui_v1` still exposed only 11 rows. Some app and vault surfaces still read that compatibility view, so those surfaces could not see the 14,572 Grookai Value rows available through `public.v_market_evidence_public_pricing_bridge_reference_anchored_v1`.

## Applied Change

Redefined `public.v_card_pricing_ui_v1` to read from `public.v_market_evidence_public_pricing_bridge_reference_anchored_v1`.

Compatibility behavior:

- `primary_price` now maps to `grookai_value_mid`.
- `primary_source` is `grookai_value`.
- `pricing_basis` is `evidence_anchored_grookai_value`.
- `ebay_median_price` remains available as active ask context.
- eBay active ask is not used as Grookai Value.
- blocked rows remain excluded.
- market truth, sold comp, publishable, and app-visible flags remain closed.

## Remote Readback

```json
{
  "package_id": "MEE-REFERENCE-ANCHORED-PRICING-COMPAT-VIEW-V1",
  "compat_rows": 14572,
  "compat_value_rows": 14572,
  "bridge_value_rows": 14572,
  "boundary": {
    "ebay_primary_source_rows": 0,
    "active_listing_market_estimate_rows": 0,
    "market_truth_rows": 0,
    "sold_comp_rows": 0,
    "null_primary_price_rows": 0
  },
  "mightyena_regression_row": {
    "gv_id": "GV-PK-HP-101",
    "primary_price": 52.9,
    "primary_source": "grookai_value",
    "pricing_basis": "evidence_anchored_grookai_value",
    "grookai_value": 52.9,
    "ebay_median_price": 79,
    "grookai_value_mid": 52.9,
    "active_ask_mid": 79,
    "market_pressure_status": "active_listings_above_reference",
    "market_pressure_pct": 58
  }
}
```

## Verification

- `node --test tests/contracts/mee_reference_anchored_pricing_compat_view_v1.test.mjs`
- `node --test tests/contracts/mee_reference_anchored_pricing_compat_view_v1.test.mjs tests/contracts/mee_public_price_bridge_v1.test.mjs tests/contracts/mee_public_pricing_bridge_reference_anchored_v1.test.mjs`
- rollback-only remote SQL proof returned `compat_rows = 14572`
- remote readback returned `compat_rows = 14572`
- migration history marked `20260629120000` as applied

## Boundaries

No table writes. No pricing observations writes. No `ebay_active_prices_latest` writes. No provider calls. No source fetches. No identity writes. No vault writes. No image writes. No deletes. No merges.
