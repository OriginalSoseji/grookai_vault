# MARKET_ANALYSIS_FOUNDATION_CONTRACT_V1

Status: ACTIVE  
Type: Foundation Contract  
Scope: Defines the canonical server-side market-analysis resolution model for Grookai Vault web pricing surfaces

---

# PURPOSE

This contract defines the single authoritative foundation for card-level market analysis.

It exists to stop recurring drift between:

- local latest JustTCG state
- history fetch logic
- insight derivation
- page-level fallback behavior
- UI labels and empty states

The market-analysis page must no longer assemble truth from multiple loosely coupled helpers.

It must receive one resolved model.

---

# SCOPE

This contract governs:

- selected-slice resolution
- upstream identifier precedence
- JustTCG history resolution
- local insight derivation
- page-facing market-analysis model shape
- server-side diagnostics for history/render decisions

This contract does not govern:

- schema
- ingestion
- public card-page pricing rail
- Grookai Value formulas

---

# SOURCE AUTHORITY

Authority order:

1. JustTCG upstream API contract
2. locked Grookai pricing/display contracts
3. this foundation contract

If conflict exists, higher authority wins.

---

# CORE PRINCIPLE

Market Analysis must have one canonical server-side resolver.

Pages render.

Resolvers decide truth.

---

# CANONICAL MODEL RULE

There must be exactly one canonical resolver for Market Analysis:

- `getCardMarketAnalysisModel(cardPrintId, duration)`

This resolver is the only source of truth for:

- selected slice
- history lookup strategy
- insight inclusion
- hero state
- empty-history state
- disclosure visibility

No page may independently stitch together:

- selected slice labels
- history fallback rules
- history availability rules
- insight visibility booleans

---

# SELECTED SLICE RULE

Market Analysis must resolve exactly one selected micro-market slice per request.

The selected slice must be determined once from repo truth using local JustTCG latest rows.

Deterministic priority:

1. `Near Mint + Normal`
2. `Near Mint + next available printing`
3. best available slice ordered by:
   - condition priority: `Near Mint`, `Lightly Played`, `Moderately Played`, `Heavily Played`, `Damaged`
   - then printing stability preference

The selected slice must then be reused everywhere:

- hero label
- history request target
- empty-history messaging
- diagnostics

No duplicate slice selection logic is allowed outside the canonical resolver.

---

# IDENTIFIER PRECEDENCE RULE

History resolution must follow upstream precedence:

1. exact variant path first when a local upstream `variant_id` exists
2. card-level fallback only if exact variant lookup fails or returns no usable history

The page must never know whether history came from:

- `variantId`
- `cardId`

The page receives normalized output only.

---

# NORMALIZED MODEL RULE

The canonical resolver must return one resolved model containing, at minimum:

- selected slice truth
- normalized history result
- normalized local insights
- UI visibility flags
- server-side diagnostics summary

Conceptual shape:

- `selectedSlice`
- `history`
- `insights`
- `uiFlags`
- `diagnostics`

Field naming may vary, but the returned model must preserve this role boundary.

---

# HELPER BOUNDARY RULE

Helper responsibilities are subordinate to the canonical resolver.

`getJustTcgPriceHistory`

- may fetch history for a supplied selected slice
- may apply upstream variant-first then card fallback logic
- may normalize history points
- must not decide page truth

`getMarketInsights`

- may derive interpreted insights from local latest JustTCG rows
- must not decide selected slice
- must not decide chart visibility
- must not decide page fallback behavior

---

# DIAGNOSTICS RULE

The canonical resolver must produce durable server-side diagnostics for every market-analysis resolution.

Diagnostics must make it clear:

- which slice was selected
- which identifier path was used
- whether card fallback was used
- how many raw history points were seen
- how many normalized history points survived
- why no-history was returned, when applicable

Diagnostics must remain server-side only.

Vendor payloads must not be rendered into the UI.

---

# PAGE RESPONSIBILITY BOUNDARY

`market/page.tsx` may only:

- authenticate
- resolve card/card_print context
- call the canonical market-analysis resolver
- render from the returned model

The page must not:

- select slices
- choose identifier precedence
- build history fallback rules
- assemble ad hoc visibility booleans from multiple sources

---

# EMPTY-STATE RULE

`Price history unavailable` may only render when:

- a selected slice exists
- exact variant history produced no usable points
- card-level fallback also produced no usable points or was unavailable

If either upstream history path succeeds, the chart must render.

---

# FINAL INVARIANTS

1. Market Analysis has one canonical server-side resolver.
2. One request resolves one selected slice.
3. Variant path takes precedence over card fallback.
4. Pages render resolved truth; they do not assemble it.
5. Server diagnostics must remove guess-driven debugging.
6. No public/anonymous history leakage is permitted.

---

# RESULT

Market Analysis becomes:

- deterministic
- diagnosable
- upstream-aligned
- resistant to conversational drift

Future work must extend this foundation, not bypass it.
