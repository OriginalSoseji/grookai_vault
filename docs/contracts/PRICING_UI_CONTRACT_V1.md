# PRICING_UI_CONTRACT_V1

Status: ACTIVE  
Type: UI Contract  
Scope: Defines how pricing is displayed in Grookai Vault UI using JustTCG-compliant rules  
Authority: Subordinate to JUSTTCG_DISPLAY_CONTRACT_V1

---

# PURPOSE

This contract defines the exact UI behavior for pricing display in Grookai Vault.

It translates:
- pricing backend outputs
- JustTCG compliance constraints
- product trust requirements

into a deterministic UI system.

This contract governs:
- default pricing display
- expanded pricing panels
- source hierarchy
- labeling
- fallback behavior
- beta/experimental exposure

---

# CORE PRINCIPLE

Pricing UI must communicate:

- clarity
- trust
- simplicity

NOT:

- data completeness
- multi-source comparison
- analytical superiority

---

# SOURCE HIERARCHY (LOCKED)

Priority order:

1. JustTCG -> PRIMARY (Reference pricing)
2. eBay -> FALLBACK (Only when JustTCG missing)
3. Grookai Value -> SECONDARY / EXPERIMENTAL

No UI may violate this hierarchy.

---

# DEFAULT CARD PRICING DISPLAY

## REQUIRED STRUCTURE

The default UI must show:

1. Primary Price (JustTCG)
2. Condition Label
3. Source Label
4. Optional Range (JustTCG-derived)

---

## DEFAULT LAYOUT (CONTRACT)

Primary block:

- Large price:
  - `$XX.XX`
- Condition:
  - `Near Mint` (or selected condition)
- Source label:
  - `Reference pricing: JustTCG`

Optional supporting line:

- Range:
  - `$XX - $XX`

---

## RULES

- Only ONE price may be visually dominant
- That price MUST be JustTCG when available
- Source label MUST be visible (not hidden)
- Do NOT show multiple sources at equal weight
- Do NOT show Grookai Value in default view

---

# RANGE DISPLAY RULE

Allowed:

- min/max derived from JustTCG variants

Constraints:

- must be per-card only
- must not expose raw vendor dataset
- must not resemble bulk vendor data replication

---

# FALLBACK BEHAVIOR

If JustTCG is NOT available:

Display:

- eBay-derived price (median or selected metric)
- Source label:
  - `Market data: eBay`

Rules:

- Must clearly indicate NOT JustTCG
- Must not imply equivalence to JustTCG
- Must not mix sources in one number

---

# EXPANDED PRICING PANEL

Expandable UI may include:

## SECTION 1 - JustTCG (PRIMARY)

- Price
- Range
- Listing count (if available)
- Last updated timestamp

Label:

- `JustTCG Reference`

---

## SECTION 2 - eBay (CONTEXT)

- Median price
- Listing count

Label:

- `eBay Market`

Rules:

- Must be visually secondary
- Must not appear as co-equal primary price

---

## SECTION 3 - Grookai Value (EXPERIMENTAL)

Display ONLY if:

- behind expansion
- clearly labeled as experimental

Label:

- `Grookai Value (Beta)`

Rules:

- Must not be default-visible primary
- Must not be positioned as “better” or “more accurate”
- Must not appear co-equal with JustTCG

---

# PROHIBITED UI PATTERNS

The following are NOT allowed:

- Side-by-side JustTCG vs eBay comparison as default
- Equal-weight multi-source pricing blocks
- “Best price across sources” UI
- Arbitrage-style pricing displays
- Public pricing dashboards resembling vendor datasets
- Grookai Value as default visible price next to JustTCG
- Any UI implying Grookai replaces JustTCG pricing

---

# ATTRIBUTION RULES

Required:

- Plain text labeling:
  - `Reference pricing: JustTCG`

Optional:

- `JustTCG reference`

Not allowed:

- logo usage
- branded badges
- implied endorsement

---

# FRESHNESS / TIMESTAMP RULE

Where practical, show:

- `Updated: X hours ago`

Rules:

- Must not imply real-time guarantee
- Must not imply perfect accuracy

---

# PUBLIC WEB RULES

Public web is HIGHER RISK.

Allowed:

- single JustTCG reference price or range
- simple label
- no comparison UI

Restricted:

- expanded comparison panels
- multi-source pricing dashboards
- prominent Grookai Value

---

# AUTHENTICATED APP RULES

Inside authenticated app:

Allowed:

- expanded panel
- Grookai Value (beta)
- deeper insights

Still prohibited:

- default comparison UI
- co-equal multi-source pricing display

---

# EMPTY / NO DATA STATE

If no pricing exists:

Display:

- `No pricing data available`

Optional:

- CTA:
  - `View market listings`

Rules:

- Must not fabricate or estimate
- Must not fallback silently

---

# UI BEHAVIOR SUMMARY

| State | UI Behavior |
|------|------------|
| JustTCG available | Show JustTCG price + range |
| JustTCG missing | Show eBay fallback |
| Expanded | Show JustTCG + eBay + optional Grookai Value |
| Public web | Only simple JustTCG summary |
| App view | Controlled expansion allowed |

---

# FUTURE EXTENSIONS (LOCKED OUT)

The following require vendor clarification:

- default side-by-side comparison
- Grookai Value as co-equal price
- pricing dashboards
- cross-source ranking systems

---

# FINAL INVARIANTS

1. JustTCG is always the primary visible price when present  
2. UI must never imply Grookai replaces JustTCG  
3. UI must never expose vendor data in bulk form  
4. UI must always label source clearly  
5. UI must prioritize clarity over completeness  

---

# RESULT

Grookai pricing UI becomes:

- simple
- trustworthy
- compliant
- scalable

while preserving future flexibility once vendor clarification is obtained.
