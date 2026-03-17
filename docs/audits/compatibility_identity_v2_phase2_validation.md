# COMPATIBILITY IDENTITY V2 — PHASE 2 VALIDATION

## Files Touched

- `apps/web/src/components/vault/VaultCollectionView.tsx`

## Places Where `vault_item_id` Stopped Being Primary Identity

`apps/web/src/components/vault/VaultCollectionView.tsx`

- `renderVaultGrid(...)`
  - pending state now keys off `card_print_id` via `getVaultRowRuntimeKey(item)`
  - shared-controls expansion now keys off `card_print_id`
  - error rendering now keys off `card_print_id`
  - public-image pending keys now use `card_print_id:side`

- `applyOptimisticQuantityChange(...)`
  - row matching now uses `card_print_id`

- `reconcileQuantityResult(...)`
  - row matching/removal now uses `card_print_id`

- `applyOptimisticShareChange(...)`
  - row matching now uses `card_print_id`

- `applyOptimisticPublicNoteChange(...)`
  - row matching now uses `card_print_id`

- `applyOptimisticPublicImageChange(...)`
  - row matching now uses `card_print_id`

- `useEffect([initialItems])`
  - expanded shared-row continuity now persists by `card_print_id`
  - representative anchor changes alone should not collapse the row

- `handleQuantityChange(...)`
  - uses `vault_item_id` only to locate the row for the legacy action path
  - confirm-removal state is now stored by `card_print_id`

- `handleShareToggle(...)`
  - pending/expanded/error state now uses `card_print_id`

- `handleSharedControlsToggle(...)`
  - toggle state now uses `card_print_id`

- `handlePublicImageToggle(...)`
  - pending/error state now uses `card_print_id`

- `handleOpenPublicNote(...)`
  - modal identity now uses `card_print_id`

- `handleSavePublicNote(...)`
  - target row resolution now uses `card_print_id`
  - optimistic note updates now remain stable even if the representative anchor changes

## Places Where `vault_item_id` Is Still Intentionally Used

`apps/web/src/components/vault/VaultCollectionView.tsx`

- `changeVaultItemQuantityAction({ itemId, type })`
  - compatibility anchor passed into legacy quantity mutation path

- `rpc_set_item_condition`
  - `p_vault_item_id: item.vault_item_id`

- `toggleSharedCardAction({ itemId, gvViId, nextShared })`
  - representative anchor still passed for current shared-card seam

- `saveSharedCardPublicNoteAction({ itemId, gvViId, note })`
  - representative anchor still passed for current shared-card seam

`apps/web/src/components/vault/VaultCardTile.tsx`

- increment/decrement buttons still call `onQuantityChange(item.vault_item_id, ...)`
  - this is intentional in Phase 2 because mutation rewiring is Phase 3

## Manual UI Validation Checklist

- Open `/vault`
- Expand shared controls on a card row, refresh/reload, verify the same `card_print_id` row remains expanded when still pinned by the current flow
- Verify a mixed raw/slab card still renders as one row
- Verify slab badge and slab metadata still render for slab-aware rows
- Verify share toggle still works and the action receives a usable representative `vault_item_id`
- Verify public image toggle still works and uses a usable representative `vault_item_id`
- Verify public note modal opens/saves against the same visible card row
- Verify quantity increment/decrement still target the visible row through the representative anchor
- Verify no row disappears solely because the representative anchor changed
- Verify no duplicate visible row appears for the same `card_print_id`

## Phase 2 Boundary

- Web vault runtime identity is now card-based for local UI state.
- `vault_item_id` remains attached as a representative compatibility anchor.
- Mutation rewiring is deferred to Phase 3.
