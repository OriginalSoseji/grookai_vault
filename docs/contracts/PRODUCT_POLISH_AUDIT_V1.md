# PRODUCT_POLISH_AUDIT_V1

## Purpose

Make Grookai Vault feel production-grade without changing card identity, pricing, scanner, Species Dex denominator logic, or canonical data rules.

This lane is an audit and execution roadmap for visual quality, interaction quality, and trust clarity.

## Scope

Audit these surfaces:

- Explore and search results
- Card detail
- Set pages
- Grookai Dex
- Vault
- Public collection/profile surfaces
- Global chrome and mobile navigation

## Product Quality Targets

- Search results explain why each card matched.
- Variant/finish selection feels intentional and collectible.
- Ownership state is more important than pricing and diagnostics.
- Cameo context is visible but never louder than card identity.
- Empty, loading, error, and fallback states feel designed.
- Mobile and desktop maintain equivalent hierarchy.
- Page density improves without becoming noisy.

## Lane Order

1. PRODUCT_POLISH_AUDIT_V1
2. DESIGN_SYSTEM_TIGHTENING_V1
3. INTERACTION_HIERARCHY_V1
4. SEARCH_RESULTS_POLISH_V1
5. CARD_DETAIL_POLISH_V1
6. SET_AND_DEX_POLISH_V1
7. MOBILE_PARITY_POLISH_V1

## Hard Rules

Do not:

- Change card identity or parent `gv_id` semantics
- Change Species Dex denominators
- Change scanner behavior
- Change pricing logic
- Run migrations
- Perform DB writes
- Make cameo context look like identity
- Make prices visually louder than ownership

## Audit Outputs

The audit should produce:

- Surface-by-surface findings
- Screenshot checklist
- Visual hierarchy risks
- Interaction hierarchy risks
- Quick-win polish list
- Deferred polish list
- Implementation order
- Verification checklist

