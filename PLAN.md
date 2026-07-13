# Grookai Vault App-Wide Simplification Plan

Source: `Grookai Vault - App-Wide Simplification - Master Plan - July 12, 2026`
Date audited: 2026-07-13
Branch audited: `fix/pricing-ingestion-nightly`
Head audited: `4193f248`

## Current Status

All implementation rows in this app-wide simplification plan are complete in
this branch as of 2026-07-13. The branch is pushed through Step 6 at
`4193f248`.

Follow-up cleanup audit on 2026-07-13 confirmed `VaultGvviScreen` has no live
route imports. It remains in the tree only as the planned one-release rollback
file, with legacy tests still reading it directly.

## Master Plan Progress

| Area | Current status |
| --- | --- |
| Nav dedupe | Complete in this branch, with user-facing Feed renamed to Pulse. |
| Single-copy vault routing | Complete: single-copy owner rows now open the unified ownership screen. |
| Card Ownership consolidation | Complete for current owner routes. `VaultGvviScreen` remains in the tree only for the planned one-release rollback window; no live route imports remain. |
| Shared long-press quick actions | Complete for current scope: Vault grid, Copies tab, Pulse rows, and Wall card tiles all use the shared bottom-sheet component; Samsung Pulse/Wall screenshot gate passed. |
| Vault delete undo | Present: low-risk vault delete uses `_deleteWithUndo`; high-risk delete still uses a dialog. |
| Collector Memory archive undo | Present: memory archive is delayed behind a 5-second undo snackbar. |
| Catalog manual-add friction | Present: `_showCatalogPickerAndInsert` inserts quantity 1 immediately and offers `+1 more`. |
| Search filter collapse | Complete: filters are behind one sheet, active count is visible after selection, and Samsung screenshot gate passed after a small shared grid-geometry fix. |
| Icon/label semantics | Complete: Wall uses collection/bookmark iconography, and Search no longer carries grid/@ shortcut buttons in its filter controls. |
| Card Detail action bar + sign-in | Complete: bottom actions are fixed, Compare is in top chrome, and signed-out Add to Vault/Want opens an intent-preserving sign-in sheet. |
| Dex pagination | Complete: Dex uses progressive `Load more` append instead of Previous/Next paging. |
| Jargon sweep | Complete for the approved Step 3(b) scope: owner-copy labels, sale/copy errors, scanner hint copy, and provisional-surface copy are cleaned; remaining matches are identifiers, comments, service/API names, tests, or debug/internal wording. |

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

Original owner-facing call sites audited for this step, with current result:

- `lib/card_detail_screen.dart`
  - Owner paths now route to `VaultManageCardScreen`; non-owner exact-copy
    paths still route to `PublicGvviScreen`.
  - Card Detail ownership labels are collapsed to the approved two-state copy.
- `lib/main_vault.dart`
  - Single-copy and multi-copy rows now route to `VaultManageCardScreen`.
- `lib/main.dart`
  - Search/add owned-copy success paths now route to `VaultManageCardScreen`.
- `lib/screens/vault/vault_manage_card_screen.dart`
  - App bar title is the card name.
  - Single-copy ownership renders Overview only; multi-copy keeps Overview +
    Copies.
  - Copies rows use the public copy page/share/slab/remove actions without
    routing to `VaultGvviScreen`.
- `lib/screens/vault/vault_gvvi_screen.dart`
  - Retained unreferenced as the planned rollback file for one release cycle.
- `lib/screens/gvvi/public_gvvi_screen.dart`
  - Public/non-owner behavior remains separate; owner upgrade/manage routes go
    to `VaultManageCardScreen`.
- `lib/screens/network/network_screen.dart`
  - Exact-copy opens route owners to `VaultManageCardScreen` and non-owners to
    `PublicGvviScreen`.

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

Result: complete for the approved Step 3(b) scope.

- Replaced visible owner copy labels from `Exact copy`/`Manage Card`/`GVVI` to
  `Copy`, `Your copies`, and `Copy ID`.
- Kept identifiers, service names, comments, tests, and data-model terminology
  where changing them would create churn without changing user-visible copy.
- Step 3(b) cleaned the confirmed remaining user-visible strings:
  - `Exact copy target could not be resolved.` became
    `This card copy is not available yet.`
  - `Hint ready - awaiting resolver` became `Hint ready`.
  - Search match banners now use collector-facing copy such as
    `Multiple possible matches`, `Approximate matches`, and
    `No clear match was found`.
  - Provisional card surfaces now use `Card To Review`, `Cards To Review`,
    `Needs Review`, `Reviewing`, and plain review guidance.

## Step 3(b) Result: Jargon Sweep Finish

Audit date: 2026-07-13.
Implemented: 2026-07-13.

Scope: replace only user-visible copy. Do not rename identifiers, models,
routes, comments, API paths, service names, or tests unless a test explicitly
asserts visible copy that must change with the product text.

Updated user-visible hits:

- `lib/screens/grookai_objects/for_sale_terms_screen.dart`
  - Old copy: `Exact copy target could not be resolved.`
  - Surface: form error shown when the sale listing screen cannot resolve the
    selected ownership target.
  - New copy: `This card copy is not available yet.`
- `lib/services/grookai_objects/sale_listing_service.dart`
  - Old copy: `Exact copy target could not be resolved.`
  - Surface: thrown service error that can bubble into sale listing UI.
  - New copy: `This card copy is not available yet.`
- `lib/services/vault/vault_gvvi_service.dart`
  - Old copy: `Exact copy target could not be resolved.`
  - Surface: thrown archive error that can bubble into owner UI.
  - New copy: `This card copy is not available yet.`
- `lib/screens/identity_scan/identity_scan_screen.dart`
  - Old copy: `Hint ready - awaiting resolver`
  - Surface: scanner hint state title.
  - New copy: `Hint ready`
- `lib/widgets/provisional/provisional_card_section.dart`
  - Old section title default: `Unconfirmed Cards`
  - New title: `Cards To Review`
  - Support copy now comes from the revised `provisionalTrustCopy`.
- `lib/screens/provisional/provisional_card_screen.dart`
  - Old title: `Unconfirmed Card`
  - Detail copy comes from `provisionalTrustCopy` and
    `provisionalNotCanonCopy`.
  - New title: `Card To Review`
  - New detail copy:
    - `Review this possible match before adding it.`
    - `It is not in your saved card list yet.`
- `lib/services/provisional/provisional_presentation.dart`
  - Old visible constants: `Unconfirmed`, `Under Review`,
    `Visible while under review.`, `Not part of the canonical catalog yet.`
  - New visible constants: `Needs Review`, `Reviewing`,
    `Review this possible match before adding it.`,
    `It is not in your saved card list yet.`
- `lib/main.dart`
  - Old search banner copy used internal phrasing such as
    `Multiple plausible matches`, `Weak match`, and
    `No viable deterministic match was found`.
  - New copy uses `Multiple possible matches`, `Approximate matches`, and
    `No clear match was found`.

Excluded from Step 3(b):

- `provisional`, `resolver`, and `GVVI` in identifiers, imports, comments, API
  paths, debug-only internals, and tests that do not represent user-facing copy.
- `native_scanner_phase0_screen.dart` debug metric labels unless a visible
  release surface is confirmed; those labels appear diagnostic/dev-facing.

Gate passed:

- `flutter analyze`
- `flutter test`
- Focused grep after implementation confirmed:
  - no user-visible `Exact copy target could not be resolved`
  - no user-visible `awaiting resolver`
  - no user-visible `canonical catalog`
  - remaining `provisional`/`resolver` matches are identifiers, comments,
    service/API names, tests, or debug-only internals

Step 4: Card Detail action bar + sign-in.

Result: complete in this branch.

- Card Detail bottom actions stay fixed: ownership action, Memory/Sale when the
  owned-copy gates allow them, and Want.
- Compare is available from the top chrome instead of replacing a bottom action.
- Signed-out Add to Vault and Want no longer show post-tap snackbar dead ends.
  Both open a sign-in sheet that names the intended action, routes to
  `AccountScreen`, and retries the original action after the user returns
  signed in.

Search filter collapse verification:

Result: complete in this branch.

- Search exposes one `Filters` entry point instead of persistent secondary
  filter rows.
- The filter sheet contains Language, Identity, and Rarity controls.
- Selecting English updates the Search control to `Filters · 1`.
- Device QA on Samsung `SM S908U` exposed a tiny card-grid overflow in the
  active-filter state. The shared grid aspect ratio was relaxed from `0.5` to
  `0.495` so Search/Vault shared card geometry has enough vertical room on this
  viewport.

Step 5: Dex pagination.

Result: complete in this branch.

- Replaced page replacement controls with a single `Load more` action.
- Initial load and pull-to-refresh reset to page 1.
- Loading the next page appends species to the current Dex list, preserving the
  already-scrolled result set instead of forcing Previous/Next navigation.

Step 6: Pulse and Wall long-press quick actions.

Result: complete in this branch.

- Pulse rows now support long-press without changing their existing inline
  primary and message actions. The shared sheet exposes View card/View progress,
  View collector Wall when a collector slug is available, and Message collector
  when the Pulse item has a contact target.
- Public Wall card tiles now support long-press without changing normal tap to
  card/copy detail. The shared sheet exposes View, Share link, and Message when
  the card has a contact target and the viewer is not the owner.
- `test/vault_quick_action_sheet_test.dart` now guards all current shared-sheet
  call sites: Vault grid, Copies tab, Pulse rows, and Wall card tiles.
- Samsung `SM S908U` screenshots captured:
  `artifacts/screenshots/step6_pulse_long_press_sheet.png` and
  `artifacts/screenshots/step6_wall_long_press_sheet.png`.

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
- `artifacts/screenshots/step5b_postfix_search_baseline.png` - Search baseline
  with one `Filters` entry point.
- `artifacts/screenshots/step5b_postfix_filters_sheet_active_clean.png` -
  filter sheet with Language, Identity, and Rarity controls and English
  selected.
- `artifacts/screenshots/step5b_postfix_filters_active_badge.png` - Search
  active-filter state showing `Filters · 1` with no debug overflow banner.
- `artifacts/screenshots/step6_pulse_long_press_sheet.png` - Pulse row
  long-press quick-action sheet.
- `artifacts/screenshots/step6_wall_long_press_sheet.png` - Wall card
  long-press quick-action sheet.
