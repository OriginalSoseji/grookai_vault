# Market Intelligence Read Model V1

## Purpose

Turn existing exact-printing MEE active-listing evidence into useful signed-in collector intelligence without redefining price authority.

## Authority

- TCGPlayer `marketPrice` remains the Production V1 market close.
- eBay rows are active seller asks, not completed sales.
- This contract does not create Grookai Value.
- No active ask may overwrite, replace, or backfill a TCGPlayer Market value.

## Interface

`get_market_intelligence_read_model_v1(uuid[], uuid[])` returns one bounded exact-printing result per requested `card_printing_id`.

The interface exposes:

- lowest active ask;
- median active ask;
- active listing count;
- distinct seller count;
- distance between the lowest and median ask;
- evidence freshness;
- evidence-density strength;
- exact printing identity;
- source and authority labels.

## Evidence Policy

Only `mv_market_listing_active_ask_current_v1` may feed the product read. That snapshot is derived from exact-child raw-single assignments and refreshed outside the request path.

Rows older than 72 hours are unavailable. Unavailable rows expose no prices. Evidence strength measures listing and seller coverage only; it is not price confidence, valuation confidence, or a recommendation.

## Access

- `authenticated`: execute only;
- `service_role`: execute and source-snapshot read;
- `anon` and `public`: no execute;
- raw MEE warehouse tables remain service-only.

## Invariants

- Exact printing is mandatory.
- Currency is USD for V1.
- `is_market_value=false` for every row.
- `is_completed_sale=false` for every row.
- The function is read-only and bounded to 500 requested printings.
- No canonical identity, vault, pricing publication, or evidence rows are written.
- Product UI must label the lane `Available Today` and explain that asking prices are not sales or market value.
