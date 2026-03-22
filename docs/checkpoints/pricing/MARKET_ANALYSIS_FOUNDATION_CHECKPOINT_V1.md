# MARKET_ANALYSIS_FOUNDATION_CHECKPOINT_V1

Status: ACTIVE  
Type: Checkpoint  
Scope: Captures the canonical Market Analysis foundation decision for Grookai Vault web pricing

---

## Context

Market Analysis repeatedly drifted because the page depended on multiple loosely coupled steps:

- local JustTCG latest rows
- local insight derivation
- JustTCG history resolution
- page-level slice labels
- page-level history-empty logic

Even when upstream data existed and helper probes succeeded, the page still reintroduced ambiguity because truth was being assembled across multiple layers instead of resolved once.

---

## Problem

The recurring failure pattern was:

- upstream history existed
- local data existed
- helper behavior was partially correct
- page-level stitching still produced drift or uncertainty

This created repeated re-litigation of:

- which slice should be graphed
- which identifier should be used
- whether fallback had actually been attempted
- whether the hero label was truthful
- why `Price history unavailable` was showing

---

## Decision

Grookai locked a foundation correction:

- Market Analysis now has one canonical server-side resolver
- selected slice is resolved centrally from local JustTCG latest rows
- variant-first history lookup is resolved centrally
- card-level fallback is resolved centrally
- insights are normalized centrally
- page UI now renders only from the resolved model

Canonical resolver:

- `apps/web/src/lib/pricing/getCardMarketAnalysisModel.ts`

---

## Current Truths

- selected slice is resolved once per request
- exact upstream `variant_id` is the primary history identifier path
- `cardId` fallback is only used if variant lookup fails or returns no usable points
- history output is normalized to `{ date, price }[]`
- duplicate same-day history points are collapsed deterministically to the latest point for that day
- interpreted insights remain local-latest based and non-authoritative
- the page no longer assembles pricing truth from separate helpers

---

## Invariants

- one canonical market-analysis resolver only
- one selected micro-market slice per request
- upstream identifier precedence is variant first, card second
- history and insights are normalized before rendering
- page-level stitching must not return
- diagnostics must explain chart/no-chart outcomes without guesswork
- auth gating remains ahead of all market-analysis rendering

---

## Why This Matters

This correction removes the recurring class of failure where:

- helper logic was correct in isolation
- page behavior still drifted
- later chats had to rediscover identifier and slice rules from scratch

The new foundation gives future work one stable memory anchor for:

- chart improvements
- deeper market insights
- expanded detail surfaces
- future analysis badges or tools

---

## What Future Work Must Not Reintroduce

Future work must not:

- reselect slices in the page
- decide variant-vs-card lookup in the page
- reassemble UI booleans from separate helpers
- hardcode hero labels
- treat history-empty and no-data as the same condition

All future Market Analysis work must extend the canonical model instead.

---

## Verification Summary

Foundation verification after refactor:

- `npm run build` passed
- `npm run lint` passed
- `npm run typecheck` passed
- live server-side probe confirmed exact `variantId` history retrieval for:
  - a `Near Mint · Normal` slice
  - a `Near Mint · Reverse Holofoil` fallback slice when `Normal` was absent

---

## Result

Market Analysis now has:

- one resolver
- one selected slice
- one normalized truth model
- one diagnostic path

This checkpoint exists so future chats stop reopening this foundation question unless a real bug is discovered.
