# Selling Reports Visual Convergence — 2026-11-13

## Completed

- Event report surfaces use the shared Winter interaction accent, ink/bone
  surface tokens, semantic market emphasis for qualified profit, and semantic
  warning/error treatment.
- Event metrics use 9px grid gaps; cards and working panels use 8px corners.
- The private known-cost profit panel now uses the shared Sales Desk component
  styling instead of one-off Tailwind surface classes. Its calculations,
  history source, coverage caveats, and filter scope are unchanged.
- Pending event requests retain a clear market-colored edge so an unresolved
  save is visibly distinct from a completed action.
- Sales reports now provide clear return links to the Store workspace and Sales
  Desk, alongside Receipts & customers. The Sales Desk route background now uses
  the shared page surface token instead of a hard-coded green.

## Verification

- `git diff --check` passes.
- Repository shipcheck and hosted gates for this follow-up change remain
  pending.
- No real-account event mutation or physical Samsung rendering is claimed.

## Source

- `apps/web/src/components/sales/EventReports.module.css`
- `apps/web/src/components/sales/SalesReports.tsx`
- `apps/web/src/components/sales/SalesDesk.module.css`
- `apps/web/src/components/sales/SalesProfitPanel.tsx`
- `apps/web/src/app/account/store/sales/page.tsx`

Scanner implementation remains deferred at the owner's direction.
