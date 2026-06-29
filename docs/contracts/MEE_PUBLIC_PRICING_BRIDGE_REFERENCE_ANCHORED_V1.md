# MEE Public Pricing Bridge Reference Anchored V1

Status: design contract, not applied

This contract resets the collector-facing pricing bridge after the active-listing-only public bridge exposed eBay ask medians as Grookai Value.

## Principle

Grookai Value is evidence-anchored, with reference sources serving as the primary valuation anchor until stronger market evidence exists.

Evidence hierarchy:

1. Verified transaction evidence, reserved for future Grookai marketplace sales, verified user transactions, or licensed sold-comparable feeds.
2. Reference valuation evidence, including TCGPlayer-derived, Cardmarket-derived, TCGCSV, and PokemonTCG.io reference layers.
3. Active listing evidence, including eBay active buy-now listings, as live availability and asking-price pressure.
4. Insufficient evidence, which blocks value publication.

Reference evidence anchors the initial valuation. Active market evidence may influence confidence, ranges, and market status, but does not replace the valuation anchor unless future publication policy explicitly allows it.

## Product Contract

Collector-facing pricing must answer:

- What is Grookai's evidence-anchored value?
- What can I buy it for today?
- Is the live market above or below the evidence anchor?
- How confident is Grookai?
- Why is a value unavailable if blocked?

## Public Lanes

### Grookai Value

Grookai Value is the valuation lane.

It may be shown only when evidence is valuation-eligible and lane-safe. Today that means reference evidence is present and active market pressure, if present, is bounded by confidence, clustering, freshness, review state, and source agreement.

### Available Today

Available Today is the active-listing lane.

It may show active ask median, range, listing count, seller count, freshness, and market pressure. It must not be labeled market truth or sold comparable evidence.

## Active Market Adjustment

Grookai Value is not completely isolated from live market data.

The model is:

```text
Evidence Anchor
+ Controlled Market Pressure Adjustment
= Grookai Value
```

The adjustment is controlled by:

- comparable listing count
- seller diversity
- price clustering and spread
- source agreement
- source freshness
- raw vs slab separation
- condition confidence
- review status
- exclusion flags
- future verified transaction strength

Active listings may nudge Grookai Value. They must not overwrite it.

## Condition Rule

Do not default Grookai Value to Near Mint pricing.

- If the user/card has a known condition, use that condition.
- If condition is unknown, show an unconditioned reference range or "condition required."
- If reference sources provide a condition ladder, preserve the ladder: Damaged, HP, MP, LP, NM.
- If eBay active evidence is mostly NM listings, label it as NM Active Ask, not general Grookai Value.
- Do not compare NM eBay active asks against all-condition reference values as if they are equivalent.

## Required Cases

### Reference and active evidence agree

Show Grookai Value from the evidence anchor with a small market-pressure adjustment when confidence supports it. Show Available Today separately.

### Reference and active evidence disagree

Do not replace the evidence anchor.

Show:

- evidence-anchored Grookai Value or range
- active ask signal separately
- market status: active listings above reference, below reference, or aligned with reference

### eBay-only evidence

Do not label eBay-only active ask as Grookai Value.

Show:

- Active Ask Range
- Available Today
- confidence: limited / active-listing-only
- explanation: "No reference market anchor available."

### Reference-only evidence

Show Grookai Value or range if the reference lane passes review and condition rules. Show Available Today as unavailable.

### Mixed raw and slab evidence

Block Grookai Value until raw and slab lanes are split.

## Regression Case

`GV-PK-HP-101` / Mightyena ex must not show `$79` as Grookai Value when that number comes from eBay active ask median.

Current verified bad state:

- `v_market_evidence_public_price_bridge_v1.primary_price = 79`
- `v_market_evidence_public_price_bridge_v1.grookai_value = 79`
- `primary_source = ebay`
- `pricing_basis = active_listing_market_estimate`

Expected V1 behavior:

- Grookai Value is anchored to reference valuation evidence when present.
- eBay around `$79` is Available Today / active ask pressure.
- If the reference anchor is around `$50-60`, Grookai Value must reflect the evidence anchor plus controlled pressure, not the active ask median.

## Boundaries

- Do not use JustTCG as public pricing.
- Do not make active eBay ask median the primary value.
- Do not publish new prices without gate checks.
- Do not write `pricing_observations`.
- Do not write `ebay_active_prices_latest`.
- Do not change identity tables.
- Do not change vault tables.
- Do not change image tables.
- Do not delete, merge, or globally apply.

