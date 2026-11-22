# eBay Seller Connection Entry Checkpoint — 2026-11-22

## Observed state

- Samsung build 607 was unlocked and signed in to grookai.
- **Accounts → eBay seller account** opened the eBay listings screen.
- The screen showed no saved eBay drafts and did not show a seller connection
  status or **Connect eBay** action.
- The listing page hid its connection section whenever the workspace response
  omitted the `account` object. That left an unlinked account without a way to
  begin OAuth from the app.

## Source correction

- The seller connection section now remains visible when account status is
  absent, labels that status as unavailable, and provides an explicit
  **Connect eBay** action.
- Missing status permits only an explicit OAuth-start attempt through the
  authenticated seller endpoint. Server-side linking controls remain
  authoritative; a known disabled state still disables the button and explains
  why.
- Added the active
  [eBay Seller Connection Entry Contract V1](../contracts/EBAY_SELLER_CONNECTION_ENTRY_CONTRACT_V1.md)
  and regression coverage for missing and known-disabled status.

## Verification

- `flutter test --no-pub test/ebay/ebay_seller_screen_test.dart` — 20 tests
  passed.
- `flutter analyze --no-pub lib/screens/ebay/ebay_seller_screen.dart test/ebay/ebay_seller_screen_test.dart`
  — no issues.
- The correction is not yet installed on the Samsung. OAuth return, live
  seller status, and publishing remain to be verified on a build containing
  this change.

