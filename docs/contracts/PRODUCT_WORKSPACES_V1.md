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
| Inventory | `/account/store/inventory` |
| Scan | `/scan` |
| Reports | `/account/store/reports` |
| Store | `/account/store` |

The signed-in header exposes the vendor entry. Vendor routes replace the collector
mobile dock and desktop navigation with vendor destinations; existing URLs remain
valid. The vendor route layout owns its mobile dock independently of collector
shell suppression, and hides it while the software keyboard is visible.
Inventory requires an authenticated owner, independently of storefront or new-sale
capability. The existing stock reader returns active exact card copies, with saved
asking currency, condition and intent. Search and priced/unpriced filters preserve
context when opening the existing copy editor and returning. Pagination deduplicates
only identical instance IDs, never distinct physical copies. Sealed products reuse
the existing owner panel only when its existing rollout flag is enabled. The legacy
`/account/store?view=inventory` Store editor remains valid.

The vendor copy editor uses a compact identity header and places pricing before
secondary details on phones. The same pricing, publication, condition and disposition
authorities remain in effect. Changing an asking price never rewrites an existing
negotiated deal. Inventory aborts stale reads and clears private copies on account
change; refresh failures offer a retry of the failed page.

The copy editor keeps qualified exact-printing market evidence visible while an
asking price is edited. TCGPlayer Market, USD, observed date and publication date
are distinct from the owner's asking amount. Slabs, unsupported sources and
incomplete evidence do not receive a market value. Reference refreshes do not
replace an unsaved asking price. Existing pricing read/publication rules apply.

Unsaved pricing uses the existing form departure guard with copy-specific wording.
Ordinary links require an explicit discard; an in-progress save blocks those links.
Document exits use the browser guard. A successful save updates the local saved
baseline immediately, and changing copy identity remounts the editor. This guard
does not add durable draft storage or protect SPA browser-history transitions.

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
