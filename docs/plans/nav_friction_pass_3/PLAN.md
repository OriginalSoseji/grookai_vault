# Navigation Friction Pass 3

Status: implemented
Branch: chore/nav-friction-pass-3
Base: main @ 68a28200

## Objective

Apply the reversible-action pattern to exact-copy Wall section removal:

> Removing an exact copy from a section should complete immediately and offer
> Undo. It should not strand users in a one-way public-visibility action when
> the app already has a precise restore path.

## Scope

### 1. Exact Copy Page Section Removal

File: `lib/screens/vault/vault_gvvi_screen.dart`

Target behavior:

- Tapping an assigned section still removes that exact copy from the section.
- The local membership state updates immediately.
- A 5-second snackbar appears with `Undo`.
- Undo calls `VaultGvviService.assignSectionMembership(...)` with the same
  `vault_item_instances.id` and `wall_sections.id`, restoring the same exact
  copy to the same section.

### 2. Manage Card Copy Rows

File: `lib/screens/vault/vault_manage_card_screen.dart`

Target behavior:

- Per-copy section removal gets the same 5-second `Undo` snackbar.
- Bulk selected-copy section removal gets the same 5-second `Undo` snackbar.
- Undo restores the same selected exact-copy instance ids to the same section.

## Explicit Non-Goals

- No schema changes.
- No RPC changes.
- No public Wall read-model changes.
- No changes to exact-copy archive/remove confirmation.
- No changes to add-to-section behavior.
- No changes to Search, Feed, Scanner, Pulse, Journey, pricing, identity, or
  notification behavior.

## Safety Notes

This pass uses only existing exact-copy membership APIs:

- `VaultGvviService.removeSectionMembership(...)`
- `VaultGvviService.assignSectionMembership(...)`
- `VaultCardService.removeCopySectionMembership(...)`
- `VaultCardService.assignCopySectionMembership(...)`
- `VaultCardService.bulkCopySectionMembership(...)`

Undo is precise: it restores the same exact-copy instance id to the same
section id. It does not recreate grouped card state or write compatibility
tables.

## Verification

Required checks:

- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Targeted test:

- Source-level regression coverage proving section removal now exposes
  `SnackBarAction(label: 'Undo')`, uses 5-second windows, and restores through
  the existing exact-copy section assignment APIs.

Manual/device checks:

- Exact Copy page: remove from section -> snackbar -> Undo restores chip.
- Manage Card copy row: remove section -> snackbar -> Undo restores chip.
- Manage Card bulk action: remove selected copies from section -> snackbar ->
  Undo restores selected copy memberships.

## Rollback

Rollback is code-only:

- Remove the snackbar action helpers.
- Restore the previous status-only section removal messages.

No database rollback is needed.
