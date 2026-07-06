# Grookai Vault Implementation Plan v2

Source: `Codex Implementation Plan v2.pdf` from Desktop  
Date audited: 2026-07-05  
Branch audited: `claude/app-visual-pass`  
Head audited: `7d4e5814 style: unify app collection surfaces`

## Phase 0 Result

This is the required planning-only pass. No app code changes are included in this phase.

The repo is already ahead of several UX Audit v2 assumptions. Future PRs must use verify-first discipline: if a listed item is already fixed, mark it complete and skip it.

## Operating Rules

- Planning first. No implementation PR begins until this plan is approved.
- Keep PRs small: one feature or one surface per PR.
- Do not touch backend, database, Supabase RPCs, pricing logic, identity resolution logic, scanner architecture, ingestion pipelines, or founder/admin/internal screens unless explicitly approved.
- Every implementation PR must run `flutter analyze` and `flutter test`.
- Every implementation PR must produce screenshot verification for affected major screens.
- Approved mockups and UX Audit v2 specs override existing implementation patterns where they conflict.

## Verify-First Audit

| Item | Status | Evidence / Notes |
| --- | --- | --- |
| `lib/widgets/gv_chip.dart` exists | Complete | Exists. Current API supports filter/count chips only. PR9 may extend variants if approved. |
| `lib/theme/gv_grid_constants.dart` exists | Complete / partial | Exists with `artworkAspectRatio = 2.5 / 3.5`, `imageRadius = 22`, `tileTapRadius = 22`. It does not expose a `cardAspectRatio` alias by that exact name. |
| `main.dart` search error raw red | Complete | Search error uses `theme.colorScheme.error`. |
| `card_detail_screen.dart` want icon raw red | Open | `Colors.red.shade400` still exists in `_buildWantIcon`. |
| `NetworkInteractionCard.heroHook` | Complete | Removed from `lib/widgets/network/network_interaction_card.dart`. |
| Legacy `_SetFilterChip` / `_SetFacetChip` in Sets | Complete | No surviving private classes in `public_sets_screen.dart`; Sets uses `GvChip`. |
| Old Sets chips row | Complete | `public_sets_screen.dart` now has a single sort menu and GvChip facet rows. |
| Vault main grid radii 18 / 13 | Complete for main grid | `_VaultGridTile` uses `GvGridConstants`. Some non-grid/strip surfaces still use hardcoded radii. |
| Wall/public card tile geometry | Complete for public card tiles | `_PublicCardTile` uses `GvGridConstants`. |
| Public collector follower chips | Open / needs design decision | Follow/follower controls remain as custom profile controls; not currently folded into `GvChip`. |
| Public collector stray Messages icon | Open | Public collector app bar still has a Messages icon. |
| Search hidden nav shortcuts | Open | Search controls still include Sets grid shortcut and collector-wall shortcut. |
| Shell nav duplication | Open | Drawer still includes Search, Feed, My Wall, Vault, and Messages; dock/app bar also expose these. |
| Dock geometry | Open | Active dock slot changes width and only active slot shows label. Scan is not elevated as a distinct circular action. |
| Card Detail bottom actions | Open | Bottom bar still swaps Compare/Share based on `_canCompare`; Want is not the only secondary fixed action. |
| Chip unification holdouts | Open | `_PillLabel`, `_MetaChip`, `_CountChip`, `_InlineTag`, `_VaultGvviChip`, and some `ChoiceChip` usage remain in vault detail/manage screens. |

## PR1 - Shell Nav Dedupe

Branch name: `ux/nav-dedupe`  
Primary file: `lib/main_shell.dart`

### Already Fixed

- None.

### Confirmed Current State

- Mobile dock contains Search, Feed, Scan, Wall, Vault.
- Drawer also contains Search, Feed, My Wall, Vault, and Messages, creating duplicate destination surfaces.
- App bar has Messages and Refresh.
- Wall icon currently uses `Icons.person_rounded` in dock and drawer.
- Drawer header still uses `FontWeight.w800`; typography cap can be handled here only if touched.

### Proposed Scope

- Drawer keeps secondary destinations only: Dex, Sets, Compare, Nearby, Nearby Map, Account, theme selector.
- Remove Search, Feed, My Wall, Vault, and Messages from drawer.
- App bar keeps context actions and Messages.
- Remove mobile app-bar Refresh and Dex Reload where mobile pull-to-refresh covers it.
- Rename drawer/dock Wall label consistently to `Wall` while preserving route behavior.
- Replace Wall icon with `Icons.collections_bookmark_rounded` or equivalent showcase/collection glyph.
- Add a route/nav regression test proving each destination appears in exactly one intended nav surface.

### Tests

- `flutter analyze`
- `flutter test`
- New widget/nav regression test for dock + drawer destination uniqueness.

### Screenshots

- Mobile shell default with dock.
- Drawer open.
- App bar on Search, Feed, Wall, Vault.

## PR2 - Dock Geometry + Scan Elevation

Branch name: `ux/dock-geometry`  
Primary file: `lib/main_shell.dart`

### Already Fixed

- None.

### Confirmed Current State

- Active dock slot width changes from 52 to 86.
- Inactive slots do not show persistent labels.
- Collapsed dock changes max width from 390 to 302.
- Scan is visually similar to other dock slots.

### Proposed Scope

- Rebuild dock slots to equal widths.
- Keep icon plus persistent 10-11px label for every slot.
- Active state animates fill/tint only; no width change, no neighbor shift.
- Collapse-on-scroll may reduce height, not individual slot widths.
- Style Scan as a centered filled circular action with accent tint.

### Tests

- `flutter analyze`
- `flutter test`
- Existing shell widget tests plus screenshot verification.

### Screenshots

- Default dock.
- Each active tab state.
- Collapsed dock state.

## PR3 - Remove Hidden Nav From Search Controls

Branch name: `ux/search-hidden-nav`  
Primary file: `lib/main.dart`

### Already Fixed

- None.

### Confirmed Current State

- Search controls still include `Icons.grid_view_rounded` Browse Sets shortcut.
- Search controls still include `@` collector-wall shortcut and slug prompt.
- Handlers `_openSetsScreen` and collector slug prompt are still present.

### Proposed Scope

- Remove the Sets grid shortcut from Search controls.
- Remove the `@` collector slug prompt from Search controls.
- Remove now-unused handlers only if they become unreferenced.
- Do not change search ranking, filter logic, result layout, or route contracts.

### Tests

- `flutter analyze`
- `flutter test`

### Screenshots

- Search header before/after.
- Search results with active filters.

## PR4 - Copy & Jargon Sweep

Branch name: `ux/copy-sweep`  
Primary files: `lib/main.dart`, `lib/main_vault.dart`, `lib/card_detail_screen.dart`, `lib/screens/vault/*`, `lib/screens/gvvi/*`, user-facing widgets under `lib/widgets/*`

### Already Fixed

- Some user-facing copy has already moved toward `Your copy` / `Copy details`, but this is not complete.

### Confirmed Current State

- User-visible `Dupes` still appears in Vault chip text.
- Vault empty states still use `No cards found in your vault` and `structural vault shell`.
- Explore still has `No cards surfaced yet`.
- `GVVI` remains user-visible in GVVI metadata surfaces.
- `resolver` and `provisional` exist in models/comments/internal services; implementation must distinguish user-visible strings from internal identifiers and comments.

### Proposed Scope

- Strings only; no layout or logic changes.
- Replace user-visible `GVVI` with `Your copy`, `Copy details`, or `Manage card`; keep IDs as quiet meta text where needed.
- Replace `Dupes` with `Duplicates`.
- Replace Vault empty states by view:
  - All: `Your vault is empty. Scan or search to add your first card.`
  - Duplicates: `No duplicates - every card in your vault is one of a kind.`
  - Recent: `Nothing added in the last 30 days.`
- Replace Explore empty states:
  - `Nothing trending yet - check back soon.`
  - `No matches. Try a set code or card number.`
- Remove or demote user-facing `surfaced`, `resolver`, and `provisional` where practical.
- Add a guard test for user-visible string literals. The test should avoid failing on imports, comments, models, service names, debug logs, and route names unless intentionally marked user-facing.

### Tests

- `flutter analyze`
- `flutter test`
- New user-visible jargon guard test.

### Screenshots

- Vault All empty state.
- Vault Duplicates empty state.
- Vault Recent empty state.
- Explore empty search.
- GVVI / copy detail metadata.

## PR5 - Search Filter Collapse

Branch name: `ux/search-filters`  
Primary file: `lib/main.dart`

### Already Fixed

- Search chips use `GvChip`.
- Search grid tiles use `GvGridConstants`.

### Confirmed Current State

- Language, identity, and rarity controls are still visible in the main Search surface.
- Result tile may sit too low on short mobile viewports.

### Proposed Scope

- Collapse language, identity, and rarity chip rows behind one `Filters` button.
- Show active filter count: `Filters · 3`.
- Bottom sheet contains the same controls and preserves current state behavior.
- Keep search field and results above the fold on a 667pt-height viewport.
- Do not change Vault in this PR.

### Tests

- `flutter analyze`
- `flutter test`
- Add/update widget test for filter count and sheet opening if practical.

### Screenshots

- Default Search.
- Filter sheet open.
- Badge with 2+ active filters.
- 667pt-height viewport with first result visible.

## PR6 - Vault Filter Collapse + Search Scope

Branch name: `ux/vault-filters`  
Primary file: `lib/main_vault.dart`

### Already Fixed

- Vault chips use `GvChip`.
- Main Vault grid tile uses `GvGridConstants`.

### Confirmed Current State

- Vault still shows multiple view/filter chips in the primary surface.
- `Pokemon` chip changes search-field semantics to `Search Pokemon`.
- `Recently Added` strip renders in the current main build path without being limited to All view.
- `Dupes` label remains and should become `Duplicates` under PR4 or PR6 depending ordering.

### Proposed Scope

- Match Search filter pattern: `Filters` button + active count + bottom sheet.
- Preserve existing Vault filtering behavior.
- Remove Pokemon chip's field mode swap; make Pokemon/character search a scope inside one search field.
- Use a stable hint such as `Search vault · by card, set, or Pokemon`.
- Render Recently Added strip only on All view.

### Tests

- `flutter analyze`
- `flutter test`
- Widget test for Pokemon scope not rewriting the search field semantics.

### Screenshots

- Vault All view.
- Vault Duplicates view.
- Vault Recent view.
- Vault filter sheet open.

## PR7 - One Card Shape, Part A

Branch name: `ux/card-shape`  
Primary files: `lib/widgets/network/network_interaction_card.dart`, `lib/screens/sets/public_set_detail_screen.dart`, `lib/main_vault.dart`, `lib/theme/gv_grid_constants.dart`

### Already Fixed

- `gv_grid_constants.dart` exists.
- Main Vault grid tile uses shared constants.
- `heroHook` is already removed from `NetworkInteractionCard`.

### Confirmed Current State

- `NetworkInteractionCard` still hardcodes feed aspect ratios: `0.68`, `0.71`, `0.78`.
- `public_set_detail_screen.dart` still has hardcoded card/tile radii `14`, `18`, and `22`.
- `main_vault.dart` main grid is migrated, but some non-grid strip/card surfaces still have hardcoded radii. Only migrate actual card tile widgets in this PR.
- Constants file has `artworkAspectRatio`, not an exact `cardAspectRatio` alias.

### Proposed Scope

- Add alias or naming expected by the guard if needed, without breaking current callers.
- Replace hardcoded card artwork aspect ratios and tile radii in active card tile widgets with `GvGridConstants`.
- Skip Vault main grid radii because already migrated.
- Add guard test against new hardcoded card aspect ratios/radii in card tile widgets.

### Tests

- `flutter analyze`
- `flutter test`
- New geometry guard test.

### Screenshots

- Feed card.
- Set detail grid.
- Vault grid.

## PR8 - Card Detail Fixed Action Placement

Branch name: `ux/card-detail-actions`  
Primary file: `lib/card_detail_screen.dart`

### Already Fixed

- `main.dart` search error raw red is already fixed.

### Confirmed Current State

- Bottom bar still includes primary ownership action, Want, and a Compare/Share slot.
- `_canCompare ? Compare : Share` swap remains.
- Want icon still uses `Colors.red.shade400`.

### Proposed Scope

- Bottom action bar becomes fixed: primary ownership action + Want.
- Remove Compare/Share slot swap from the bottom bar.
- Move Compare to top chrome or overflow.
- Share remains top-only.
- Replace Want active color with `colorScheme.error`.
- Do not add sign-in gating flows.

### Tests

- `flutter analyze`
- `flutter test`
- Existing card detail tests plus a guard for bottom action layout if practical.

### Screenshots

- Owned card.
- Unowned card.
- Compare-eligible card.
- Verify bottom bar is identical shape in all three.

## PR9 - Chip Unification, Part B

Branch name: `ux/chip-unification`  
Primary files: `lib/widgets/gv_chip.dart`, `lib/screens/vault/vault_manage_card_screen.dart`, `lib/screens/vault/vault_gvvi_screen.dart`, Sets screens as needed

### Already Fixed

- `gv_chip.dart` exists.
- `public_sets_screen.dart` has no surviving `_SetFilterChip` / `_SetFacetChip`.

### Confirmed Current State

- `GvChip` currently supports the Search/Sets/Vault/Wall filter/count shape, not all requested variants.
- Remaining private chip classes:
  - `_PillLabel`
  - `_MetaChip`
  - `_CountChip`
  - `_InlineTag`
  - `_VaultGvviChip`
- Some `ChoiceChip` usage remains in vault manage/GVVI screens.

### Proposed Scope

- Extend `GvChip` with label/count/tone variants only as needed.
- Migrate remaining private chip classes while preserving visual appearance.
- Delete private chip classes once unreferenced.
- Avoid redesigning card or copy surfaces in this PR.

### Tests

- `flutter analyze`
- `flutter test`
- Existing vault/GVVI tests.

### Screenshots

- Manage card overview.
- Manage card copies tabs.
- GVVI detail screen.
- Sets list sanity screenshot.

## Appendices - Plan Only

These are not approved for implementation in this phase.

### A - Wall Owner Editing

Future plan: owner-only `Edit wall`, drag-reorder, remove, Done, quiet follower/following text links, trade/sell badge below artwork, existing wall APIs only.

### B - Vault Undo Delete

Future plan: swipe-delete commits immediately with 5s Undo snackbar; confirm only for quantity greater than 1, graded, or on-wall copies. Restore path must be designed before implementation.

### C - Onboarding

Future plan: `OnboardingFlags` in `shared_preferences`, skippable first-run flow, `GvCoachMark`, teaching empty states, `onboarding_copy.dart`, analytics for first-session aha jobs.

## Approval Gate

Stop here. The next step is founder approval of this `PLAN.md`, then start PR1 only.
