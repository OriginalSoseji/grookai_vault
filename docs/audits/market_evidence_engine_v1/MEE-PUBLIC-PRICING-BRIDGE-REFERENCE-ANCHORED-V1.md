# MEE Public Pricing Bridge Reference Anchored V1

Status: audit and implementation plan only

No public DB changes were applied.

## Why This Audit Happened

The public card page showed `GV-PK-HP-101` / Mightyena ex with a `$79` pricing value. That value came from eBay active-listing ask evidence, not from a valuation anchor. The previous pricing engine produced a more useful collector-facing result because it exposed a condition/reference ladder and treated eBay as comparison evidence rather than primary truth.

The reset goal is to keep the Market Evidence Engine foundation while replacing the public bridge behavior with an evidence-anchored model.

## Verified Current Behavior

Live readback for `GV-PK-HP-101`:

- card_print_id: `7b67bbe0-370d-4db1-af41-020f3c4e576e`
- name: `Mightyena ex`
- set_code: `ex13`
- number: `101`
- rarity: `Rare Holo EX`

Current `public.v_market_evidence_public_price_bridge_v1` row:

- `primary_price = 79`
- `grookai_value = 79`
- `min_price = 40`
- `max_price = 178.05`
- `minimum_active_ask = 15.98`
- `maximum_active_ask = 224`
- `active_listing_count = 58`
- `seller_count = 15`
- `primary_source = ebay`
- `pricing_basis = active_listing_market_estimate`
- `confidence_label = high`
- `market_truth = false`
- `sold_comp = false`
- `active_listing_evidence = true`

Current reference evidence for the same card exists in `market_reference_signal_rollups`:

- `rollup_lane = internal_reference_signal`
- `review_status = review_required_single_source`
- `currency = USD`
- `reference_low = 48.70`
- `reference_median = 50.00`
- `reference_high = 55.46`
- `source_count = 1`
- `eligible_evidence_count = 3`
- `review_flags = single_source_only, non_usd_evidence_excluded, quarantined_context_present`
- `source_summary.sources = tcgdex_tcgplayer_reference`

Current bridge totals:

- `v_market_evidence_public_price_bridge_v1`: 11 rows
- `v_card_pricing_ui_v1`: 11 rows
- `market_reference_signal_rollups`: 16,558 rows
- `v_market_evidence_internal_approved_price_signals_v1`: 11 rows

## Exact Cause

The active-listing median becomes public primary value in:

- `docs/sql/mee_public_price_bridge_v1.sql`
- `supabase/migrations/20260625180000_mee_public_price_bridge_v1.sql`

The cause is this projection:

```sql
signal.candidate_median as primary_price,
signal.candidate_median as grookai_value,
'ebay'::text as primary_source,
'active_listing_market_estimate'::text as pricing_basis
```

The same view only reads:

```sql
from public.v_market_evidence_internal_approved_price_signals_v1 signal
where signal.source_type = 'active_listing'
  and signal.evidence_lane = 'raw_single'
```

It does not join or consult `market_reference_signal_rollups`.

The app then faithfully displays the bridge output:

- `apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/components/pricing/CardPagePricingRail.tsx`
- `apps/web/src/app/api/card-pricing/route.ts`

Those files are not the root pricing-policy bug. They expose the bad bridge contract as designed.

## Drift From Product Contract

Current behavior violates the new contract because:

- Active eBay ask median becomes `primary_price`.
- Active eBay ask median becomes `grookai_value`.
- Confidence is based only on listing count and seller count.
- Reference evidence exists but is ignored.
- Condition is not modeled in the public value.
- No separate public lane exists for Available Today / Buy Now.

## Required Replacement Shape

The replacement public bridge must expose at least two separated lanes:

1. `grookai_value_*` valuation fields
2. `active_ask_*` availability fields

Recommended compatibility fields:

- `card_print_id`
- `gv_id`
- `currency`
- `grookai_value_low`
- `grookai_value_mid`
- `grookai_value_high`
- `grookai_value_basis`
- `grookai_value_source_mix`
- `grookai_value_confidence_label`
- `grookai_value_block_reason`
- `active_ask_low`
- `active_ask_mid`
- `active_ask_high`
- `active_ask_listing_count`
- `active_ask_seller_count`
- `active_ask_condition_label`
- `market_pressure_pct`
- `market_pressure_status`
- `freshness_label`
- `condition_policy`
- `lane_policy`
- `signed_in_only`

## Bridge Policy

Public policy should evaluate in this order:

1. Block mixed raw/slab evidence.
2. Resolve known condition if available.
3. Read strongest eligible valuation anchor.
4. Read active ask lane separately.
5. Compute controlled market-pressure adjustment only when allowed.
6. Emit Grookai Value when valuation evidence is sufficient.
7. Emit active ask lane when live eBay evidence exists.
8. Emit block reason when valuation is unavailable.

## Regression Requirements

Regression tests must cover:

- Reference plus eBay disagreement: eBay does not replace Grookai Value.
- eBay-only evidence: show Active Ask only, no Grookai Value.
- Reference-only evidence: show Grookai Value, Available Today unavailable.
- Mixed raw/slab evidence: block Grookai Value.
- Mightyena ex `GV-PK-HP-101`: `$79` active ask must not be Grookai Value.

## Implementation Plan

1. Create a read-only candidate SQL view for an evidence-anchored public bridge.
2. Keep current production bridge untouched until review.
3. Add a compatibility layer for existing `v_card_pricing_ui_v1` consumers.
4. Update web types to distinguish Grookai Value from Active Ask.
5. Update card pricing UI to show two sections:
   - Grookai Value
   - Available Today
6. Run regression tests and live readback against `GV-PK-HP-101`.
7. Produce a targeted remote schema apply prompt before any DB change.

## Approval Prompt For Next Phase

Approve real MEE-PUBLIC-PRICING-BRIDGE-REFERENCE-ANCHORED-V1 plan only. Scope: create a local SQL/view candidate and app compatibility plan for an evidence-anchored public pricing bridge that separates Grookai Value from Available Today active ask evidence, uses reference valuation as the current primary anchor until stronger evidence exists, blocks mixed raw/slab lanes, preserves condition policy, and includes regression tests for GV-PK-HP-101. No remote DB apply. No pricing_observations writes. No ebay_active_prices_latest writes. No public app-visible migration apply. No provider calls. No source fetches. No identity/vault/image writes. No deletes. No merges. No global apply.

