# Product Workspaces V1

Status: Active implementation contract; local candidate, not a released overhaul.

## Scope and authority

One account can collect and sell. Choosing a workspace changes navigation, not
identity, ownership, access, pricing authority, publication, or payment state.
Use the current Vault/GVVI, Store, Sales Desk, receipt book and existing writers.
This change adds no database schema, second inventory, cart ledger or payment provider.

The initial vendor destinations are Desk, Inventory, Scan, Reports and Store.
Collector navigation remains available through the workspace switch. The broader
collector redesign and scan handoff are subsequent work, not completed by this slice.

## Native lifecycle

- Destinations mount on first visit and retain their state during tab changes.
- Returning to Inventory refreshes its read model only when price edits and writes
  are settled. Search and expansion state remain local to the retained screen.
- Returning to Desk refreshes inventory without replacing the negotiated cart or
  held-deal journal. Copies no longer returned by the stock read leave the stock
  browser; the existing writer still validates any copy retained in the deal.
- Reports read the authenticated receipt book without loading an editable draft.
  They refresh on return and reject late responses after account changes.
- Workspace exit coordinates Inventory autosaves and the existing Desk draft
  flush/leave behavior. Invalid prices and active inventory writes prevent exit.
- Account changes dispose retained private screens and dismiss child routes.
- Scan uses the existing camera scan entry. Dedicated Desk keyboard QR input uses
  Sales Scanner V1. Leaving a retained Desk or opening the camera cancels earlier
  keyboard lookups; revisiting never revives those results. Opening Scan is not
  evidence of a completed transaction.

## Inventory presentation

Compact rows identify one physical copy. They show name, set/number/printing,
condition or slab grade, asking price, available exact market reference, Wall
status and GVVI. Opening a row exposes its existing controls and evidence.
Collapsing it does not cancel an already requested autosave. Existing confirmation,
printing, currency, publication and archive/disposition boundaries still apply.

## Web routing

| Destination | Existing or new route |
|---|---|
| Desk | `/account/store/sales` |
| Inventory | `/account/store?view=inventory` |
| Scan | `/scan` |
| Reports | `/account/store/reports` |
| Store | `/account/store` |

The signed-in header exposes the vendor entry. Vendor routes replace the collector
mobile dock and desktop navigation with vendor destinations; existing URLs remain
valid. The vendor route layout owns its mobile dock independently of collector
shell suppression, and hides it while the software keyboard is visible.
Inventory opens the current Store inventory editor and retains its access
requirements. This web inventory route is not yet equivalent to the native
owner-only inventory surface for accounts without a store.

Reports require server authentication, use private uncached receipt reads and
clear on account change. Link navigation from Desk waits for queued local journal
writes. Failed queued writes keep the page open with an error. Document exits while
writes are pending use the browser's unload guard. Accepted local journal writes
finish across SPA history transitions. A returning Desk waits for that owner's
queued writes before reading the journal. Owner changes and storage conflicts
still invalidate writes, including after the page unmounts. Failed saves block
ordinary links until retried; this is not a durable outbox for browser termination
or unavailable storage.

## Verification and release boundary

Synthetic widget/browser tests prove local UI behavior, not deployed authentication,
physical scanner pairing, transaction execution, or iOS acceptance. A local APK
compilation does not establish device success. Before releasing the complete daily
workflow, integrate current QR work and prove the designated deal, receipt and
interruption recovery on actual supported environments. Keep private test accounts,
credentials and release artifacts outside git.

Current evidence and remaining work: `docs/ops/PRODUCT_OVERHAUL_20261007.md`.
