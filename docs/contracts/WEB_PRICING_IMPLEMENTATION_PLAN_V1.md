# WEB_PRICING_IMPLEMENTATION_PLAN_V1

Status: ACTIVE  
Type: Implementation Plan Contract  
Scope: Defines the web-only implementation path from pricing contracts to concrete card-page behavior  
Authority: Subordinate to PRICING_UI_CONTRACT_V1 and WEB_PRICING_EXPERIENCE_CONTRACT_V1

---

## 1. PURPOSE

This document is the bridge from locked pricing contracts to actual web implementation.

It applies only to the Grookai Vault web application.

It defines component-level behavior for the card page pricing experience and exists to make implementation deterministic.

This plan covers:

- the web card page pricing column
- pricing components
- expansion behavior
- copy and labeling
- empty states
- source fallback rules

This plan does not cover:

- Flutter / mobile
- schema
- ingestion
- pricing formulas

---

## 2. CURRENT STATE AUDIT (FROM SCREENSHOT)

### Current issues

1. No JustTCG pricing displayed
   - Classification: `Missing`
   - Effect: the intended primary reference source is absent from the current card page

2. “Pricing Trust” block shows empty / no comps
   - Classification: `Violating contract`
   - Effect: empty trust messaging occupies space without providing a valid primary pricing experience

3. “Projected PSA value” shown without reference lane
   - Classification: `Premature`
   - Effect: a secondary / derivative concept is surfaced before the primary pricing reference is established

4. No clear primary price
   - Classification: `Violating contract`
   - Effect: the page does not communicate one dominant price source on initial render

5. No source labeling
   - Classification: `Violating contract`
   - Effect: current pricing-related UI does not tell the user which source is being shown

6. UI currently violates “one dominant price”
   - Classification: `Violating contract`
   - Effect: the pricing area is organized around placeholder states rather than one clear price block

7. UI currently violates “source hierarchy”
   - Classification: `Violating contract`
   - Effect: JustTCG is not yet established as the primary visible reference when present

8. UI currently violates “fallback clarity”
   - Classification: `Violating contract`
   - Effect: fallback behavior is not explicit because the current UI does not visibly distinguish primary, fallback, and unavailable states

9. Current right-side pricing panel exists but is not contract-aligned
   - Classification: `Misplaced`
   - Effect: the structure exists, but its content and priority do not yet match the locked pricing contracts

---

## 3. TARGET STATE (HIGH LEVEL)

The card page must have the following structure:

### LEFT

- card image
- unchanged

### CENTER

- identity information
- unchanged

### RIGHT (CRITICAL)

Replace the current pricing column with:

## PRIMARY PRICING BLOCK (NEW)

This top-most pricing element must include:

- large price OR range
- condition label (default NM)
- source label
- optional updated timestamp

This becomes the first pricing element the user sees.

---

## 4. COMPONENT BREAKDOWN

### 4.1 `PrimaryPricingBlock`

Props:

- `price`
- `range_min`
- `range_max`
- `source` (`"justtcg" | "ebay" | null`)
- `condition`
- `updated_at`

Rules:

- if JustTCG exists, use it
- if JustTCG does not exist and eBay exists, fallback to eBay
- if neither exists, show empty state
- this component owns the single dominant price presentation

### 4.2 `PricingSourceLabel`

Behavior:

- JustTCG -> `Reference pricing: JustTCG`
- eBay -> `Market data: eBay`

Rules:

- plain text only
- no logos
- no badges

### 4.3 `PricingRange`

Render only if:

- both `min` and `max` exist

Format:

- `$X - $Y`

Rules:

- range is secondary to the main price
- range must not become the visually dominant element if a single primary price exists

### 4.4 `PricingEmptyState`

Cases:

#### Case A - No JustTCG, no eBay

Display:

- `No pricing data available`

#### Case B - JustTCG not configured

Display:

- `Reference pricing unavailable`

Rules:

- do not fabricate estimates
- do not imply hidden fallback logic

### 4.5 `PricingDetailsPanel`

This replaces the current “Pricing Trust” block.

It is expandable and secondary to the primary block.

Contains:

#### Section 1 - JustTCG (if available)

- price
- range
- updated

#### Section 2 - eBay (if available)

- median
- listing count

#### Section 3 - Grookai Value (optional)

- only if value exists
- must be labeled:
  - `Grookai Value (Beta)`
- must not appear if no valid signal exists

Rules:

- expansion exists for depth, not for equal-weight comparison
- JustTCG remains the primary reference
- eBay remains contextual
- Grookai Value remains experimental

---

## 5. REMOVALS / CHANGES REQUIRED

The following current UI elements must be removed or hidden until valid:

- `No accepted live comps yet`
- `No confidence`
- `Freshness unknown`
- `Projected PSA value`

Reason:

- these elements violate clarity
- they surface broken or premature system states
- they distract from the required primary pricing block

---

## 6. DATA MAPPING (IMPORTANT)

The web pricing implementation must map from:

- `public.v_card_pricing_ui_v1`

Field mapping:

- `primary_price` -> primary displayed price
- `primary_source` -> source label selection
- `min_price` -> range minimum
- `max_price` -> range maximum
- `grookai_value` -> optional beta display in expanded mode only
- `ebay_median_price` -> fallback context and fallback primary when JustTCG is absent
- `ebay_listing_count` -> eBay context in detail mode

Condition mapping:

- default condition shown in the primary block is `Near Mint`
- current JustTCG web pricing contract assumes NM-first display behavior

Freshness mapping:

- if a suitable freshness field is available in the UI surface, render it
- if missing, omit freshness cleanly rather than showing broken placeholder copy

Graceful degradation rule:

- if a field is missing, the component must omit that element cleanly
- missing optional fields must not block rendering of the pricing block

---

## 7. RENDER LOGIC (STRICT)

Render rules:

IF JustTCG exists:  
show JustTCG

ELSE IF eBay exists:  
show eBay fallback

ELSE:  
show empty state

Never:

- mix sources into one number
- show both sources as primary
- promote Grookai Value to primary

---

## 8. PUBLIC VS AUTHENTICATED BEHAVIOR

### Public

- show only `PrimaryPricingBlock`
- hide expanded panel by default
- keep the experience simple and conservative

### Authenticated

- allow expansion
- allow Grookai Value (`Beta`)
- still no comparison layout

Rules common to both:

- one dominant price only
- clear source label always visible
- no equal-weight source layout

---

## 9. STYLING / UX RULES

- primary price must be visually dominant
- source label must be visible but subtle
- range must be smaller than the primary price
- no visual competition between sources
- expansion must read as secondary depth, not a second primary pricing zone

---

## 10. FINAL INVARIANTS

- one price only at top
- JustTCG first when available
- eBay only fallback
- Grookai Value never primary
- no comparison UI
- no broken / empty system messaging

---

## 11. RESULT

After implementation:

- the card page shows a clean, trusted price
- the page does not create source confusion
- the pricing UI does not violate the locked contracts
- the surface is ready for future controlled enhancement without reworking the core hierarchy

---

## IMPLEMENTATION CHECKLIST

- build `PrimaryPricingBlock`
- wire to `v_card_pricing_ui_v1`
- remove old pricing trust UI
- add expandable panel
- validate fallback behavior
- validate empty states
