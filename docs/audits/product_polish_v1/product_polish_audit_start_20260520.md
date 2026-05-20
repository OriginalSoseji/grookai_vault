# PRODUCT_POLISH_AUDIT_V1 Start

Date: 2026-05-20

## Objective

Start the production polish lane for Grookai Vault.

This is not a product redesign sprint. The goal is to refine the existing product into a more premium, collector-focused experience while preserving the governed identity, ownership, pricing, scanner, and Species Dex boundaries.

## Added Lane

`INTERACTION_HIERARCHY_V1` is inserted after `DESIGN_SYSTEM_TIGHTENING_V1`.

Purpose: define what visually matters most so polish work does not make secondary concepts louder than identity and ownership.

Priority order:

1. Card identity
2. Selected finish / variant
3. Ownership state
4. Interaction / action
5. Price
6. Cameo / search context
7. Metadata
8. Secondary diagnostics

## Immediate UX Tweak

Added a dark mode option:

- App-wide theme toggle in the global header
- Stored in `localStorage`
- Uses system dark preference when no user preference exists
- Applies before hydration to reduce theme flash
- V1 is intentionally broad/global; deeper surface-by-surface dark polish remains part of the design-system lane

## Current Guardrails

- No DB writes
- No migrations
- No scanner changes
- No pricing changes
- No Species Dex denominator changes
- No cameo identity changes

## Next Audit Work

Audit and screenshot:

- Explore/search
- Card detail
- Set page
- Dex list/detail
- Vault
- Mobile global navigation
- Empty/loading/fallback states

Each finding should classify:

- hierarchy issue
- visual-system issue
- interaction issue
- trust/data clarity issue
- performance/perceived-speed issue

