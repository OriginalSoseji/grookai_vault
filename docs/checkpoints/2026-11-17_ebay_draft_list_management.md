# eBay Draft List Management — 2026-11-17

## Outcome

Added a direct remove action to each editable or review-ready draft in the
native eBay drafts list. The action asks for confirmation, names the selected
draft, and explains that it removes the draft from the grookai list without
deleting anything from eBay or removing the owned Vault copy.

The list also tells collectors to open a draft to review its saved photos,
price, condition, and status before deciding what to do with it.

Removal uses the existing authenticated, owner-bound, revision-checked
`abandon` operation. Abandoned rows leave the active list while server audit
history is retained. Live, publishing, preparing, sold, and uncertain listings
do not show the list removal control. Empty lists now explain how to start from
an exact Vault copy.

## Source

- `lib/screens/ebay/ebay_seller_screen.dart`
- `lib/services/ebay/ebay_seller_controller.dart`
- `test/ebay/ebay_seller_screen_test.dart`

## Verification

- `flutter test test/ebay/ebay_seller_screen_test.dart --no-pub --concurrency=1` — passed, 17 tests.
- `dart format` — passed.
- Web typecheck and strict build now run with a shared isolated local preview
  environment pinned to `http://127.0.0.1:54321`, with release activation,
  Vercel targeting, service-role/database credentials, and provider secrets
  removed from the child process. The production build guard is unchanged.
- The local build environment contract passed three focused tests, web
  `typecheck` passed, and `web:build:strict` passed. Full commit shipcheck is
  still pending for this checkpoint.
- `git diff --cached --check` — passed.

## Data and publication

This change does not delete draft records, call eBay, publish listings, modify
Vault copies, or change the database schema. No production account or listing
was changed.
