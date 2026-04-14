# VIEW YOUR COPY GVVI RESOLUTION V1

## Purpose
Make Explore's `View your copy` action land in exact copy reliably and deterministically.

## Current Problem
Owned cards can still fall back to `Manage Card`, which weakens the promise of `View your copy`.

## Audit Questions
- What exact source currently determines the active owned anchor?
- What wrapper/service currently returns copy rows?
- Under what conditions does a usable `gv_vi_id` fail to appear?
- Are there alternative exact-copy identifiers already available but not being used?
- Can the latest active owned exact-copy be selected deterministically from current mobile data?

## Observed Current Logic
- active vault anchor: `resolve_active_vault_anchor_v1`
- copy wrapper source: `vault_mobile_card_copies_v1` via `VaultCardService._loadManageCardCopies(...)`
- gvvi target selection: latest copy by `createdAt desc`, then `instanceId desc`, but only when a non-empty `gv_vi_id` is present
- current fallback condition: no deterministic GVVI surfaced by the mobile copies wrapper for the owned card

## Exact-Copy Identifier Inventory
- `gv_vi_id`
  - source: `vault_add_card_instance_v1` result
  - trustworthy for GVVI direct open? yes
  - notes: exact-copy destination id returned on fresh add
- `gv_vi_id`
  - source: `vault_mobile_card_copies_v1` rows mapped into `VaultManageCardCopy.gvviId`
  - trustworthy for GVVI direct open? yes
  - notes: strongest owned-copy path when mobile copies wrapper includes it
- `gv_vi_id`
  - source: `vault_mobile_collector_rows_v1`
  - trustworthy for GVVI direct open? yes
  - notes: row-level summary only exposes it when `owned_count = 1`
- `gv_vi_id`
  - source: `public_shared_card_primary_gvvi_v1`
  - trustworthy for GVVI direct open? yes
  - notes: strongest shared/public exact-copy identifier when the card is on wall
- `instanceId`
  - source: `vault_mobile_card_copies_v1` and `vault_mobile_instance_detail_v1`
  - trustworthy for GVVI direct open? no
  - notes: exact-copy archive target, but not a direct navigation id
- `legacy_vault_item_id`
  - source: `resolve_active_vault_anchor_v1`, `vault_mobile_instance_detail_v1`, `public_vault_instance_detail_v1`
  - trustworthy for GVVI direct open? no
  - notes: anchor/manage-card path and archive-one fallback
- `card_print_id`
  - source: `vault_owned_counts_v1`, `resolve_active_vault_anchor_v1`, `vault_mobile_instance_detail_v1`
  - trustworthy for GVVI direct open? no
  - notes: ownership grouping key, not an exact-copy destination

## Failure Classification
- classification: D. mobile truly cannot derive exact copy from current data
- proof:
  - `vault_item_instances` is not a safe direct mobile read path here because the checked-in migration enables service-role-only RLS on the table.
  - The known legacy fallback card remained dependent on wrapper data, and `View your copy` only became direct when a current exact-copy GVVI was provable through mobile wrappers.
  - `vault_mobile_collector_rows_v1` intentionally nulls `gv_vi_id` when `owned_count > 1`, so a multi-copy legacy card can still lack a deterministic exact-copy id in mobile summary data.
- implication:
  - direct GVVI open is now preferred whenever any current mobile wrapper proves a GVVI
  - `Manage Card` remains the honest fallback only for unresolved legacy/multi-copy cases where mobile data still cannot prove which exact copy to open

## Shared Ownership Resolution Contract
- view target rule:
  - resolve active vault anchor
  - prefer latest copy from `vault_mobile_card_copies_v1`
  - else use collector summary `gv_vi_id` when available
  - else use shared-primary `gv_vi_id` when available
  - else fall back to `Manage Card`
- remove target rule:
  - use the same exact-copy resolution ladder first
  - archive the resolved exact instance when possible
  - otherwise archive one instance from the active vault anchor only
- why they stay aligned:
  - both actions now use the same deterministic ownership proof before touching navigation or removal, so the drawer does not promise one copy while mutating another
