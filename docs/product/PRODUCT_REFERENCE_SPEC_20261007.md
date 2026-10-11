# Product reference specification — October 7

Status: proposed visual direction and interaction specification. The six-screen
prototype uses sample data. It is separate from the first implemented workspace
slice and does not establish a production release.

## Shared visual rules

Keep one semantic component vocabulary across web and Flutter: workspace navigation,
page heading, exact-copy row, card artwork, amount with evidence, status label,
review sheet, current deal, receipt result, and empty/error/review state.

Use the existing 4/8/12/16/22/32 spacing scale. Controls have a 10-pixel radius;
surfaces use 16 pixels. Phone controls provide at least 44 pixels of usable height.
Use the platform system font. Body text is 14–16 pixels, secondary information
12–14, page headings 28–40. Text scaling must reflow rather than truncate identity
or transaction amounts. Secondary text must maintain 4.5:1 contrast on its actual
surface. Do not convey availability or incomplete cost through color alone.

The prototype explores forest `#173c2b`, warm page `#f4f5ef`, white surfaces,
lime `#d9efb7`, primary text `#172b23`, secondary text `#536257` and amber review
states. Existing native/web blue palettes remain in the first functional slice.
Adopt a final shared palette through the existing `GvPalette` and web `--gv-*`
tokens, with dark-mode and contrast validation; do not scatter literal overrides.

Phone navigation stays within thumb reach. A Desk action sits above the bottom
dock and safe-area inset. Desktop can show stock and the current deal side by
side. Tablet can stack them without changing the transaction workflow. Private
cost and notes never enter customer view.

## Screen and authority map

| Screen | Reuse | Proposed presentation or genuine gap |
|---|---|---|
| Vault | Web `/vault`, existing native Vault, current owned-copy projections | Clear collection value with coverage, compact next actions, collection cards. Historical returns require qualified snapshots and flow adjustment. |
| Explore / card research | `/explore`, `/card/[gv_id]`, `/card/[gv_id]/market`, existing native card detail and price references | Identity and exact printing first; source/date/limitations beside amounts; owned copies separate from catalog evidence. |
| Scan review | `/scan`, native `_startScanFlow`, existing scanner result and intake authorities | Confirm printing, condition and optional private cost. No asking price required for a private collection add. A deal needs an explicit supported amount. Camera identification and owned-copy label input remain distinct modes. |
| Desk | `/account/store/sales`, `SalesDeskScreen`, current draft journal, trade/payment and receipt authorities | Persistent working deal, deliberate customer view, reachable phone action. Integrate the separate keyboard QR candidate with cancellation on leaving a retained tab. |
| Inventory | Existing native vendor inventory; web `/account/store/inventory` | Compact physical-copy rows and contextual editor. The local follow-up removes Store setup from owner browsing, retains the existing price writer and restores search on return. Explicit listing in the prototype is proposed behavior; the native slice preserves existing publication rules. |
| Reports | `/account/store/reports`, `SalesReportsScreen`, existing receipt book and dashboard | Current implementation reports existing sales totals. Event expenses, cost-complete profit and reconciliation require later receipt-based economics work. |

Binders, Community and Store links in the prototype identify downstream work;
their detailed redesign is not represented as implemented. Price watching is
also proposed and creates no real alert.

## State and lifecycle requirements

- Distinguish loading, no results, no inventory, unsupported evidence, uncertain
  identity, failed save and incomplete cost. Give each a specific recovery action.
- Navigation never changes the account, ownership, public visibility or access.
- Preserve user edits while switching workspaces. Block departure when a requested
  save fails; show what must be retried. Browser Back requires its own proof.
- Account changes clear private views and reject late asynchronous responses.
- A retained Desk must cancel pending scanner lookups when hidden. Returning to
  it must not revive an earlier lookup or steal keyboard focus.
- Refreshing market evidence or stock never rewrites a negotiated amount.
- Missing cost is unknown, not zero. Show cost coverage beside any partial margin.
- Retry uncertain sale completion through the existing request/receipt recovery
  path. Never create another sale to make a screen appear successful.

## Evidence and acceptance

The local prototype is served at `http://127.0.0.1:32992`. Its source, screenshots,
flow verification and automated accessibility results are under the external
`product_overhaul_20261007/prototype` artifact directory. Automated axe checks
reported zero violations on all six phone screens after contrast corrections.
This does not replace screen-reader, large-text or actual-device validation.

Before expanding the release, prove authenticated owner journeys, queued-edit
navigation including Back, exact-copy scanner cancellation, completion once,
receipt/inventory agreement and interruption recovery. Compare the same realistic
task with DeckTradr only after both implementations can be exercised on comparable
devices; do not claim an unmeasured speed advantage.
