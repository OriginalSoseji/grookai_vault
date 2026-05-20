# PRODUCT_POLISH_AUDIT_V1 Surface Audit

Date: 2026-05-20

Scope: Search / Explore, card detail, set page, Dex list/detail, Vault unauthenticated state, and empty/mobile fallback states.

This audit is documentation-only. It does not change data, pricing, scanner behavior, Species Dex denominators, card identity, routes, or search ranking.

## Evidence

Screenshots captured from production:

- `screenshots_20260520/01_explore_charizard_cameo_desktop.png`
- `screenshots_20260520/02_card_detail_pikachu_svp101_desktop.png`
- `screenshots_20260520/03_set_sv8pt5_desktop.png`
- `screenshots_20260520/04_dex_list_desktop.png`
- `screenshots_20260520/05_dex_pikachu_desktop.png`
- `screenshots_20260520/06_vault_desktop.png`
- `screenshots_20260520/07_empty_search_desktop.png`
- `screenshots_20260520/08_explore_charizard_cameo_mobile.png`
- `screenshots_20260520/09_card_detail_mobile.png`
- `screenshots_20260520/10_dex_pikachu_mobile.png`

## Executive Summary

Grookai has strong product bones: card identity, finish selection, Dex progress, cameo discovery, and ownership loops are now present. The current blocker to a premium feel is not missing core functionality. It is visual hierarchy, dark-mode token consistency, and mobile containment.

The highest-risk issues are:

- Mixed dark/light surfaces make some card detail identity text nearly unreadable.
- Mobile card detail opens with an oversized/clipped card image while identity and actions fall below the fold.
- Mobile global chrome overflows horizontally and bottom navigation overlaps page content.
- Search results explain cameo matches, but cameo labels and price/sign-in affordances compete too strongly with card identity and ownership.

Recommended implementation order:

1. `DESIGN_SYSTEM_TIGHTENING_V1`
2. `INTERACTION_HIERARCHY_V1`
3. `MOBILE_PARITY_POLISH_V1`
4. `CARD_DETAIL_POLISH_V1`
5. `SEARCH_RESULTS_POLISH_V1`
6. `SET_AND_DEX_POLISH_V1`

## Findings

| ID | Surface | Classification | Severity | Evidence | Finding | Recommended Lane |
| --- | --- | --- | --- | --- | --- | --- |
| PPV1-001 | Search / Explore | visual-system | P1 | `01_explore_charizard_cameo_desktop.png` | Dark-mode active controls have weak contrast. The active nav pill, view-mode segmented control, and search button read as pale controls with low state clarity. | `DESIGN_SYSTEM_TIGHTENING_V1` |
| PPV1-002 | Card detail | visual-system | P0 | `02_card_detail_pikachu_svp101_desktop.png` | Card identity panel mixes a light surface with dark-mode text treatment, making the title and metadata nearly unreadable. | `DESIGN_SYSTEM_TIGHTENING_V1` |
| PPV1-003 | Card detail mobile | hierarchy | P0 | `09_card_detail_mobile.png` | The card image is horizontally clipped and consumes the first viewport. Card identity, selected finish, and ownership are pushed below the fold. | `CARD_DETAIL_POLISH_V1` |
| PPV1-004 | Global mobile chrome | interaction | P0 | `08_explore_charizard_cameo_mobile.png`, `10_dex_pikachu_mobile.png` | Top navigation actions overflow on mobile. Some actions are partially visible or offscreen. | `MOBILE_PARITY_POLISH_V1` |
| PPV1-005 | Global mobile chrome | interaction | P1 | `08_explore_charizard_cameo_mobile.png`, `09_card_detail_mobile.png`, `10_dex_pikachu_mobile.png` | Bottom navigation overlaps content or lacks enough safe-area spacing, especially on dense card/detail pages. | `MOBILE_PARITY_POLISH_V1` |
| PPV1-006 | Search / Explore | hierarchy | P1 | `01_explore_charizard_cameo_desktop.png` | Repeated `Grookai Value` and `Sign in to reveal` copy competes with card identity and match context on every result card. Price should be quieter than ownership and identity. | `INTERACTION_HIERARCHY_V1` |
| PPV1-007 | Search / Explore | hierarchy | P2 | `01_explore_charizard_cameo_desktop.png` | Cameo context is duplicated as both subtitle and chip. It is useful, but currently louder than it needs to be for secondary search context. | `SEARCH_RESULTS_POLISH_V1` |
| PPV1-008 | Search / Explore | trust/data clarity | P2 | `01_explore_charizard_cameo_desktop.png` | The `Refined match` explanatory block is helpful but low-contrast in dark mode and not visually connected to result grouping. | `SEARCH_RESULTS_POLISH_V1` |
| PPV1-009 | Set page | interaction | P1 | `03_set_sv8pt5_desktop.png` | The page states `Showing 36 of 194 cards`, but no visible next/load-more affordance appears in the captured viewport. | `SET_AND_DEX_POLISH_V1` |
| PPV1-010 | Set page | visual-system | P2 | `03_set_sv8pt5_desktop.png` | Finish chips are valuable, but repeated chips on every tile create density. Active chip state is not calibrated for dark mode and can read too bright or too subtle. | `DESIGN_SYSTEM_TIGHTENING_V1` |
| PPV1-011 | Set page | hierarchy | P2 | `03_set_sv8pt5_desktop.png` | Repeated `Compare` buttons are visually prominent on every card tile and can compete with card identity and finish selection. | `INTERACTION_HIERARCHY_V1` |
| PPV1-012 | Dex list | hierarchy | P2 | `04_dex_list_desktop.png` | The Dex list is functional, but it reads as a dense table. Species identity is clear, yet the experience feels more administrative than collectible. | `SET_AND_DEX_POLISH_V1` |
| PPV1-013 | Dex detail | hierarchy | P2 | `05_dex_pikachu_desktop.png` | Progress panels are strong, but card identity competes with counters, variant options, and repeated action links in each row. | `SET_AND_DEX_POLISH_V1` |
| PPV1-014 | Dex detail mobile | interaction | P1 | `10_dex_pikachu_mobile.png` | The mobile Dex detail layout is clipped horizontally. Main content extends beyond the viewport, and bottom nav covers the lower content area. | `MOBILE_PARITY_POLISH_V1` |
| PPV1-015 | Empty search | interaction | P2 | `07_empty_search_desktop.png` | Empty search is clear but flat. It lacks fast recovery actions such as browse sets, sample searches, or set-code examples. | `SEARCH_RESULTS_POLISH_V1` |
| PPV1-016 | Empty/loading/fallback states | perceived-speed | P2 | `07_empty_search_desktop.png` | Loading and skeleton behavior was not proven in this pass. Perceived-speed polish needs explicit capture for search, set, Dex, and card pages. | `DESIGN_SYSTEM_TIGHTENING_V1` |
| PPV1-017 | Card detail | hierarchy | P1 | `02_card_detail_pikachu_svp101_desktop.png` | Price appears as a prominent right-side module above the collector ownership flow. Hierarchy says ownership should be clearer than price. | `INTERACTION_HIERARCHY_V1` |
| PPV1-018 | Card detail | trust/data clarity | P2 | `02_card_detail_pikachu_svp101_desktop.png` | `Using base image` is important but visually loud relative to selected version. It should be visible without becoming the dominant diagnostic. | `CARD_DETAIL_POLISH_V1` |
| PPV1-019 | Vault | trust/data clarity | P2 | `06_vault_desktop.png` | Authenticated Vault could not be fully audited from the captured production session. The unauthenticated sign-in state is clean, but copy and disabled button contrast should be checked in dark mode. | `MOBILE_PARITY_POLISH_V1` |
| PPV1-020 | Global dark mode | visual-system | P0 | all dark-mode screenshots | Dark mode appears implemented as a broad layer rather than a fully tokenized surface system. Mixed islands, low contrast, and over-bright active states are recurring. | `DESIGN_SYSTEM_TIGHTENING_V1` |

## Surface Notes

### Search / Explore

Search is the closest to a strong V1 product surface because it now explains cameo discovery and supports card identity search. The main refinement is hierarchy: identity should be the card name, set, number, and image; cameo should explain the match; pricing should not repeat loudly across every card when the user is not signed in.

Recommended first pass:

- Reduce repeated price/login copy into a quieter secondary row.
- Render cameo as one compact matched-reason line, not both a subtitle and a badge.
- Add grouping or clearer result-mode language when a query is cameo-driven.
- Improve dark-mode contrast for search controls and explanatory blocks.

### Card Detail

Card detail needs the most urgent polish. The selected finish model is correct, but the page does not yet feel like the selected finish is a distinct collectible object. On desktop the content hierarchy is muddied by dark-mode surface mismatch and price prominence. On mobile the first viewport is dominated by a clipped image.

Recommended first pass:

- Fix dark-mode card detail surfaces before changing layout.
- Put selected version near title and image.
- Move ownership state before price in visual hierarchy.
- Keep image fallback diagnostics quieter.
- Constrain mobile image with stable aspect-ratio and max dimensions.

### Set Page

The set page has strong card data and useful finish chips, but repeated chips and repeated `Compare` actions make each tile busy. Pagination/load-more needs to be visually obvious because the user sees `Showing 36 of 194 cards`.

Recommended first pass:

- Add visible load-more/pagination control in the normal scroll path.
- Normalize finish chip active/inactive states across light and dark mode.
- Make compare less visually dominant until selected.
- Preserve card image/name/number as the tile anchor.

### Grookai Dex

The Dex is valuable and data-rich. It now needs a more collectible presentation layer on top of the table-like foundation. The desktop list is clear but administrative; the mobile detail view has viewport clipping.

Recommended first pass:

- Keep parent-print denominator unchanged.
- Improve mobile containment and safe-area spacing.
- Treat species identity and progress as primary, variant options as secondary.
- Replace vague `Find card` repetition with clearer row-level action language.

### Vault

Only unauthenticated Vault state was captured. The sign-in panel is structurally sound, but authenticated Vault remains a required manual smoke target for finish-specific ownership labels.

Recommended first pass:

- Capture authenticated Vault, exact copy page, and finish-specific owned copy states.
- Confirm `Finish not selected` legacy rows remain understandable.
- Verify dark-mode disabled sign-in button contrast.

### Empty, Loading, Fallback

Empty search is understandable but not premium. It needs recovery actions. Loading and skeleton states were not captured in this pass, so they should be audited before final polish is called complete.

Recommended first pass:

- Add suggested searches and browse actions to empty search.
- Capture loading states for search, set, Dex, and card detail.
- Ensure fallback diagnostics are secondary and consistent.

## Implementation Plan

### 1. DESIGN_SYSTEM_TIGHTENING_V1

Goal: fix the visual system before moving components around.

Scope:

- Tokenize dark-mode surfaces, text, borders, chips, buttons, panels, and disabled controls.
- Fix active-state contrast in nav, search, segmented controls, and finish chips.
- Create density rules for cards, tables, badges, and diagnostics.
- Define skeleton/loading/empty-state primitives.

Exit proof:

- No unreadable dark-mode panels.
- Active controls pass visual inspection in desktop and mobile.
- Empty/loading/fallback states are captured.

### 2. INTERACTION_HIERARCHY_V1

Goal: make hierarchy enforceable across surfaces.

Priority order:

1. Card identity
2. Selected finish / variant
3. Ownership state
4. Primary interaction / action
5. Price
6. Cameo or search context
7. Metadata
8. Secondary diagnostics

Exit proof:

- Price never visually outranks ownership on card/detail/tile surfaces.
- Cameo never visually outranks card identity.
- Selected finish is clear without reading diagnostics.

### 3. MOBILE_PARITY_POLISH_V1

Goal: make mobile feel intentionally designed, not compressed desktop.

Scope:

- Fix mobile header overflow.
- Fix bottom navigation safe-area and page padding.
- Fix card detail image clipping.
- Verify Dex and search do not horizontally overflow.

Exit proof:

- Search, card detail, Dex detail, and set page fit a 390px viewport without clipped primary content.

### 4. CARD_DETAIL_POLISH_V1

Goal: make selected child printings feel like distinct collectible objects.

Scope:

- Selected version near title/image.
- Ownership before price.
- Quieter image fallback state.
- Stable action panel.

Exit proof:

- Parent route remains canonical.
- `/card/<printing_gv_id>` remains disabled.
- Selected finish context is obvious.

### 5. SEARCH_RESULTS_POLISH_V1

Goal: make search feel explainable and refined.

Scope:

- Matched reason treatment for cameo/finish/identity.
- Quieter price/login repetition.
- Empty search recovery actions.
- Result grouping or query-mode clarity.

Exit proof:

- Identity queries still feel primary.
- Cameo queries are understandable but secondary.
- Empty search gives useful next actions.

### 6. SET_AND_DEX_POLISH_V1

Goal: improve dense collector workflows without changing counts.

Scope:

- Set pagination/load-more affordance.
- Finish chip density and state treatment.
- Dex table/card hybrid polish.
- Clearer row actions.

Exit proof:

- Species Dex denominator remains parent-print based.
- Master-set options remain separate from parent progress.
- Dense rows remain scannable.

## Verification Checklist For Future UI Work

- Production desktop screenshots for Search, Card, Set, Dex, Vault.
- Production mobile screenshots for Search, Card, Dex, Set.
- Authenticated Vault smoke with finish-specific copies.
- `/card/<printing_gv_id>` remains not found unless a future lane explicitly changes route policy.
- Cameo result labels remain secondary to card identity.
- Ownership state is visually clearer than price.
- No DB writes, migrations, scanner changes, pricing changes, or Species Dex denominator changes in polish-only lanes.

## Classification Summary

- `hierarchy`: 7 findings
- `visual-system`: 5 findings
- `interaction`: 5 findings
- `trust/data clarity`: 3 findings
- `perceived-speed`: 1 finding

## Status

Classification: audit complete, implementation not started.

Recommended next action: begin `DESIGN_SYSTEM_TIGHTENING_V1` with dark-mode token fixes and mobile containment guardrails before any component-level redesign.
