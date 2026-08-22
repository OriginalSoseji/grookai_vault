# Vendor Mode Workspace V1 Implementation And Samsung Proof

Date: 2026-08-18

## Authority

- Branch: `feature/gvvi-vendor-qr-v1`
- Implementation base SHA: `f326d5735e80d7843f56c013e7a1c7dbedd9fed0`
- Governing contract: `docs/contracts/VENDOR_MODE_WORKSPACE_V1.md`
- Device: Samsung SM-S908U, Android 16, serial `R5CT3291F6E`
- Test package: `com.grookai.vault.lockedacceptance`
- Test build: `1.0.0-locked-acceptance` (`297`)
- Production package `com.grookai.vault` remained installed and was not replaced.

## Implemented Workflow

Vendor Mode provides one exact-copy row per active owner GVVI with:

- canonical artwork, card name, set, number, and GVVI;
- inline exact-printing assignment bounded to child printings of that card;
- raw condition or slab grade;
- governed exact-printing MEE market evidence only;
- inline asking price and market delta;
- Wall visibility;
- custom-section assignment and section creation;
- swipe-to-remove with exact-copy confirmation and archival semantics;
- opposite-direction swipe to record an exact copy as sold or traded;
- sold details with realized price and optional buyer context;
- trade details with received items, optional counterparty, and optional cash
  received or cash paid;
- share and QR access gated by public sale readiness;
- search and operational filters.

No parent, sibling, finish, slab, stale-price, or condition-adjusted market
fallback was added.

## Database Boundary

Migration `20260817190000_vendor_mode_private_section_visibility_v1.sql` was
applied to the linked production project and recorded in migration history. It
prevents private `hold` instances from appearing through public section
membership while retaining the established public intents and grants.

Readback proved:

- the public section projection applies the intent boundary;
- anonymous and authenticated callers retain the intended execute grants;
- `PUBLIC` has no execute grant;
- emitted private rows: `0`.

The unrelated local MTG migration was not applied.

Migrations `20260818130000_vendor_mode_exact_copy_dispositions_v1.sql`,
`20260818131500_vendor_mode_disposition_append_only_grants_v1.sql`, and
`20260818133000_vendor_mode_transaction_details_v2.sql` were also applied and
recorded in migration history. Together they establish an append-only,
owner-readable disposition ledger and the authenticated
`vault_record_exact_instance_disposition_v2` RPC. The RPC locks one active
owned instance, snapshots its exact identity and prior asking-price context,
records either the realized sale or trade details, archives that exact instance
through the existing governed boundary, and verifies the result in the same
transaction.

Production readback proved:

- sold rows require a positive realized price;
- trade rows require received-item details;
- trade cash is explicitly `received` or `paid` and requires an amount;
- counterparty and transaction-detail fields are bounded;
- authenticated clients have owner-scoped `SELECT` only on the ledger;
- `service_role` has only `SELECT` and `INSERT` table grants;
- the V2 RPC is security-definer with `search_path = public`;
- the superseded V1 disposition RPC is absent;
- no disposition row was created by testing (`0` rows after device proof).

## Automated Verification

- `flutter analyze`: passed with no issues.
- Relevant Flutter suite: `82/82` passed.
- Targeted Vendor Mode widget suite: `3/3` passed.
- Relevant Node contract suite: `15/15` passed.
- `git diff --check`: passed.

The tests cover exact-copy mutation, deterministic market comparison, inline
printing assignment, same-parent printing validation, condition, Wall state,
sections, swipe archive confirmation, exact-RPC readback, sharing gates,
privacy projection, bidirectional swipe routing, required sold/trade details,
cash-received and cash-paid trade adjustments, append-only disposition
semantics, and compact mobile layout.

## Physical Samsung Proof

The isolated app started with the governed public mobile configuration and an
existing authenticated session. Device inspection proved:

- Pulse startup completed without a fatal or startup-configuration error;
- Wall loaded with self-hosted card artwork;
- the owner shortcut opened Vendor Mode;
- Vendor Mode loaded `943 exact copies`;
- card rows rendered artwork, identity, GVVI, Wall state, exact-printing
  control, condition, Market, My price, section, share, and QR controls;
- an unassigned Birthday Pikachu exposed a `Holo` child-printing option;
- no printing was selected during the device proof;
- search for `Charizard` returned `37` exact copies;
- section management displayed the existing custom sections without leaving
  the workspace;
- an end-to-start swipe opened a destructive confirmation naming the exact card
  and `GVVI-065CAB28-000386`;
- cancelling the confirmation returned to the unchanged `943 exact copies`
  list, and no archive RPC was invoked during the physical smoke;
- a start-to-end swipe revealed `Sold / Traded` and opened the transaction
  sheet without mutating the copy;
- the Sold view displayed optional `Buyer`, required `Sale price`, and a
  disabled `Record sold` command until required input is valid;
- the Traded view displayed optional `Traded with`, required
  `Received in trade`, and a cash-adjustment selector;
- the cash selector exposed `No cash`, `Cash received`, and `Cash paid`;
- the transaction sheet was dismissed without submission and production
  readback remained at `0` disposition rows;
- no Flutter fatal exception, unhandled exception, or RenderFlex overflow was
  present in the relevant device logs.

An automated tap selected the `Pikachu` section while the sheet was closing.
The original unchecked state had been captured, so the exact membership was
immediately removed. Production readback for `GVVI-065CAB28-000748` confirmed
`pikachu_membership_count = 0`. No price, printing, condition, or Wall state was
changed.

## Evidence Files

- `samsung_configured_launch.png`
- `samsung_wall.png`
- `samsung_vendor_mode.png`
- `samsung_vendor_mode_printing_selector.png`
- `samsung_vendor_mode_printing_options.png`
- `samsung_vendor_mode_search.png`
- `samsung_vendor_mode_sections.png`
- `samsung_vendor_mode_sections_restored.png`
- `samsung_vendor_mode_remove_before.png`
- `samsung_vendor_mode_remove_confirmation.png`
- `samsung_vendor_mode_remove_cancelled.png`
- `samsung_vendor_disposition_workspace.png`
- `samsung_vendor_disposition_sold_sheet.png`
- `samsung_vendor_disposition_trade_sheet.png`
- `samsung_vendor_disposition_cash_options.png`

## Remaining Product Gates

The V1 workspace is implemented and device-proven. The following remain
deliberately outside this contract: automatic repricing, bulk repricing,
condition-adjusted prices, Pulse price alerts, POS/tax/reporting, verified
counterparty identity and in-app ownership transfer from Vendor Mode, payments,
and one-confirmation camera intake.
