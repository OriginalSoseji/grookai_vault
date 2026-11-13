# Vault Mobile Grid Density — 2026-11-13

## Completed

- Web Vault mobile Grid mode now offers 2, 3, or 4 card columns, matching the native app's existing grid-size choices.
- The chosen mobile column count persists in local browser storage across route refreshes.
- The control appears only in Grid mode. Detail and Compact modes retain their current layouts.
- Mobile grid gaps now use the product contract's exact 9px spacing.

## Verification

- Samsung-sized (384px) web parity test confirms column changes to 3 and 4, CSS grid geometry, persistence after reload, hiding the control in Detail mode, restoring the saved setting in Grid mode, and no horizontal overflow.
- Vault pagination and state-in-URL web parity tests: 3 passed.
- Web typecheck: passed.
- Web lint on all changed Vault components, hook, and parity spec: passed.

## Follow-up completed

- The web Vault now also has native-equivalent sorting and priced/unpriced filtering; see `VAULT_WEB_FILTER_SORT_20261113.md`.
- Scanner remains deferred.
