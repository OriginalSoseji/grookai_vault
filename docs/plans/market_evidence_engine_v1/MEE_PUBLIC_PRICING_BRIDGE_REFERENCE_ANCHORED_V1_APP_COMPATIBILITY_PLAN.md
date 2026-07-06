# MEE Public Pricing Bridge Reference Anchored V1 App Compatibility Plan

Status: plan only

No app-visible DB change has been applied.

## Current App Contract

The current app reads `v_card_pricing_ui_v1` through:

- `apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/app/api/card-pricing/route.ts`
- `apps/web/src/components/pricing/CardPagePricingRail.tsx`

The current type collapses the pricing model into:

- `primary_price`
- `primary_source`
- `grookai_value`
- `min_price`
- `max_price`
- `ebay_median_price`
- `ebay_listing_count`

That shape allowed active eBay ask median to become both primary price and Grookai Value.

## Target App Contract

The app needs two separate sections.

### Grookai Value

Fields:

- `grookai_value_low`
- `grookai_value_mid`
- `grookai_value_high`
- `grookai_value_basis`
- `grookai_value_block_reason`
- `grookai_value_condition_label`
- `reference_anchor_low`
- `reference_anchor_mid`
- `reference_anchor_high`
- `reference_source_count`
- `confidence_label`

Display:

- Show Grookai Value only when `grookai_value_mid` is present.
- If blocked, show the block reason in collector language.
- Do not default condition to NM.
- If condition is unknown, label the value as an unconditioned reference range or condition-required state.

### Available Today

Fields:

- `active_ask_low`
- `active_ask_mid`
- `active_ask_high`
- `active_ask_minimum`
- `active_ask_maximum`
- `active_ask_listing_count`
- `active_ask_seller_count`
- `active_ask_condition_label`
- `active_ask_signal_at`
- `market_pressure_pct`
- `market_pressure_status`
- `freshness_label`

Display:

- Show Available Today when `active_ask_mid` is present.
- Label it active ask / buy-now pressure, not Grookai Value.
- Show whether active listings are above, below, or aligned with the evidence anchor.

## Compatibility Strategy

Phase 1: Add a new app type for the reference-anchored bridge. Keep existing `CardPricingUiRecord` untouched until the DB view is approved.

Phase 2: Update `/api/card-pricing` to return both old and new payload shapes behind a feature flag or explicit version field.

Phase 3: Update `CardPagePricingRail` to render:

1. Grookai Value
2. Available Today
3. Market status and confidence

Phase 4: Retire the active-listing-only `primary_price` behavior after production readback proves the reference-anchored bridge is stable.

## Compatibility Guard

If a bridge row has:

- `grookai_value_mid is null`
- `active_ask_mid is not null`
- `grookai_value_block_reason = blocked_no_valuation_anchor`

then the app must show only Available Today and must not show a primary Grookai Value.

## Mightyena Regression

For `GV-PK-HP-101`, the app must render:

- Grookai Value from reference anchor / controlled market-pressure adjustment.
- Available Today around the eBay active ask lane.
- Market pressure as active listings above reference.

It must not render `$79` as Grookai Value.

