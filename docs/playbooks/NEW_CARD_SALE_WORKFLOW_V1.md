# New card to Square checkout

The normal collection action adds reviewed exact copies privately. In the native
single raw-card review, **Add and set sale price** saves that same private copy
through reviewed intake, then opens its sale editor. Canceling the sale editor
leaves the saved copy in the Vault. It never repeats inventory creation.
On the website, the successful add offers **Set sale price** for the saved GVVI.
Multiple copies retain separate GVVI links and are priced individually.

The exact-copy page provides a short sale form. Enter a positive USD amount with
at most two decimal places and explicitly choose **Make public and For sale**.
The existing exact-copy owner writer saves sale intent and price together; private
pricing edits remain private. Existing profile/sharing permissions still apply.
No profile setting, printing identity, acquisition cost or other copy is changed.
The quick price editor omits listing-note updates, preserving a newer note even
when the form was opened before another device changed it.

The seller connects Square and enables automatic inclusion/stock once under
Account → Square. Each subsequent eligible offer goes through the existing
fenced catalog and stock worker. No manual Square item entry or alternate QR is
needed. The grookai `/q/{GVVI}` destination remains stable as price changes.

**Ready to scan in Square** requires that worker's confirmed result. A pending
or review result keeps the successful Vault save visible and provides the Square
status route. A transport failure is uncertain, not a failed inventory add; open
the same copy and check its saved state before retrying. Reconciliation retains
existing requests and provider operation keys. Never invent a replacement copy
or replenish sold inventory as recovery.

## Verification

- `node --test tests/contracts/new_copy_sale_action_v1.test.mjs` checks one
  combined owner-bound intent/price update, preserved private edits, invalid
  amounts/flags/currencies, foreign/archived owners, pending results and retries.
- `flutter test --no-pub test/intake/vault_copy_sale_sheet_test.dart
  test/intake/vault_add_review_sheet_test.dart --exclude-tags golden` checks
  mobile fit, duplicate submits, preserved input, errors, QR and pending status.
- Existing reviewed-intake tests cover the durable batch commit/lost-response
  boundary; existing Square tests cover allocation, conflicts, provider receipts,
  stock, artwork and paid-sale reconciliation. Keep both normal release gates.
- Visually check desktop and narrow web layouts, keyboard/error focus, bundled
  typography and Winter themes, then the upgraded Samsung package without
  clearing application data. Test an actual owned new card only when its physical
  identity, condition and price are supplied by the owner. Do not fabricate
  inventory or a payment to produce a successful live receipt.

This client workflow changes no schema, canonical identity, Square operation
semantics, payment authority, or recovery schedule. Bind final source, hosting
deployment, installed build and distinct live/local evidence in the private
operator release checkpoint.

Visual acceptance: the transport-safe client action wrapper removes a 12px form
gap in the canonical mobile/desktop Card Detail fixtures. The two resulting
screenshots were inspected against the prior references and retained from the
hosted canonical runner before updating those references. All 160 functional
and accessibility cases passed in that run; the screenshot comparison tolerance
and assertions remain unchanged. The native reference change is the visible
48px **Add and set sale price** action, inspected in both Windows themes.
