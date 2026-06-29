# MEE Price Review Action Model V1

## Goal

Create a controlled internal ledger for price-candidate review actions.

## Flow

1. A candidate survives `v_market_evidence_price_publication_policy_v1`.
2. A reviewer or safe automation writes one append-only review event.
3. `v_market_evidence_price_review_current_v1` exposes the current internal state.
4. `v_market_evidence_internal_approved_price_signals_v1` exposes approved internal signals only.
5. A later publication bridge decides whether anything can become public.

## Non-Goals

- No public pricing.
- No app-visible pricing.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No evidence acquisition.
- No identity, vault, or image writes.
