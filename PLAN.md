# Grookai Vault App-Wide Simplification Plan

Source: `Grookai Vault - App-Wide Simplification - Master Plan - July 12, 2026`
Date audited: 2026-07-13
Branch audited: `fix/pricing-ingestion-nightly`
Head audited: `0f6d06f8`

## Current Status

Step 1(a) and the shared long-press quick-action sheet are implemented in this
working tree as of 2026-07-13.

The worktree was clean before this plan edit. Prior uncommitted work is parked
in `stash@{0}` (`cleanup dirty worktree before next step 20260713-112534`) and
must not be treated as shipped.

## Master Plan Progress

| Area | Current status |
| --- | --- |
| Nav dedupe | Complete in this branch, with user-facing Feed renamed to Pulse. |
| Single-copy vault routing | Complete: single-copy owner rows now open the unified ownership screen. |
| Card Ownership consolidation | Implemented for current owner routes. `VaultGvviScreen` remains in the tree for rollback/public-adjacent legacy references but is no longer used by the touched owner routes. |
| Vault delete undo | Present: low-risk vault delete uses `_deleteWithUndo`; high-risk delete still uses a dialog. |
| Collector Memory archive undo | Present: memory archive is delayed behind a 5-second undo snackbar. |
| Catalog manual-add friction | Present: `_showCatalogPickerAndInsert` inserts quantity 1 immediately and offers `+1 more`. |
| Search filter collapse | Mostly present: filters are behind one sheet with active count. Needs screenshot gate later. |
| Icon/label semantics | Complete: Wall uses collection/bookmark iconography, and Search no longer carries grid/@ shortcut buttons in its filter controls. |
| Card Detail action bar + sign-in | Complete: bottom actions are fixed, Compare is in top chrome, and signed-out Add to Vault/Want opens an intent-preserving sign-in sheet. |
| Dex pagination | Complete: Dex uses progressive `Load more` append instead of Previous/Next paging. |
| Jargon sweep | Complete for current Flutter visible copy in the audited surfaces; remaining matches are identifiers, comments, tests, or internal model names. |

## Step 1 Scope and Result

Step 1(a) is implemented. Step 1(b) and Step 1(c) were already present in this
checkout and are protected by focused tests.

### Step 1(a): Card Ownership Consolidation

Goal: `VaultManageCardScreen` becomes the single owner-facing ownership screen
for a card.

Result:

- Owner-facing Card Detail, Vault grid, Search, Public GVVI owner bridge, and
  Pulse copy routes now send owners to `VaultManageCardScreen`.
- `VaultManageCardScreen` can bootstrap from only `gvviId`, so single-copy
  routes no longer need `VaultGvviScreen`.
- The app bar title is the card name.
- Single-copy ownership renders the Overview content only; multi-copy ownership
  keeps Overview + Copies tabs.
- Card Detail ownership action copy is collapsed to `Add to Vault`,
  `Your copy`, and `Your copies (N)`.
- The shared quick-action sheet is wired to Vault grid long-press and Copies
  row long-press.

Required behavior:

- Title is the card name, not `Manage Card`.
- Single-copy cards render only the Overview content; no Copies tab and no copy
  picker. This preserves the existing "skip the picker when exactly one" rule,
  but the destination becomes the unified ownership screen.
- Multi-copy cards keep Overview + Copies tabs.
- Port owner-only Overview content from `VaultGvviScreen` into the unified
  Overview tab:
  - section membership
  - copy summary
  - details
  - danger zone
  - Collector Memory archive surface if still ownership-scoped
- Add a persistent `Add copy` row/action inside the unified ownership screen.
  Card Detail should no longer expose `Add copy` as a separate ownership state.
- Keep `PublicGvviScreen` as the public/non-owner exact-copy page.
- Keep `VaultGvviScreen` file intact but unreferenced for one release cycle as
  rollback. Delete only after a later cleanup confirms no owner route needs it.

Current owner-facing call sites that must be updated:

- `lib/card_detail_screen.dart`
  - `_openExactCopy()` routes owners to `VaultGvviScreen` and non-owners to
    `PublicGvviScreen`.
  - `_openManageCard()` routes to `VaultManageCardScreen`.
  - `_openResolvedOwnedCopy()` routes a resolved single owned copy to
    `VaultGvviScreen`.
  - add-to-vault success routes to `VaultGvviScreen`.
  - header nav cue label is still `Exact copy`.
  - `_buildActions()` still has four ownership states:
    `Add to Vault`, `View your copy`, `Add copy`, `Manage card`.
- `lib/main_vault.dart`
  - `_openManageCardRow()` routes rows with only `gvviId`, and rows with
    exactly one owned copy, to `VaultGvviScreen`.
  - multi-copy rows route to `VaultManageCardScreen`.
- `lib/main.dart`
  - search/add flows still route to `VaultGvviScreen` in several owned-copy
    paths and to `VaultManageCardScreen` in fallback/manage paths.
- `lib/screens/vault/vault_manage_card_screen.dart`
  - app bar title is `Manage Card`.
  - Copies tab rows open `VaultGvviScreen` through `_openExactCopy`.
  - current tab layout always builds Overview + Copies.
- `lib/screens/vault/vault_gvvi_screen.dart`
  - owner-facing screen title is `Exact Copy`.
  - contains the Overview content that must be ported.
  - still routes back into `VaultManageCardScreen`.
- `lib/screens/gvvi/public_gvvi_screen.dart`
  - keep public/non-owner behavior separate, but owner upgrade/manage buttons
    should route to the unified ownership screen.
- `lib/screens/network/network_screen.dart`
  - exact-copy opens route owners to `VaultGvviScreen` and non-owners to
    `PublicGvviScreen`; owner path must move to the unified screen.

OwnershipAction change:

- Collapse Card Detail ownership actions from four states to two visible owner
  labels:
  - `Add to Vault`
  - `Your copy` or `Your copies (N)`
- The owner action opens the unified ownership screen.
- `Add copy` moves into the unified screen as a persistent row/action.

### Step 1(b): Undo Snackbar Protection

Current state already matches the master plan:

- `lib/main_vault.dart` has `_deleteWithUndo` and keeps the irreversible delete
  dialog for high-risk cases.
- `lib/screens/vault/vault_gvvi_screen.dart` has delayed Collector Memory
  archive with an `Undo` snackbar.
- Exact-copy archive remains a confirm dialog, which is intentional because it
  is destructive.

Implementation work for this substep:

- Keep behavior unchanged.
- Add or keep focused tests proving low-risk vault delete and memory archive use
  undo while exact-copy archive still uses a dialog.

### Step 1(c): Catalog Manual-Add Friction

Current state already matches the master plan:

- `lib/main_vault.dart` `_showCatalogPickerAndInsert()` opens the catalog
  picker, adds the picked card at quantity 1, and shows a snackbar with
  `+1 more`.
- There is no quantity dialog in this flow.

Implementation work for this substep:

- Keep behavior unchanged.
- Add or keep a focused test around immediate add plus `+1 more`.

## Step 1 Tests

Run before considering Step 1 complete:

- `flutter analyze`
- `flutter test`
- Existing or new focused tests for:
  - Card Detail ownership action labels collapse to `Add to Vault` /
    `Your copy` / `Your copies (N)`.
  - Vault grid single-copy rows open the unified ownership screen.
  - Unified ownership screen hides Copies tab for one copy and shows it for
    multiple copies.
  - Copies-tab long-press behavior remains unchanged if not yet part of PR2.
  - Low-risk vault delete uses `Undo`; high-risk delete still uses dialog.
  - Collector Memory archive uses `Undo`.
  - Catalog manual add inserts quantity 1 and exposes `+1 more`.

## Step 1 Screenshots

Capture before/after screenshots for:

- Card Detail ownership action: not owned, one owned copy, multiple owned copies.
- Unified ownership screen: single-copy card.
- Unified ownership screen: multi-copy card with Copies tab.
- Vault grid single-copy tap route.
- Undo snackbar for low-risk vault delete.
- Catalog add snackbar with `+1 more`.

## Next Steps After Step 1

Step 2: icon/label semantics.

Result: complete in this branch.

- Wall tab uses collection/bookmark iconography instead of person/profile
  iconography.
- Sets remains in Explore/drawer navigation, not Search's filter row.
- Collector slug prompt remains an app-bar/public-collector affordance, not a
  Search filter-row shortcut.

Step 3: jargon sweep.

Result: complete for the audited Flutter surfaces.

- Replaced visible owner copy labels from `Exact copy`/`Manage Card`/`GVVI` to
  `Copy`, `Your copies`, and `Copy ID`.
- Kept identifiers, service names, comments, tests, and data-model terminology
  where changing them would create churn without changing user-visible copy.

Step 4: Card Detail action bar + sign-in.

Result: complete in this branch.

- Card Detail bottom actions stay fixed: ownership action, Memory/Sale when the
  owned-copy gates allow them, and Want.
- Compare is available from the top chrome instead of replacing a bottom action.
- Signed-out Add to Vault and Want no longer show post-tap snackbar dead ends.
  Both open a sign-in sheet that names the intended action, routes to
  `AccountScreen`, and retries the original action after the user returns
  signed in.

Step 5: Dex pagination.

Result: complete in this branch.

- Replaced page replacement controls with a single `Load more` action.
- Initial load and pull-to-refresh reset to page 1.
- Loading the next page appends species to the current Dex list, preserving the
  already-scrolled result set instead of forcing Previous/Next navigation.

## Verification

Passed:

- `flutter analyze`
- `flutter test`

Screenshots/device smoke captured on Samsung `SM S908U` (`R5CT3291F6E`) on
2026-07-13:

- `artifacts/screenshots/grookai_step_next_launch_env.png` - env-backed app
  launch smoke, signed-out login screen.
- `artifacts/screenshots/grookai_vault_home.png` - signed-in Vault grid.
- `artifacts/screenshots/grookai_vault_grid_quick_actions.png` - Vault grid
  long-press quick-action sheet.
- `artifacts/screenshots/grookai_unified_ownership_from_grid.png` -
  single-copy unified ownership screen.
- `artifacts/screenshots/grookai_unified_multi_overview.png` - multi-copy
  unified ownership Overview tab.
- `artifacts/screenshots/grookai_unified_multi_copies_tab.png` - multi-copy
  unified ownership Copies tab.
- `artifacts/screenshots/grookai_copies_row_quick_actions_2.png` - Copies-row
  long-press quick-action sheet.
- `artifacts/screenshots/grookai_dex_progressive_loaded.png` - Dex first page
  with `100 shown`.
- `artifacts/screenshots/grookai_dex_load_more_2.png` - Dex `Load more`
  control.
