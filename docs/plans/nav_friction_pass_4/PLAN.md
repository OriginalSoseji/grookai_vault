# Navigation Friction Pass 4

Status: implemented
Branch: chore/nav-friction-pass-4
Base: main @ 66962d4d

## Objective

Remove the remaining high-severity search-to-vault detour:

> A collector should be able to add an unowned search result to the vault from
> the result tile itself. Opening the action hub should remain available, but it
> should not be required for the default ownership action.

## Scope

### Search Result Tile Direct Add

File: `lib/main.dart`

Target behavior:

- Unowned search result tiles show a compact `Add` affordance.
- Tapping `Add` calls the existing `_addToVaultFromSearch(...)` path.
- The add still records the existing ownership/onboarding side effects through
  the same service path.
- A snackbar confirms the add and offers `View copy`, which opens the new
  `VaultGvviScreen`.
- Tapping the rest of the tile still opens the existing search action hub.
- Owned tiles do not show the direct `Add` affordance; they continue to show
  ownership state and use the existing hub/manage flows.

## Explicit Non-Goals

- No schema changes.
- No RPC changes.
- No pricing, identity, scanner, notification, Pulse, Journey, or Wall changes.
- No changes to Card Detail add behavior.
- No changes to Scanner V5 add behavior.
- No changes to Compare selection or Compare workspace routing.
- No changes to the search action hub except reusing its add path from the tile.

## Safety Notes

The implementation reuses existing app service behavior:

- `VaultCardService.addOrIncrementVaultItem(...)`
- `OnboardingLadderService.recordOwnedBestEffort(...)`
- `CardEngagementService.recordFeedEvent(...)`
- `_refreshCatalogOwnershipState(...)`

The direct tile action does not invent a second write path. It only removes the
extra tap required to reach the already-existing add action.

## Verification

Required checks:

- `git diff --check`
- `flutter analyze`
- `flutter test`
- `npm run shipcheck`

Targeted test:

- Source-level regression coverage proving Search tiles expose `_CatalogQuickAddButton`,
  route direct adds through `_quickAddSearchResultToVault(...)`, record the
  `search_result_tile` add surface, and preserve the existing action hub tap.

Manual/device checks:

- Search for a card not in the vault.
- Tap `Add` directly from a result tile.
- Verify no action sheet is required.
- Verify snackbar appears with `View copy`.
- Verify owned state appears after refresh.
- Tap card body and confirm the action hub still opens.

## Rollback

Rollback is code-only:

- Remove `_CatalogQuickAddButton`.
- Remove `_quickAddSearchResultToVault(...)`.
- Stop passing `onQuickAdd` / `isAdding` into result tiles.

No database rollback is needed.
