# JUSTTCG_DISPLAY_CONTRACT_CHECKPOINT_V1

## Status

`ACTIVE / CONSERVATIVE / UI-COMPLIANCE GATE`

## Date

`2026-03-21`

## Context

Grookai completed the JustTCG backend domain and needed a UI/compliance checkpoint before shipping public display behavior.

The audit confirmed that JustTCG documentation supports application display and server-side sync, but the Terms still contain a broad restriction against:

- building competing products
- competitive analysis

That makes aggressive public comparison UX unsafe without vendor clarification.

## What Is Safely Cleared Now

- server-side JustTCG API usage
- paid-tier commercial use
- per-card / product-page JustTCG reference display
- simple JustTCG-derived summaries such as NM price or range
- plain-text source labeling
- eBay fallback when JustTCG is unavailable

## What Is Not Safely Cleared

- public JustTCG vs eBay side-by-side comparison as a default feature
- public Grookai Value next to JustTCG as a co-equal display price
- logo / branded badge usage
- bulk public price-table experiences that resemble vendor-data redistribution

## Decision

UI may proceed only on the conservative baseline:

- JustTCG remains the primary reference price when present
- JustTCG should be labeled as reference pricing
- eBay may be used as fallback, not as a default comparison peer
- Grookai Value remains secondary / experimental and should not become the default public JustTCG-adjacent number

## Next Step

Proceed with UI design using the conservative baseline in `JUSTTCG_DISPLAY_CONTRACT_V1`.

If product wants public side-by-side comparison or prominent Grookai Value display, get written vendor clarification first.
