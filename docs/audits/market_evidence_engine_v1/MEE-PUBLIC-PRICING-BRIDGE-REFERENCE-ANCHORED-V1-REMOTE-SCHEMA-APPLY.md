# MEE Public Pricing Bridge Reference Anchored V1 Remote Schema Apply

Status: side-by-side view applied

## Scope Executed

Executed:

```text
supabase db query --linked -f docs/sql/mee_public_pricing_bridge_reference_anchored_v1_view_candidate.sql
supabase db query --linked -f docs/sql/mee_public_pricing_bridge_reference_anchored_v1_readback.sql
```

No app-facing compatibility view was replaced.

`public.v_card_pricing_ui_v1` remains unchanged.

## SQL Hashes

- View candidate: `EC28C513CF02136DF2144252DF055FD015D9A7246DC64194F2E1F7D61D8B71A4`
- Readback: `0C5CA90D83F53829E027E534BB144FB74A9A90D91C8C994BEEFAD2BCE8F6E6E1`

## Readback Summary

- Bridge rows: `15,253`
- Grookai Value rows: `14,572`
- Active Ask rows: `1,214`
- Blocked value rows: `681`

Boundary proof:

- `market_truth_rows`: `0`
- `sold_comp_rows`: `0`
- `app_visible_rows`: `0`
- `publishable_rows`: `0`
- `active_only_grookai_value_leak_rows`: `0`
- `disagreement_active_ask_overwrite_rows`: `0`

Write boundary:

- `writes_pricing_observations`: `false`
- `writes_ebay_active_prices_latest`: `false`
- `uses_justtcg_public_pricing`: `false`

## Mightyena Regression

`GV-PK-HP-101` now appears in the side-by-side bridge as:

- Reference anchor low: `$48.70`
- Reference anchor mid: `$50.00`
- Reference anchor high: `$55.46`
- Grookai Value mid: `$52.90`
- Active ask low: `$40.00`
- Active ask mid: `$79.00`
- Active ask high: `$178.05`
- Market pressure: `58%`
- Market pressure status: `active_listings_above_reference`
- Grookai Value basis: `reference_anchor_with_bounded_active_pressure`
- Confidence: `medium`
- Condition policy: `condition_unknown_reference_range`
- Active ask condition label: `raw_single_active_ask`

This fixes the modeled behavior in the new side-by-side view: `$79` is no longer the Grookai Value in the reference-anchored bridge. It remains visible only as active ask pressure.

## Current Production Compatibility View

The existing production compatibility view still returns the old active-listing-only behavior until we explicitly replace it:

- `v_card_pricing_ui_v1.primary_price = 79`
- `v_card_pricing_ui_v1.grookai_value = 79`
- `v_market_evidence_public_price_bridge_v1.primary_price = 79`

This was intentionally not changed in this step.

## Verification

Focused contract test:

```text
node --test tests/contracts/mee_public_pricing_bridge_reference_anchored_v1.test.mjs
```

Result: `10/10` passing.

## Next Step

Update the app/API compatibility layer to read the new side-by-side bridge shape and render:

1. Grookai Value
2. Available Today / Active Ask
3. Market pressure status
4. Block reasons when Grookai Value is unavailable

That app change should still avoid replacing `v_card_pricing_ui_v1` until the UI is ready.

