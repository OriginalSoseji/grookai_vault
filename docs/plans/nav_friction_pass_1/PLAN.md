# Navigation Friction Pass 1

Status: pending approval
Branch: chore/nav-friction-pass-1
Base: main @ 9ec0b85b

## Objective

Reduce one confirmed navigation/input detour in Vault and verify whether the Compare workspace entry is still hidden below the scrolling search results.

This pass has two parts:

- Part A: verify Compare entry placement only.
- Part B: remove the manual catalog-add quantity confirmation from the default one-copy Vault add path.

No schema, RPC, pricing, identity, scanner, notification, or backend behavior changes are in scope.

## Current Findings

### Part A: Compare Entry Placement

`lib/main.dart` renders `_buildCompareWorkspaceEntry(theme)` inside the search results `CustomScrollView` as a `SliverToBoxAdapter` after the Load more block:

- `_buildCompareWorkspaceEntry`: `lib/main.dart`
- Render placement: after search result sections and after Load more
- Current behavior implied by source: inline in the scrolling result list, not pinned above the bottom dock

Because the prompt asks for device verification first, Part A will not change code in this pass. The gate is to capture screenshots with one and two Compare-selected cards and report whether the entry is practically visible without scrolling.

If the screenshots confirm the entry is inline or hidden below Load more, the follow-up plan should convert it to a floating glass pill above the dock, using the existing Grookai glass-pill vocabulary and leaving Compare selection logic unchanged.

### Part B: Manual Catalog Add Detour

`lib/main_vault.dart` currently handles manual Vault add through `_showCatalogPickerAndInsert`.

Current flow:

1. User opens the catalog picker.
2. User picks a card.
3. App opens an `AlertDialog` titled `Add to Vault`.
4. Dialog defaults quantity to `1`.
5. User taps `Add`.
6. App calls `VaultCardService.addOrIncrementVaultItem(...)`.
7. Vault reloads.

The extra dialog asks the common-case user to confirm a value the app already knows: one copy. This conflicts with the established one-tap add pattern already used by Card Detail and Scanner V5.

## Approved Implementation Plan

Do this only after approval.

### Part A: Verify Compare Entry

1. Build/run the app on device.
2. In Search/Explore, select one card for Compare.
3. Capture screenshot showing whether the Compare workspace entry is visible without scrolling.
4. Select a second card for Compare.
5. Capture screenshot again.
6. Report whether the entry is:
   - pinned/floating above the dock, or
   - inline in the scroll list below result content/Load more.

No Part A code changes in this PR.

### Part B: One-Tap Catalog Add

Update `lib/main_vault.dart` in `_showCatalogPickerAndInsert`.

Remove:

- `TextEditingController(text: '1')`
- subtitle-only dialog prep that exists only for the confirmation UI
- the `AlertDialog`
- manual quantity parsing

Replace with:

1. After `picked` is returned and `_uid` is present, call `VaultCardService.addOrIncrementVaultItem` immediately with:
   - `deltaQty: 1`
   - `conditionLabel: 'NM'`
   - existing fallback name, set, and image values
2. `await reload()`.
3. Show a `SnackBar` confirming the add, with a `SnackBarAction` labeled `+1 more`.
4. If `+1 more` is tapped, call the same service again with `deltaQty: 1`, then reload again.

The snackbar should use the selected card display name in its message, for example:

`Added Pikachu to your vault.`

The `+1 more` action should be best-effort:

- It must use the same service path as the initial add.
- It should no-op if the widget has unmounted or the signed-in user is no longer available.
- Any failure should surface a visible snackbar/error rather than silently failing.

## Explicit Non-Goals

- Do not change existing plus/minus steppers on Vault tiles.
- Do not change Card Detail add behavior.
- Do not change Scanner V5 add behavior.
- Do not alter compare selection state, Compare routing, or Compare UI in Part A.
- Do not add schema/RPC/backend changes.
- Do not touch pricing or identity code.

## Tests And Verification

Required checks:

- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Manual/device evidence:

- Compare entry screenshot with 1 selected card.
- Compare entry screenshot with 2 selected cards.
- Catalog picker add screenshot/proof showing:
  - card is added immediately after pick,
  - no quantity dialog appears,
  - snackbar appears with `+1 more`.
- `+1 more` action proof showing quantity increments by one.

Targeted test coverage:

- Add a focused widget/source test if practical for `_showCatalogPickerAndInsert` behavior.
- If direct widget coverage is brittle because `_CatalogPicker` is modal/data-backed, add a source-level regression test asserting the quantity `AlertDialog` path has been removed and `SnackBarAction(label: '+1 more')` exists in `lib/main_vault.dart`.

## Rollback

Part A has no code changes.

For Part B, rollback is limited to restoring the previous quantity `AlertDialog` path in `_showCatalogPickerAndInsert`. There are no schema or data migrations to roll back.
