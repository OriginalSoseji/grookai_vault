# Vault Web Filtering and Sorting — 2026-11-13

## Completed

- Added the native priced/unpriced collection filter to the web Vault.
- Added native-equivalent sort choices: newest, name A–Z, and quantity low–high.
- Filter and sort state is reflected in the URL, resets pagination to page 1, and restores correctly after reload.
- Kept the 2/3/4 mobile grid-size preference from the preceding Vault checkpoint.
- Updated the local Vault visual fixture with mixed priced and unpriced exact-copy evidence so the controls exercise both real paths.

## Verification

- Vault pagination, URL state, Samsung-width overflow, mobile 2/3/4 grid persistence, and price filter/sort reload parity: 4 passed.
- Web typecheck: passed.
- Web lint: passed.
- Strict web production build: passed (with the repository's existing Supabase dependency critical-dependency warning).
- No production collection writes or scanner behavior were involved.

## Remaining Vault work

- Review the complete scan-to-review-to-save route and live trade/sale flows against the Samsung app.
- Confirm everyday Vault quick actions and selection remain clear after live-device review.
- Scanner implementation is deferred per owner direction.
