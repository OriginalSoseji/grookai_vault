# Vault Unassigned Add Repair V1

Date: September 16, 2026. Scope: native card detail and search Add to Vault.

## Cause

Samsung reproduced the printing-unavailable snackbar for anniversary Exeggcute.
Production read-only inventory confirmed 161 main-set and 30 Classic parents,
with zero child printings. The client rejected the add before calling the Edge
endpoint. Retrying the same empty catalog could never resolve this error.

## Repair

- Preserve canonical parents, child printings, prices, and existing ownership.
- Reuse the existing nullable `vault_item_instances.card_printing_id` contract.
- A successful empty governed lookup permits an explicit unassigned-copy choice.
- Cancel/dismiss performs no ownership write. Lookup failure is not empty success.
- Recheck governed options after confirmation. Newly available options require
  exact selection; an explicit printing cannot be combined with unassigned mode.
- Known finishes still use their exact child ID. Multiple finishes require choice.
- Unassigned copies have no fabricated finish, printing ID, or exact market value.
- No automatic reassignment when catalog reconciliation later adds printings.
- No migration, canonical mutation, pricing publication, or production test copies.

## Verification

Behavioral tests cover confirmation, cancellation, empty/failed/nonempty lookup,
conflicting selection, and request payload identity. Local database rollback
verification must prove the existing ownership writer accepts a null printing and
preserves it. Native smoke uses the connected Samsung; real collection additions
are left to the owner. Anniversary reconciliation resumes after repair verification.
