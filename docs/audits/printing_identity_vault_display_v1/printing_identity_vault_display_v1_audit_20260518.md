# PRINTING_IDENTITY_VAULT_DISPLAY_V1 Audit

Date: 2026-05-18
Status: implemented

## Scope

This lane completes finish-specific ownership display in Vault read surfaces.

Allowed:

- read `vault_item_instances.card_printing_id`
- join child finish label from `card_printings` and `finish_keys`
- show finish label per raw copy
- show `Finish not selected` for legacy/null finish rows

Not allowed and not performed:

- DB writes
- migrations
- public child printing routes
- Species Dex denominator changes
- pricing changes
- scanner changes

## Implementation Summary

### Canonical Vault Grouped Read Model

File:

- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`

Changes:

- `vault_item_instances` active read now selects `card_printing_id`.
- The read model batches distinct `card_printing_id` values.
- Finish labels are resolved through `card_printings.finish_key` and `finish_keys.label`.
- `CanonicalVaultCollectorCopyItem` now carries:
  - `card_printing_id`
  - `finish_label`

This preserves parent `card_print_id` grouping and parent-compatible counts.

### Vault List / Manage UI

Files:

- `apps/web/src/components/vault/VaultCardPrimitives.tsx`
- `apps/web/src/components/vault/VaultCardTile.tsx`
- `apps/web/src/components/vault/VaultMobileViews.tsx`
- `apps/web/src/app/vault/card/[cardId]/page.tsx`
- `apps/web/src/lib/vault/getOwnerVaultItems.ts`

Changes:

- Shared copy formatter now renders raw copies as:

```text
<condition> • <finish label> • Raw
```

- Legacy/null rows render:

```text
<condition> • Finish not selected • Raw
```

- Existing desktop, mobile, and card-management copy lists inherit the finish label via the shared formatter.

### Exact Copy Pages

Files:

- `apps/web/src/lib/vault/getVaultInstanceByGvvi.ts`
- `apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx`
- `apps/web/src/lib/vault/getPublicVaultInstanceByGvvi.ts`
- `apps/web/src/app/gvvi/[gvvi_id]/page.tsx`

Changes:

- Owner exact-copy reads now select `card_printing_id`.
- Public exact-copy reads now select `card_printing_id` only for already-public exact copy surfaces.
- Exact-copy pages display:
  - resolved finish label for raw child-printing ownership
  - `Finish not selected` for legacy/null raw rows
  - `—` for slabs

No public child printing route was created.

## User-Facing Outcome

Collectors can now distinguish owned raw copies such as:

- Near Mint • Poké Ball • Raw
- Near Mint • Master Ball • Raw
- Lightly Played • Reverse Holo • Raw
- Near Mint • Finish not selected • Raw

This prevents independently owned child printings from appearing as unlabeled duplicate raw copies in Vault surfaces.

## Preservation Checks

- Vault grouping remains parent `card_print_id` based.
- Parent `card_prints.gv_id` route behavior is unchanged.
- Species Dex denominator is unchanged.
- Pricing reads are unchanged.
- Scanner code is untouched.
- No schema changes were introduced.
