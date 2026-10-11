# Bluetooth scan to cart — October 7, 2026

## Integrated overhaul candidate

`C:/gv_product_overhaul_20261007` integrates a hash-checked snapshot from the
original worktree below, whose files remain unchanged. It also invalidates native
retained-tab scans and transient disabled reads. The runtime script in this tree
is explicitly routed to the overhaul worktree and its external `scanner-runtime`
directory; it retains the same internal 430 lab and loopback port32980.

Current actual results belong to the [overhaul checkpoint](PRODUCT_OVERHAUL_20261007.md)
and its external evidence. No standalone scanner checkpoint was present when the
snapshot was taken; do not infer completed standalone tests from this document.

## Original isolated work

Isolated candidate `C:/gv_sales_scanner_20261007`, branch
`feature/sales-scanner-20261007`, starts at current main
`4f0af6c54b7e5c87f7e11a7314c5eb72b6596b0a` (PR606). Preserve live split
payments/TestFlight347 and all populated labs, archives and existing user carts.
The user explicitly deferred email/SMS sender setup in favor of this feature.

Read [the scanner contract](../contracts/SALES_SCANNER_V1.md). Pair the scanner
in the operating system, select keyboard/HID mode with Enter suffix, then use
Sales Desk → Scan cards. Scan Grookai exact-copy QR labels. Use Resume scanning
after editing a price or customer. Copies without a saved USD asking price
require explicit entry. Generic catalog/retail barcodes cannot identify a copy.

Focused Node parser, Flutter widget/service regression and local actual-auth web
verification target continuous input, saved price, duplicate/unknown/unpriced copies,
owner isolation, cancellation, archival and saved-cart recovery. The audited
script `scripts/audits/sales_scanner_runtime_v1.mjs` uses only the retained internal
430 lab on32841, loopback web32980, new synthetic owners/catalog fixtures and
blocked external browser requests. It restores flags and removes only its own
fixtures. Never reset this lab or rerun an old release intent. No real sale or
message is sent. Physical scanner pairing remains separate from keyboard proof.

Actual test/release status is recorded outside source in
`C:/grookai_vault_operator_artifacts/sales_scanner_20261007/CHECKPOINT.json`.
Local proof is not a website deployment or TestFlight release. No migration is
needed. Normal checks and web/native readback still govern release. Rollback
clients without deleting saved carts, inventory or receipts.
