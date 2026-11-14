# Non-Scanner App Refinement — 2026-11-13

## Completed in the isolated current-main checkout

- Vault mobile Grid mode now persists 2/3/4-column density; web filters and sort
  match the native price and name/quantity choices and retain state in the URL.
- eBay listing category selection now uses current provider suggestions and
  refreshes category-specific aspects and condition metadata. Market language
  distinguishes active-listing medians from sold results.
- Vault sort is applied inside each By Set group, preserving contiguous set
  sections through filtering and pagination.
- Existing collector workspaces retain exact-copy selection, qualified raw
  price coverage, private trade-draft recovery, agreed-value notes, and explicit
  sale/trade outcome review. The reviewed add flow preserves unknown cost and
  quantity/raw/slab choices.
- Scanner implementation remains deferred at the owner's direction.

## Verification

- Repository pre-commit shipcheck passed for both implementation commits:
  full contract suite, strict web production build, Flutter analysis, and all
  2,022 Flutter tests.
- Focused collector/eBay browser parity: 29/29 passed. This covered 384px and
  desktop market-link destinations, selection and draft restoration, reviewed
  add, provider-backed eBay category changes, draft recovery and publication
  safeguards, and responsive seller review.
- Vault grid/filter/sort/set-group parity: 5/5 passed, including unique set
  groups across all sort modes and pages, 384px overflow,
  2/3/4-column persistence, URL restoration, price filters and sort order.
- The mobile trade workspace capture shows selected exact copies, qualified
  raw-price coverage, agreed values and net value together without horizontal
  overflow.
- Hosted checks for PR #917 at `e90b6eb93` passed, including Vercel preview,
  Flutter tests and goldens, runtime protection, drift gate, Samsung visual and
  accessibility gates, browser audits, CodeQL, and all five CodeQL language
  analyses. The preview is live at
  `https://grookai-vault-git-codex-ebay-category-s-b1eab1-sosejis-projects.vercel.app`.

## Live-device boundary

The available Duet Display window mirrors the workstation's VS Code screen; it
does not expose the Samsung display. Therefore this checkpoint does not claim
live Samsung verification of these new Vault web controls or the full
non-scanner collector journey. The previously recorded build-511 live marketplace
checks remain valid for that historical build only. Recheck the integrated
candidate on Samsung when its display is available. Scanner work remains a
separate deferred item.

## Source

- `f573ff41f` — `feat(ebay): allow provider-backed category selection`
- `6b2510715` — `feat(vault): add mobile grid sizing and browse controls`
- `e90b6eb93` — `fix(vault): preserve By Set groups when sorting`
- Earlier step details: [eBay category checkpoint](EBAY_CATEGORY_AND_MARKET_LABEL_20261113.md),
  [Vault mobile density checkpoint](VAULT_MOBILE_GRID_DENSITY_20261113.md), and
  [Vault filter/sort checkpoint](VAULT_WEB_FILTER_SORT_20261113.md).
