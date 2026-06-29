# MEE Price Review Action Model V1

Status: internal-only schema

This contract defines how Grookai records internal review decisions for price candidates that survive the non-public Market Evidence Engine publication policy gate.

Providers do not create price truth. This model only records Grookai review decisions over already-normalized evidence.

## Objects

- `public.market_evidence_price_review_events`
- `public.v_market_evidence_price_review_current_v1`
- `public.v_market_evidence_internal_approved_price_signals_v1`

## Allowed Actions

- `approve_internal_price_signal`
- `hold_manual_review`
- `reject_candidate`
- `defer_more_evidence`

## Boundary

The model is service-role-only and remains non-public. It does not write `pricing_observations`, `ebay_active_prices_latest`, public pricing views, app-visible pricing, identity tables, vault tables, or image/storage tables.

Approved internal signals are still not publishable. Public display requires a separate publication bridge contract.
