# eBay Category Selection and Market Price Labels — 2026-11-13

## Completed

- Added an editable eBay category selector to the native seller flow and web seller workspace.
- Category choices now come from the current eBay taxonomy suggestions for the card. The selected category is checked against those suggestions and must expose a live `Game` aspect before trading-card listing preparation can continue.
- Changing categories reloads category-specific aspects and condition policy. Old category-specific aspects are cleared and the condition is refreshed from the new category metadata.
- Retained saved categories only while eBay continues to suggest them. If a saved category is no longer available, the current provider-supported default is selected and the seller is told to review it.
- Removed the backend's hard-coded `183454` category dependency.
- Changed numeric eBay Browse evidence labels to say active-listing median, keeping them distinct from sold comps. eBay sold-search links remain available.
- Recorded the current-category requirements in `EBAY_SELLER_PUBLISHER_V1.md`.

## Verification

- eBay category, seller condition, condition choices, review payload, and sold-price-label contract tests: 35 passed.
- Native eBay seller screen and controller tests: passed, including category switching and refreshed metadata.
- Flutter analyze on changed native files: no issues.
- Web eBay seller parity suite: 17 passed, including category selection and persistence after reload.
- Web lint: passed.
- Web typecheck: passed.

## Limits and next work

- This checkpoint verifies provider-backed category selection in tests; it does not claim a live Samsung account performed or published a listing.
- eBay sold-average values are still unavailable through the current app's public Browse integration. Active asking-price medians must not be described as sold averages; sold-results remain a user-opened eBay search.
- Scanner work is deferred per owner direction.
- Continue with the remaining non-scanner collector-journey refinement and eBay live-account verification when the device is available. Publishing remains a user-confirmed action.
