# Navigation Friction Pass 5

Status: implemented
Branch: chore/nav-friction-pass-5
Base: main @ f0d259e0

## Objective

Remove the remaining Vault-to-exact-copy detour:

> If a Vault row represents exactly one owned copy and already carries a
> `gv_vi_id`, tapping that row should open the exact-copy truth screen directly.
> Manage Card remains the destination for multi-copy rows and fallback cases.

## Scope

### Single-Copy Vault Row Routing

File: `lib/main_vault.dart`

Target behavior:

- `_openManageCardRow(...)` remains the one shared routing point for Vault list,
  grid, recent strip, and by-set previews.
- If `_ownedCountForRow(row) == 1` and `row['gv_vi_id']` is non-empty, push
  `VaultGvviScreen(gvviId: ...)`.
- If the row has multiple copies, no GVVI id, or missing required row anchors,
  keep the current `VaultManageCardScreen(...)` route.
- `VaultGvviScreen` already exposes the necessary single-copy owner controls:
  intent, public/share actions, wall/section assignment, slab upgrade, and
  Manage Card as an explicit route back.

## Explicit Non-Goals

- No schema changes.
- No RPC changes.
- No Vault row data-loading changes.
- No changes to Manage Card UI.
- No changes to exact-copy archive/remove behavior.
- No changes to Search, Feed, Scanner, Pulse, Journey, pricing, identity, or
  notification behavior.

## Safety Notes

This pass does not remove Manage Card. It only avoids forcing it as an
intermediate screen when the app already has a deterministic exact-copy id.

All existing Vault tap surfaces call `_openManageCardRow(...)`, so one branch
keeps the rule consistent across list tiles, grid tiles, recent items, and
grouped set previews.

## Verification

Required checks:

- `git diff --check`
- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Targeted test:

- Source-level route regression proving `_openManageCardRow(...)` checks
  `ownedCount == 1 && gvviId.isNotEmpty`, pushes `VaultGvviScreen`, returns,
  and keeps `VaultManageCardScreen` as fallback.

Manual/device checks:

- Vault single-copy row tap opens `VaultGvviScreen` in one tap.
- Vault multi-copy row tap still opens `VaultManageCardScreen`.
- Recent strip and grid tiles follow the same rule through the centralized
  handler.

## Rollback

Rollback is code-only:

- Remove the single-copy branch in `_openManageCardRow(...)`.

No database rollback is needed.
