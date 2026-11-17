# Selling Workspace Visual Convergence — 2026-11-13

## Completed

- Replaced the Sales Desk's bespoke green and mint colors with shared ink/bone
  surfaces, brand theme accents, and semantic success colors. Winter uses ice
  blue in dark mode and the accessible darker blue in light mode through the
  shared `--gv-primary` and `--gv-on-primary` bindings.
- Reduced working panel and control corners to the shared 8px geometry,
  preserved 10px artwork corners, and aligned the card grid to 9px gaps.
- Raised interactive controls to a 44px minimum target and reduced the page
  title to the compact hierarchy used across the app.
- Kept the inventory search, sale/trade selection, customer view, deal cart,
  transaction review, tax display, and recorded receipt workflows unchanged.

## Verification

- `git diff --check` passes.
- Source review confirms the sales stylesheet uses shared palette variables and
  no longer contains its previous green/mint surface palette.
- Repository pre-commit shipcheck and hosted checks for the follow-up commit
  remain pending.
- The sales desk requires an authenticated account. No live Samsung rendering
  or sales transaction is claimed in this checkpoint.

## Source

- `apps/web/src/components/sales/SalesDesk.module.css`

Scanner implementation remains deferred at the owner's direction.
