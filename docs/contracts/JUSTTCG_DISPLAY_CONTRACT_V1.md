# JUSTTCG_DISPLAY_CONTRACT_V1

Status: ACTIVE  
Type: UI / Compliance Contract  
Scope: Governs how Grookai Vault may display, cache, attribute, and commercially use JustTCG pricing data in application surfaces  
Authority: Subordinate to JUSTTCG terms and official documentation

---

# Purpose

Define the conservative, vendor-compliant display contract for JustTCG inside Grookai Vault.

This contract governs:

- UI display
- attribution
- cache / freshness behavior
- public-web posture
- beta / derived pricing posture

This contract does not govern:

- schema
- ingestion
- pricing formulas
- eBay truth-lane rules

---

# Scope

This contract applies to all Grookai UI or presentation layers that use JustTCG-backed data, including:

- authenticated app surfaces
- public website surfaces
- card detail views
- pricing panels
- comparison panels
- beta / experimental pricing badges

---

# Source Authority

Authority order for this contract:

1. `https://justtcg.com/terms`
2. `https://justtcg.com/docs`
3. `https://justtcg.com/`
4. official JustTCG blog posts

If lower-authority product or blog copy appears more permissive than the Terms, the Terms win.

If official sources are silent, Grookai must default to the conservative path.

---

# Hard Rules

1. JustTCG remains non-canonical.
   - Grookai must not present JustTCG as identity truth or final truth.

2. Grookai must use a paid tier for any commercial / business-facing JustTCG surface.
   - Free tier is not allowed for Grookai production/commercial use.

3. API keys must remain server-side.
   - No client-side or public-browser exposure is allowed.

4. Raw JustTCG data must not be resold, redistributed, or repackaged as a competing service.

5. Grookai must not expose a public raw-data mirror.
   - no raw JSON dumps
   - no public bulk export endpoints
   - no vendor-dataset replay surfaces

6. No JustTCG logo / badge / brand lockup may be used unless JustTCG grants permission.

7. Grookai must not promise guaranteed live accuracy.
   - Terms disclaim timeliness, completeness, and accuracy warranties.

8. If any proprietary notices or attributions are present in vendor-provided material, Grookai must not remove or obscure them.

9. Any use that could reasonably be characterized as:
   - competitive analysis
   - a competing pricing-data product
   must be treated as blocked until vendor clarification is obtained.

---

# Safe Defaults

Until written clarification says otherwise, Grookai should default to:

- server-side JustTCG access only
- plain-text source labeling only
- no logo usage
- card-level JustTCG summary display only
- last-updated / sync timestamp shown where practical
- no default public side-by-side source comparison
- no default public Grookai Value prominence

---

# UI Obligations

Grookai UI must:

- present JustTCG as reference pricing
- keep default pricing UI simple
- avoid implying JustTCG is canonical truth
- avoid raw variant dumps in default UI
- avoid broad public price-table experiences that reconstruct the vendor dataset

Recommended default UI behavior:

- show a JustTCG-derived NM reference price or simple range when available
- if JustTCG is unavailable, use eBay as fallback with explicit eBay labeling
- keep richer source detail behind expansion or detail mode

---

# Attribution Obligations

No explicit “Powered by JustTCG” requirement was verified.

Therefore:

- required attribution badge: not proven
- required link-back: not proven
- required logo usage: not proven

Safe attribution rule:

- use plain factual text such as:
  - `Reference pricing: JustTCG`
  - `JustTCG reference`

Avoid:

- logo usage
- stylized brand lockups
- claims of endorsement

---

# Beta / Derived Pricing Rules

Simple per-card JustTCG-derived summaries are acceptable.

Examples:

- NM price
- starting-from price
- min/max range

Multi-source derived metrics are not safely cleared by the audited contract set.

This includes:

- Grookai Value shown as a peer price beside JustTCG
- public side-by-side source comparison as a default feature
- public product positioning that centers on cross-source price arbitrage or benchmarking

Until vendor clarification:

- Grookai Value may exist internally
- Grookai Value may remain experimental
- Grookai Value should not become the primary visible JustTCG-adjacent number in the public UI

---

# Public-Web Rules

No explicit contractual distinction was found between:

- authenticated in-app display
- public-web display

Safe default:

- treat public-web display as higher risk
- keep public-web usage limited to simple per-card JustTCG reference summaries
- avoid public comparison dashboards, broad public price grids, or dataset-like browse surfaces powered by JustTCG

---

# Commercial-Use Rules

Commercial use is allowed only in accordance with subscription tier.

Therefore:

- Grookai production use must be on a paid JustTCG tier
- Grookai must operate within plan rate limits and request ceilings
- any UI feature that would materially increase bulk traffic must remain server-batched and cache-backed

If Grookai’s pricing surface begins to resemble a standalone competing pricing-data product, written vendor clarification is required before expansion.

---

# Open Questions

The following remain open and require vendor clarification before aggressive public rollout:

- Does JustTCG consider Grookai’s cross-source comparison UI to be “competitive analysis”?
- Does JustTCG consider Grookai’s broader pricing product to be a “competing product”?
- May Grookai publicly show Grookai Value beside JustTCG?
- May Grookai publicly show JustTCG and eBay side-by-side?
- Is any link-back or attribution wording preferred?
- Is any logo / badge usage permitted under separate brand guidance?
- Is there a vendor-preferred stale-cache window for public display?

---

# Non-Goals

This contract does not:

- authorize schema changes
- authorize pricing-formula changes
- authorize raw-data redistribution
- authorize direct client-side API use
- authorize public comparison features beyond the conservative baseline
