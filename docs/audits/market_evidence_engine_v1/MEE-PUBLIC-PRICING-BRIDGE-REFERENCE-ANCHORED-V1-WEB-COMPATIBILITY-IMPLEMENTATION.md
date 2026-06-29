# MEE Public Pricing Bridge Reference Anchored V1 Web Compatibility Implementation

Status: implemented locally

## Scope

Updated the web pricing read path and card pricing rail to consume:

```text
public.v_market_evidence_public_pricing_bridge_reference_anchored_v1
```

No DB changes were made in this step.

## Files Updated

- `apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/components/pricing/CardPagePricingRail.tsx`
- `apps/web/src/components/common/PricingDisclosure.tsx`
- `tests/contracts/mee_public_price_bridge_v1.test.mjs`
- `tests/contracts/market_evidence_engine_pricing_labels_v1.test.mjs`

## Behavior

Card detail pricing now renders two lanes:

1. Grookai Value
2. Available Today

The single-price compatibility fields now map to `grookai_value_mid`, not active eBay ask. If Grookai Value is blocked, the public grid helper does not emit an active-ask-only value as the card price.

## Regression Readback

`GV-PK-HP-101` / Mightyena ex:

- Grookai Value low: `$48.70`
- Grookai Value mid: `$52.90`
- Grookai Value high: `$55.46`
- Active Ask mid: `$79.00`
- Market pressure: `58%`
- Status: `active_listings_above_reference`
- Confidence: `medium`

## Verification

```text
node --test tests/contracts/mee_public_price_bridge_v1.test.mjs tests/contracts/mee_public_pricing_bridge_reference_anchored_v1.test.mjs tests/contracts/market_evidence_engine_pricing_labels_v1.test.mjs
npm --prefix apps/web run typecheck
```

Results:

- Focused contracts: `22/22` passing
- Web typecheck: passing

