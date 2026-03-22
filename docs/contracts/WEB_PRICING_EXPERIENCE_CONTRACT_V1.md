# WEB_PRICING_EXPERIENCE_CONTRACT_V1

Status: ACTIVE  
Type: Web UI Contract  
Scope: Defines pricing display behavior for Grookai Vault web surfaces  
Authority: Subordinate to PRICING_UI_CONTRACT_V1 and JUSTTCG_DISPLAY_CONTRACT_V1

---

# Purpose

This contract governs web-only pricing behavior in Grookai Vault.

It covers:

- public card pages
- authenticated web app pricing surfaces
- expansion behavior
- copy / labeling
- empty states
- fallback rules

It does not cover:

- Flutter / mobile
- schema
- ingestion
- pricing formulas

---

# Source Authority

Authority order for web pricing behavior:

1. JustTCG Terms and `JUSTTCG_DISPLAY_CONTRACT_V1`
2. `PRICING_UI_CONTRACT_V1`
3. `WEB_PRICING_EXPERIENCE_CONTRACT_V1`

If any conflict exists, the higher authority wins.

---

# Surface Classification

This contract defines two web surfaces only:

- Public Web Surface
- Authenticated Web Surface

---

# Public Web Surface Rules

The public card page pricing block is the most conservative pricing surface in Grookai Vault.

Public surface must:

- show one primary price or one simple range
- prefer JustTCG when available
- label source in plain text
- show updated / sync freshness where practical
- use eBay only as fallback when JustTCG is absent
- avoid dense source breakdown by default

Public surface must not:

- show side-by-side JustTCG vs eBay
- show Grookai Value as default-visible
- show comparison dashboards
- show raw vendor tables
- imply endorsement or logo rights

Required recommended copy examples:

- `Reference pricing: JustTCG`
- `Updated from latest JustTCG sync`
- `Market data: eBay`

---

# Authenticated Web Surface Rules

Authenticated web may:

- show the same primary pricing block as public web
- allow an expandable pricing panel
- include secondary eBay context in expansion
- include Grookai Value only if clearly labeled beta / experimental and not default-primary

Authenticated web must not:

- make Grookai Value co-equal with JustTCG
- default to source comparison layout
- present arbitrage / best-price framing
- imply Grookai replaces JustTCG reference pricing

---

# Default Pricing Block Contract

The default web pricing block must contain:

- Primary price
- Condition label
- Source label
- Optional range
- Optional freshness timestamp

Locked behavior:

- primary price = JustTCG when present
- fallback price = eBay only when JustTCG is absent
- source label must reflect the actual source used
- range may be shown only if derived from the currently displayed source and already available in the approved surface

Locked invariant:

- only one visually dominant price may exist on initial render

---

# Expansion / Detail Mode Contract

The expanded pricing mode may include:

- JustTCG detail
- eBay context
- Grookai Value beta
- listing counts if already available in the UI surface
- last updated

Expansion exists for depth only.

It must not be used to create a co-equal comparison frame between sources.

Required framing:

- JustTCG remains the primary reference
- eBay remains context / fallback
- Grookai Value remains experimental

---

# Empty / Missing Data States

If no JustTCG data exists but eBay exists:

- show eBay fallback
- label it explicitly as eBay

If neither source exists:

- show `No pricing data available`

If data is stale:

- show freshness context if available
- do not imply real-time guarantee

If loading:

- show a loading state that does not imply a known price before data resolves

Rules:

- never fabricate estimates
- never silently switch sources
- always label fallback source explicitly

---

# Copy / Labeling Contract

Allowed examples:

- `Reference pricing: JustTCG`
- `JustTCG reference`
- `Updated from latest sync`
- `No pricing data available`

Disallowed examples:

- `Official price`
- `Guaranteed live price`
- `Best market price`
- `Powered by JustTCG` presented as if required
- any wording implying endorsement or exclusivity unless explicitly verified

---

# Layout / Interaction Principles

Web implementation must follow these principles:

- clarity before density
- trust before analysis
- card-first, not terminal-first
- default simplicity
- optional depth through expansion
- public web is the most conservative surface

---

# Future Boundary

The following are locked out for now:

- default side-by-side source comparison
- public Grookai Value prominence
- pricing dashboards
- cross-source ranking systems
- vendor-terminal style web experiences

---

# Final Invariants

- JustTCG is the primary visible reference when present
- eBay is fallback, not peer default
- Grookai Value is secondary / experimental
- public web remains the most conservative surface
- source labels must always be visible
- one dominant price only on initial render
