# App Visual Simplification V1 — Implementation Plan

Status: Engineering complete — redesign, automated usability, golden coverage, and Samsung acceptance complete; independent moderated participant research remains external  
Created: 2026-10-13  
Primary target: Flutter mobile app on the canonical Samsung viewport  
Production authority: None. Implementation, deployment, merge, and release remain separate gates.

Implementation checkpoint — October 13, 2026:

- Implemented the five-item mobile shell, reduced-motion behavior, flatter Pulse rows, two-column Wall and Vault layouts, visible overflow alternatives, and layout-matched loading states.
- Added local recent Search history, working discovery routes, Card detail Overview/Collection/Activity disclosure, and the compact two-column Dex root.
- Repaired Dex sprite loading: the Next image optimizer rejected the PokeAPI source with HTTP 400, so mobile now loads the public sprite URL directly. The Samsung shows the first four species artworks.
- Fixed mobile Set catalog count requests with game-scoped loading, bounded batches, and split/retry handling for SQL statement timeouts. The Samsung returned all 312 Pokémon sets in under 15 seconds on first visit; a forced refresh completed in about 23 seconds and remains a performance follow-up.
- Full Flutter suite passes (667 tests); `flutter analyze`, formatting checks, `git diff --check`, and the configured local Android debug build pass.
- The configured workspace debug build is installed on the Samsung with app data retained. Signed-out Explore, Sets, and Dex and the signed-in Pulse, Wall, Scan, Vault, Search, Card detail, and Dex journeys were reviewed.
- Current-build captures: `artifacts/screenshots/samsung_explore_signed_out_current_20261013.png`, `artifacts/screenshots/samsung_dex_grid_current_20261013.png`, `artifacts/screenshots/samsung_dex_filters_current_20261013.png`, `artifacts/screenshots/samsung_sets_loading_current_20261013.png`, and `artifacts/screenshots/samsung_sets_loaded_current_20261013.png`.
- Signed-in acceptance captures: `artifacts/audits/2026-10-13/samsung_signed_in/`.

Accessibility checkpoint — October 13, 2026:

- The Samsung showed Search at 200% text scale with 66 Umbreon matches in Comfortable List, retaining card name, price, add action, and navigation without overflow (`artifacts/screenshots/samsung_umbreon_search_font_2_0_20261013.png`).
- Vault now resolves Grid to a one-column Comfortable List at 200% text scale and switches the view selector to an icon-only control; the Samsung showed no Flutter overflow (`artifacts/screenshots/samsung_vault_font_2_0_icon_control_20261013.png`).
- Wall initially remained a two-column grid and clipped card metadata at 200%. It now changes to one card per row and scales the subtitle, price, and ownership slots; the rebuilt app showed readable card names, set details, and price placeholders after scrolling, with no Flutter overflow (`artifacts/screenshots/samsung_wall_font_2_0_final_20261013.png`, `artifacts/screenshots/samsung_wall_font_2_0_final_scrolled_20261013.png`).
- At 200%, the five-item dock now hides visual labels to prevent truncation while preserving the accessible destination names and tooltips. The Samsung accessibility tree exposed all five names (`artifacts/screenshots/samsung_shell_font_2_0_final_20261013.png`).
- A temporary Samsung display override exercised a 320dp viewport at the default and 200% text scales. Search, Vault, and Wall remained scrollable, the five dock actions stayed reachable, and the final log scan showed no Flutter overflow or fatal exception (`artifacts/screenshots/samsung_320dp_shell_20261013.png`, `artifacts/screenshots/samsung_320dp_search_20261013.png`, `artifacts/screenshots/samsung_320dp_vault_20261013.png`, `artifacts/screenshots/samsung_320dp_vault_font_2_0_20261013.png`, `artifacts/screenshots/samsung_320dp_wall_20261013.png`, `artifacts/screenshots/samsung_320dp_wall_font_2_0_scrolled_20261013.png`). The display override was reset.
- The app font scale was restored to 0.8 after the device check. The phone remains configured to stay awake during acceptance.
- Added regression coverage for the shared text-scale resolver, icon-only selector, and Wall's responsive layout. Updated stale source-contract checks to assert the current ownership labels, Vault filter routes, factual market-value copy, and theme tokens; production behavior was not changed to satisfy obsolete string assertions.
- `flutter test --reporter compact`: 667 passed after the Wall and dock changes. `flutter analyze`: no issues. `git diff --check`: clean. The rebuilt debug app was installed with app data retained.

## 1. Outcome

Make the Grookai mobile app materially calmer and more card-led without changing product truth, navigation meaning, data loading, privacy, ownership, pricing, or mutation behavior.

The completed app should:

- show card artwork before secondary chrome;
- make the next action obvious without instruction;
- behave like familiar mobile collection, inventory, profile, feed, and search products;
- preserve context when users move into a card and return;
- use the same interaction for the same kind of task on every screen;
- use spacing and hairlines instead of repeated rounded containers;
- keep exactly five stable primary dock affordances;
- expose one obvious primary action per context;
- replace blank spinner screens with layout-matched skeletons;
- remain usable at 320 logical pixels and enlarged text;
- preserve exact printing, finish, ownership, price, and route context.

## 2. Visual references

The mockups define hierarchy and density, not literal card data or navigation authority:

- `artifacts/mockups/grookai-app-pulse-v1.png`
- `artifacts/mockups/grookai-app-vault-v1.png`
- `artifacts/mockups/grookai-app-wall-v1.png`
- `artifacts/mockups/grookai-app-search-v1.png`
- `artifacts/mockups/grookai-app-card-detail-v1.png`
- `artifacts/mockups/grookai-app-dex-v1.png`

The Samsung captures remain the before-state evidence:

- `artifacts/screenshots/samsung_main_boot_20260713.png`
- `artifacts/screenshots/samsung_vault_20260713.png`
- `artifacts/screenshots/samsung_wall_20260713.png`
- `artifacts/screenshots/samsung_search_20260713.png`
- `artifacts/screenshots/samsung_pulse_return_20260713.png`

## 3. Authority and non-negotiable constraints

Implementation must follow these existing contracts:

- `docs/contracts/MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1.md`
- `docs/contracts/FLUTTER_VISUAL_CONVERGENCE_V1.md`
- `docs/contracts/PULSE_WALL_VAULT_PRODUCT_ARCHITECTURE_V1.md`
- `docs/contracts/SEARCH_RESULTS_POLISH_V1.md`
- `docs/DEX_UX_ADOPTION_V1.md`

The primary dock is exactly:

1. Pulse
2. Wall
3. Scan
4. Vault
5. Search

Scan remains a global action and never becomes a retained selected tab. Dex, Sets, Compare, Binders, Messages, Account, Profile, and Vendor remain secondary destinations.

The generated mockups occasionally show a different dock order. That order must not be implemented. The owner-approved repository contract is authoritative.

This work must not introduce:

- database, migration, RPC, RLS, storage, or auth changes;
- resolver, ranking, pricing, image-authority, or ownership changes;
- automatic public sharing or new mutation paths;
- new third-party Flutter dependencies unless separately justified;
- changes to Scan behavior beyond regression-safe shell integration;
- web changes in the first implementation lane.

The repository currently has unrelated uncommitted pricing and web changes. Every implementation phase must begin with a path-scoped diff review and must preserve those changes.

## 4. Current implementation findings

### Shell

- `lib/main_shell.dart` owns the root `IndexedStack`, app bar, and mobile dock.
- The signed-in dock can currently insert a sixth `Vendor` destination. This violates the five-item contract.
- The dock is rendered as a nested floating surface and can visually dominate the content.
- Root pages use different bottom-spacing strategies, which makes the dock feel as if it covers content even where the safe-area math is technically present.
- Current shell metrics are close to, but do not match, the active contract: 52px app bar, 60px dock, and 96px content gap instead of 46px, 58px, and 104px.

### Pulse

- `lib/screens/network/network_screen.dart` already uses lazy slivers and preserves canonical actions.
- The three-way segment control is a large rounded container with nested selected chips.
- Each feed row is another rounded container with one or more pill actions.
- Artwork is only 58 × 84 logical pixels, so chrome competes with the collectible.

### Vault

- `lib/main_vault.dart` combines Binders promotion, collection value, statistics, search, sort, Binders, Memories, filters, view mode, and collection content before the main grid.
- Mobile column calculation can produce three narrow columns.
- Grid actions are drawn over the artwork.
- Initial loading uses circular progress indicators rather than collection-shaped skeletons.

### Wall

- `lib/screens/public_collector/public_collector_screen.dart` wraps the profile identity in a grouped surface and renders stats as chips.
- Share, follow, Vendor pricing, section controls, and the grid all compete near the top.
- Section navigation uses pills and the add action can become clipped.
- The card grid uses a nested shrink-wrapped `GridView` and an unusually tall `0.40` child aspect ratio.
- `lib/main_shell.dart` shows a centered spinner while the personal Wall entry resolves.

### Search

- `lib/main.dart` already has curated trending data, filters, lazy results, skeleton tiles, and safe bottom spacing.
- The resting state presents a search field, a separate utility row, a heading, sentence examples, and then results, leaving weak discovery hierarchy on the Samsung viewport.
- The debug control can appear in the content header in debug builds.
- There is no recent-search presentation or compact browse section.

### Card detail

- `lib/card_detail_screen.dart` already has a strong artwork-first base and divider-based sections.
- Too many page-level actions are visible simultaneously in the top and bottom chrome.
- All secondary content is placed into one long page, so pricing, trust, versions, variant origin, journey, details, and network context compete.
- Pricing and other partial loads still use small circular spinners.

### Dex

- `lib/screens/dex/grookai_dex_screen.dart` contains the correct collection truth and performant lazy data orchestration.
- A large gradient hero, marketing copy, pills, four metrics, a grouped filter panel, and large species cards delay the collection itself.
- Filters are individually exposed as pill controls even when inactive.
- Detailed species cards repeat the same progress data several times.

## 5. Usability and cohesion contract

Visual simplification is not complete unless the app also becomes easier to understand and operate. Every phase must be reviewed against Jakob’s Law and Nielsen’s usability heuristics, then verified through complete collector tasks rather than isolated screenshots.

### 5.1 Familiar mental models

Grookai should borrow established behavior without copying another product’s visual identity:

| Grookai surface | Familiar mental model | Expected behavior |
| --- | --- | --- |
| App shell | Standard five-item Android consumer app | Persistent labeled destinations, obvious selected state, predictable Back |
| Pulse | Activity/social feed | Text tabs, chronological rows, tap-through, return to prior scroll position |
| Wall | Profile plus showcase grid | Identity first, compact counts, horizontal categories, artwork grid |
| Vault | Inventory or photo library | Search and filters near content, dense two-column scan, actions on the selected item |
| Search | Search/discovery app | Search field first, recent searches, trending content, browse shortcuts |
| Card detail | Product/media detail | Hero object, exact identity, ownership/value, one primary action, overflow for secondary actions |
| Dex | Collection checklist | Progress once, filterable grid, obvious collected versus missing state |

Users must not need to learn a Grookai-specific control when a familiar platform pattern communicates the same behavior. Product-specific concepts should live in the data and collector workflows, not in surprising navigation mechanics.

### 5.2 Heuristic evaluation matrix

Each phase review must score and resolve findings against these principles:

| Principle | Grookai requirement |
| --- | --- |
| Visibility of system status | Show layout-matched loading, refresh, offline, mutation-in-progress, success, and partial-failure states. Never leave a blank screen with only a spinner. |
| Match with the real world | Use collector language: card, exact printing, finish, copy, condition, set, and value. Avoid exposing internal IDs unless they help identify an exact copy. |
| User control and freedom | Back returns to the prior context; filters can be cleared; reversible local changes offer Undo; destructive or public actions require confirmation. |
| Consistency and standards | Search, filter, sort, tabs, overflow, sheets, skeletons, empty states, and primary actions follow one pattern across all screens. |
| Error prevention | Confirm exact printing before Vault writes, prevent invalid actions, explain disabled states, and keep privacy/publication choices explicit. |
| Recognition over recall | Keep navigation labels visible, show active filters, retain recent searches locally, and expose long-press actions through a visible alternative. |
| Flexibility and efficiency | Preserve search, sorting, layouts, long press, deep links, and shortcuts for experienced collectors without burdening first-time users. |
| Aesthetic and minimalist design | Show only information needed for the current decision; move secondary facts and actions into progressive disclosure. |
| Error recognition and recovery | Error copy states what failed, what remains safe, and the next recovery action. Preserve already loaded content during partial failures. |
| Help and documentation | Prefer contextual empty-state guidance and clear labels. Add explanatory copy only where an unfamiliar collector concept cannot be inferred. |

### 5.3 Information architecture rules

- Root destinations answer one question each: Pulse—what changed; Wall—what is showcased; Vault—what I own; Search—what I can find.
- Scan is a global acquisition action, not a content destination.
- Pushed screens answer a narrower question and hide the root dock.
- Every screen has one visually dominant action. Secondary actions use text links, overflow, or a contextual sheet.
- Filters modify the current collection; navigation opens a new destination. They must not share ambiguous styling.
- Back must reverse navigation, not unexpectedly clear local state or change the selected root.
- A user returning from Card detail should find the originating feed/grid, query, filters, and scroll position intact.
- Blank states explain how to populate the surface. Zero-result states explain how to recover the query. These are different states.

### 5.4 Terminology contract

Use these terms consistently in UI copy:

- **Card**: canonical catalog identity.
- **Printing** or **version**: a specific finish, stamp, language, or recognized variant of a card.
- **Copy**: one owned physical instance.
- **Vault**: private inventory of owned copies.
- **Wall**: intentionally public showcase projection.
- **Dex**: species/character collection progress.

Do not interchange “card,” “printing,” and “copy” in actions. For example, use “Add to Vault” before ownership exists, “Manage copy” for one owned instance, and “Your copies” when several instances exist.

### 5.5 Critical task-flow acceptance

The redesign must be evaluated as complete workflows:

1. **Find and add an exact card**
   - Search or Scan → result → exact printing/version → Add to Vault → confirmation → visible owned state.
   - Success: no ambiguous printing write and no unexpected route reset.
2. **Manage an owned copy**
   - Vault → locate through search/filter → open → Manage copy → update or cancel → return to the same Vault context.
   - Success: the user always knows whether an action affects a catalog card or a physical copy.
3. **Investigate a Pulse event**
   - Pulse → open event/card/progress → inspect → Back.
   - Success: Pulse tab, position, and unread state remain coherent.
4. **Curate the Wall safely**
   - Vault or Card detail → choose exact eligible copy → choose Wall section → review privacy/intent → confirm.
   - Success: no automatic public sharing and no confusion between copy intent and section membership.
5. **Continue a collection goal**
   - Dex → filter missing/started → species → printing → Vault or Search → return.
   - Success: progress truth and filters remain intact across the journey.
6. **Discover without a query**
   - Search → recent, trending, or browse route → result/detail → return.
   - Success: the screen is useful before typing and every browse row reaches a working destination.

### 5.6 Usability measurement

Before approval, test the six flows with both a first-time user posture and an experienced collector posture. Record:

- completion or failure;
- time on task;
- wrong turns and Back presses;
- mis-taps or actions opened unintentionally;
- moments where card/printing/copy meaning is misunderstood;
- whether the user can predict the result before confirming;
- single-ease-question score after each flow;
- qualitative confusion notes tied to the exact screen and state.

No analytics SDK or remote telemetry is authorized by this plan. Initial usability evidence comes from deterministic tests, moderated read-only sessions, local timing, and the Samsung crawl. Product analytics requires a separate privacy and instrumentation decision.

## 6. Shared design system changes

Implement the shared layer before restyling individual screens.

### 6.1 Token reconciliation

Update `lib/theme/gv_tokens.dart` and `lib/widgets/app_shell_metrics.dart` to match the active contract:

| Token | Target |
| --- | ---: |
| Canvas | `#090C10` |
| Low surface | `#0E1319` |
| Hairline | `#303B47` with contextual alpha |
| Primary text | `#F1F4F8` |
| Secondary text | `#BAC3CF` |
| Primary accent | `#6CAEFF` |
| Positive/owned accent | `#5ED3B3` |
| App bar | 46 logical pixels |
| Dock content height | 58 logical pixels |
| Dock max width | 390 logical pixels |
| Dock radius | 34 logical pixels |
| Root content bottom gap | 104 logical pixels plus safe area |
| Spacing scale | 4, 8, 12, 16, 22 |

Reducing clutter comes from reducing the number of surfaces, not from making every remaining surface square. Flat content sections should use no container radius at all.

### 6.2 Shared primitives

Add small primitives under `lib/widgets/mobile/` only when at least two screens use them:

- `GvMobileTextTabRail`: horizontally scrollable text tabs with an underline, semantics, and 44px targets.
- `GvMobileSectionHeader`: title, optional count, and one trailing action.
- `GvMobileToolbar`: compact search-adjacent filter, sort, and view actions.
- `GvSkeletonBlock` and screen-specific skeleton compositions.
- `GvArtworkGridTile`: artwork-first tile with metadata below and optional trailing action below the image.
- `GvDividerListSection`: flat rows separated by hairlines.

Do not turn these primitives into a new generic component framework. Screen-specific behavior stays in its current screen.

### 6.3 Interaction rules

- Minimum interactive target: 44 × 44 logical pixels.
- Primary buttons: minimum 46 logical pixels high.
- One persistent primary action per screen region.
- Long-press actions must also have a visible menu or button alternative.
- Motion: 120–180ms, transform/opacity only, and disabled or reduced when `MediaQuery.disableAnimations` or accessible navigation requests it.
- Loading announcements and mutation results must use Flutter semantics/live regions where appropriate.
- All user text must tolerate long names, localization, and text scaling without horizontal overflow.

## 7. Implementation phases

### Phase 0 — Baseline and fixture harness

Estimated effort: 0.5–1 engineering day.

Deliverables:

- Capture the current six target screens at 412 × 915, 320 × 700, and one large-text configuration.
- Add deterministic fixture builders for visual tests; fixtures must make no remote requests.
- Record dark/light theme, font scale, safe-area, loading, empty, long-text, missing-image, and populated states.
- Complete a baseline heuristic audit with severity 0–4, affected task, evidence screenshot, and recommended correction.
- Walk all six critical task flows and record steps, wrong turns, ambiguous labels, state loss, and recovery behavior.
- Build a cross-screen inventory of search, filter, sort, tabs, overflow, sheets, confirmation, snackbar, and empty-state patterns so duplicate interaction models can be consolidated.
- Establish golden update as an explicit local command; CI must never auto-approve new goldens.
- Record a path-scoped starting diff so unrelated worktree changes remain protected.

Exit gate:

- Baselines render without crashes and the fixture harness is deterministic.

### Phase 1 — App shell and navigation

Estimated effort: 1–1.5 engineering days.

Primary files:

- `lib/main_shell.dart`
- `lib/widgets/app_shell_metrics.dart`
- `lib/theme/gv_tokens.dart`
- `test/flutter_visual_convergence_v1_test.dart`
- `test/mobile_navigation_and_set_retention_contract_test.dart`

Changes:

- Remove `Vendor` from the bottom dock while retaining it in the drawer and desktop rail.
- Keep exactly five equal-width dock slots in the contract order.
- Preserve unread Pulse state and Scan’s non-selected global-action behavior.
- Reconcile app-bar and dock geometry with the active contract.
- Reduce the dock’s internal borders and selected-background area; use blue icon/text plus a restrained indicator.
- Standardize root bottom spacing through `shellContentBottomPadding`.
- Keep the dock hidden for keyboard, pushed, fullscreen, auth, and capability-owned routes.
- Keep stateful root screens in the existing `IndexedStack`; do not sacrifice scroll or local state preservation.

Acceptance:

- Signed-in and signed-out users both see exactly five dock affordances.
- The first and last scroll items can be fully revealed above the dock.
- Scan opens and returns to the prior selected root.
- No destination shifts width when selected or receives an unread badge.

Progress checkpoint — October 13, 2026: the signed-in-only Vendor dock item has
been removed. Mobile now uses the five approved labels in order: Pulse, Wall,
Scan, Vault, Search. Vendor remains available from the signed-in drawer and
desktop rail. App bar/dock metrics now match the contract; the dock uses its
390px cap and 34px radius. Shell, navigation, visual convergence, and source
contract checks pass; physical-device review and release acceptance remain
open.

Progress checkpoint — October 13, 2026: Pulse now uses open feed rows separated
by hairlines, 72 × 101 artwork, a compact text/icon primary action, and text-first
Pulse/Discover/Following tabs. The unread count no longer changes tab layout
and remains available in tab semantics. Pulse integration/navigation tests and
targeted Flutter analysis pass. Samsung density, enlarged-text, and runtime
acceptance remain open.

### Phase 2 — Pulse

Estimated effort: 1.5–2 engineering days.

Primary files:

- `lib/screens/network/network_screen.dart`
- `test/pulse_ui_integration_test.dart`
- `test/mobile_navigation_and_set_retention_contract_test.dart`

Changes:

- Replace `_NetworkSegmentToggle` and its nested chip shell with `GvMobileTextTabRail` for Pulse, Discover, and Following.
- Preserve unread count without allowing it to resize the tab row; expose the full count through semantics.
- Replace rounded `_PulseItemRow` containers with open rows separated by hairlines.
- Increase artwork to approximately 72 × 101 logical pixels while preserving the card aspect ratio.
- Limit the visible row to kicker, two-line primary copy, concise metadata, and one primary action.
- Keep contact/message behavior available as the secondary action or overflow when relevant.
- Replace pill-shaped action styling with compact text/icon actions that retain 44px hit targets.
- Rebuild the loading state to mirror real Pulse rows.
- Preserve lazy slivers, canonical routes, unread handling, older-item pagination, partial refresh errors, caught-up state, and all existing mutation boundaries.

Acceptance:

- At least two useful feed rows are visible on the canonical Samsung viewport when data permits.
- Artwork is the strongest object in every row.
- Pulse, Discover, and Following remain deep-linkable through existing dispatch.
- No feed row requires long press for its primary action.
- Opening and returning from an item preserves segment and scroll context.

### Phase 3 — Wall

Estimated effort: 2–3 engineering days.

Primary files:

- `lib/main_shell.dart`
- `lib/screens/public_collector/public_collector_screen.dart`
- `test/app_wall_sections_parity_test.dart`
- relevant Wall section and hosted-artwork tests

Changes:

- Replace the personal Wall’s centered boot spinner with a profile-and-grid skeleton.
- Flatten `_PublicCollectorHeader`; keep avatar, name, slug, and compact counts without a surrounding grouped surface.
- Move share, owner settings, and Vendor pricing into a small contextual overflow/action area while retaining every existing route.
- Keep Follow visible for other collectors and preserve current relationship behavior.
- Replace stat chips with inline, tappable text counts.
- Replace section pills with `GvMobileTextTabRail`.
- Render the owner add-section action as a compact plus target; use an accessible label rather than visible “+ Add Section” text.
- Convert the mobile card list to a sliver-backed two-column grid. Avoid nested `GridView(shrinkWrap: true)` on the primary mobile path.
- Use artwork, title, set/number, and only the highest-priority ownership or price signal. Move actions below artwork or into an accessible overflow target.
- Preserve exact-copy keys, hosted-first image resolution, section order, privacy checks, follow behavior, and Wall mutation workflows.

Acceptance:

- The section rail never clips at 320px and remains horizontally scrollable.
- The first grid row begins within the first viewport for an ordinary profile.
- Empty, load-failure, private, owner, and visitor states retain clear next actions.
- No card metadata or action overlaps artwork.
- Users can distinguish public section membership from private Vault intent before confirming a change.

Progress checkpoint — October 13, 2026: Wall now renders its public collection
through a responsive `SliverGrid` with lazy card construction. Share, Account
settings, and owner Vendor Mode actions live in the profile overflow menu; the
section rail remains horizontally scrollable and its add target is labeled.
Wall section, exact-copy management, refresh, and navigation contract tests
pass. Samsung first-viewport, 320px, enlarged-text, and runtime review remain
open.

### Phase 4 — Scan regression checkpoint

Estimated effort: 0.5 engineering day.

No Scan redesign is included in this scope. Verify only that shell changes preserve:

- center action placement;
- camera permission and fullscreen behavior;
- photo picker and back navigation;
- prior-root restoration after cancel;
- exact-printing handoff before any Vault write.

Exit gate:

- Existing scanner tests pass and the Samsung read-only flow returns to the original root without dock-state drift.

### Phase 5 — Vault

Estimated effort: 2–3 engineering days.

Primary files:

- `lib/main_vault.dart`
- `lib/theme/gv_grid_constants.dart`
- `lib/widgets/vault/vault_quick_action_sheet.dart`
- Vault navigation, quantity, exact-pricing, and quick-action tests

Changes:

- Keep the collection value and essential counts, but reduce them to one compact summary block.
- Keep the required named Binders entry, but remove or collapse the transient “What’s new” promotion once dismissed.
- Consolidate search, filter, sort, and view mode into one compact search row plus toolbar.
- Move Memories and other secondary utilities to the drawer/overflow while preserving their routes.
- Force two artwork-first columns on phone widths; retain responsive tablet/desktop behavior.
- Remove the rounded tile surface and outer border from `_VaultGridTile`.
- Move the artwork-overlay menu below the image. Selection mode may retain a clear selection indicator because it communicates state.
- Keep title on up to two lines, then one concise identity line and one quantity/value line.
- Replace circular loading indicators with a two-column skeleton grid.
- Preserve list and compact modes, structural views, exact species filters, multi-select lots, long-press quick actions, hosted/fallback artwork, pricing proof, and exact printing identity.

Acceptance:

- Phone layout is exactly two columns from 320px through the canonical Samsung width.
- Card title, printing/finish, set/number, quantity, and price remain available without covering artwork.
- Destructive actions still require confirmation.
- Binders remains discoverable by name from Vault.
- Search, filter, sort, and view controls behave consistently with Search and Dex.
- Returning from copy management restores the prior query, filters, layout, and scroll position.

Progress checkpoint — October 13, 2026: Vault phone layout is two columns below
600px, uses lazy grid tiles, puts actions below the artwork, and has a matching
loading grid. Added a contract check for the phone column rule, skeleton count,
and action placement. Shell, Pulse, Wall, Scan, Vault, exact-pricing, and
navigation checks pass together (104 tests); targeted analysis is clean.
Physical Samsung spacing, enlarged-text, and state-restoration review remain
open.

### Phase 6 — Search

Estimated effort: 2–2.5 engineering days.

Primary files:

- `lib/main.dart`
- `lib/main_shell.dart` for existing destination callbacks if required
- `test/beta_onboarding_sentence_search_test.dart`
- `test/search_result_action_sheet_layout_test.dart`
- search and resolver contract tests

Changes:

- Keep one 52px search control and place filter access inside or immediately beside it.
- Hide debug-only controls from the content hierarchy; debug access can remain in developer overflow or tooling.
- Add a local-only recent-search list capped at five entries, with individual removal and Clear All. Never sync or send this history to the backend.
- Present curated trending cards as a compact horizontal artwork rail before query entry.
- Add a flat Browse list using only working destinations:
  - Sets opens the existing `PublicSetsScreen` route.
  - Dex opens the existing `GrookaiDexScreen` route.
  - Exact/Special versions applies the existing identity filters or a verified resolver preset.
- Do not ship an Artists row until an existing supported route or resolver contract is verified; the mockup’s row must not become a dead control.
- Preserve sentence search, filters, resolver ordering, match-intent grouping, ownership actions, provisional results, compare workspace, and bounded show-more behavior.
- Use the existing catalog skeleton geometry for active results and a separate lightweight discovery skeleton for the resting state.

Acceptance:

- Search is useful before typing and never presents a large blank region.
- Recent history is device-local, bounded, removable, and absent for signed-out/public browsing unless explicitly allowed.
- Search result ordering and exact-version routing are unchanged.
- Empty and error copy gives a concrete recovery action.
- Result, printing, and ownership labels make the next action predictable before the user taps it.

Progress checkpoint — October 13, 2026: Search recent queries now use a tested
local helper that trims input, deduplicates case-insensitively, promotes a
repeat to the top, caps history at five, and supports removal. Clear All writes
an empty list to local preferences. Search retains working Sets, Dex, and
special-version browse actions. Search onboarding, recent-history, action-sheet,
and app-flow checks pass (30 tests). Physical density and return-state review
remain open.

### Phase 7 — Card detail

Estimated effort: 2–3 engineering days.

Primary files:

- `lib/card_detail_screen.dart`
- `lib/main_shell.dart` canonical card-route handoff
- card journey, pricing, printing identity, and ownership tests

Changes:

- Use a compact pushed-route app bar with Back, “Card details,” and one overflow menu.
- Put Comments, Compare, Share, and other secondary actions in the overflow while keeping their existing implementations.
- Keep the artwork large and unboxed, followed by exact identity and version context.
- Introduce three text tabs for progressive disclosure:
  - Overview: artwork, identity, market value, trust, and core details.
  - Collection: ownership, exact copy, printing options, variant origin, and relevant Vault actions.
  - Activity: journey, collector network, and comments entry.
- Every existing section must remain reachable; tabs reorganize presentation and do not delete truth.
- Replace the floating multi-action bottom pill with a safe-area-aware full-width dynamic primary action: Add to Vault, View Your Copy, Manage Copy, or Add Another Copy.
- Keep Want, Memory, Sale, and price history as secondary actions within their relevant tab or overflow.
- Replace partial-load circular indicators with inline skeleton rows.
- Where a canonical route must resolve before navigation, use source-card data optimistically when available; otherwise show a full detail skeleton rather than a blank spinner.

Acceptance:

- The primary identity, ownership state, and value are visible before secondary detail sections.
- No persistent root dock appears on the pushed detail route.
- Exact printing and unresolved-printing states remain explicit.
- Back/cross-link policy remains unchanged and does not grow duplicate routes.
- Dynamic action labels consistently distinguish adding a card from managing an owned copy.

Progress checkpoint — October 13, 2026: Card detail now presents Overview,
Collection, and Activity tabs; secondary actions use one overflow menu; the
bottom action reflects exact ownership state. Initial market and journey loads
use layout-matched skeleton rows. Card history, journey, governed printing,
ownership, and app-flow checks pass (49 tests); targeted analysis is clean.
Physical hierarchy, enlarged-text, and route-return review remain open.

### Phase 8 — Dex

Estimated effort: 2–3 engineering days.

Primary files:

- `lib/screens/dex/grookai_dex_screen.dart`
- `lib/screens/dex/grookai_dex_species_screen.dart` for shared presentation consistency only
- Dex performance, filter, completion-truth, and quick-action tests

Changes:

- Remove `_DexHeroCard`, decorative gradient, marketing copy, and duplicate metric pills from the root screen.
- Render one flat progress header: owned/total, species collected, percentage, and a thin progress bar.
- Keep search visible. Collapse generation, type, progress, and sort into one filter sheet with an active-filter count.
- Keep a compact grid/list toggle next to filter access.
- Default the phone layout to a two-column species grid with simple sprite frames, number, name, and one collected/missing status.
- Use color artwork for collected/started species and a tasteful silhouette only when the existing data truth supports missing state.
- Retain all species, layouts, filters, sorts, local progressive reveal, exact completion math, projects, Vault actions, Wall review, long-press alternatives, and canonical routes.
- Replace the initial spinner with a progress-header and species-grid skeleton.

Acceptance:

- Collection content begins in the first viewport.
- Completion appears once, consistently, rather than being repeated across hero, metrics, and every card.
- Useful Dex root content remains within 2 seconds and species detail within 3 seconds on the canonical Samsung test conditions.
- No completion, finish, slab, or missing-state truth is inferred or relabeled.
- Returning from a species or printing preserves filters, layout, and progress context.

Progress checkpoint — October 13, 2026: Dex defaults to the compact species
grid, uses one progress header and a grid-shaped initial skeleton, and keeps
all three existing presentation modes. Generation, type, progress, and sort
now live in one bottom sheet with an active-filter badge; the presentation
switch stays beside the filter button. Dex truth, filtering, navigation, and
performance contract checks pass (61 tests); targeted analysis is clean.
Samsung timing, visual density, enlarged-text, and context-return review remain
open.

### Phase 9 — Cross-screen hardening and Samsung acceptance

Estimated effort: 2–3 engineering days.

Automated gates:

- `dart format --output=none --set-exit-if-changed` on touched Dart files.
- `flutter analyze`.
- Focused widget and contract tests for each phase.
- Full `flutter test` after all phases.
- Golden tests at 412 × 915 and 320px width.
- Semantics tests for dock order, tab labels, selected state, image labels, live loading state, and overflow actions.
- Text-scale tests at 1.0, 1.3, and 2.0.
- Dark and light theme tests.
- Long-name, missing-image, empty, loading, partial-error, full-error, offline/degraded, and permission-denied fixtures where applicable.
- A path-scoped migration/backend diff check proving no server-side scope entered the change.
- `git diff --check`.
- A completed before/after heuristic matrix with no unresolved severity-3 or severity-4 usability findings.
- Critical task-flow tests proving origin state is restored after pushed routes.

Progress checkpoint — October 13, 2026: the full Flutter suite passes (661
tests), `flutter analyze` reports no issues, the touched-file formatter check
and `git diff --check` are clean, and the configured Android debug build
installed and launched on the Samsung. The physical pass verified signed-out
Explore, Sets, and Dex at the device's 480dp width, opened the Dex filter
sheet, and confirmed sprite artwork loads. The Sets count RPC initially timed
out with large batches; bounded 50-code batches with two concurrent requests
and recursive timeout splitting return 312 Pokémon sets. The Sets index now
filters rows and count requests to the selected game, then caches that game's
result for immediate return; this preserves the canonical counts while avoiding
work for two catalogs the user has not opened. On the Samsung, the Pokémon list
loaded within 15 seconds on first visit, versus about 50 seconds before. A
forced refresh still showed loading at 8 seconds and had completed by 23
seconds, so refresh latency remains a follow-up performance item. The current
game-scoped view retains the same 312 sets and era/lane counts. Switching to One
Piece loaded its 61 sets and, after this checkpoint's UI correction, no longer
shows Pokémon-only era filters; returning to Pokémon uses the in-memory cache.
The signed-out Explore shortcut for Special versions previously ran a broad
sentence query that returned zero cards. It now opens the existing Alternate
Art identity filter; the Samsung showed 14 results, and opening one reached Card
Detail with working Overview, Collection, and Activity tabs. The signed-out
detail reports no pricing data, so authenticated pricing behavior remains
unverified. The Other Versions sheet showed nine prints; opening the Pokémon GO
print changed the selected print and Back restored the original Dragonite
detail, then Back restored the 14-card filtered result list. Screenshots are
retained in `artifacts/screenshots/`. The project still emits forward-looking
compatibility warnings for Gradle, Android Gradle Plugin, and Kotlin. Signed-in
screen crawl, golden coverage at specified widths, and the moderated usability
pass remain open. The 2.0 Android font-scale pass exposed clipped card metadata
in the two-column Search grid. Search now resolves Grid to Comfortable List at
font scales of 1.5 and above, keeps Grid at 1.3, and preserves an explicitly
selected compact list. Unit coverage and the full suite pass. The rebuilt APK
installed successfully without clearing app data, and the device font scale was
restored to 0.8. However, after installation the Samsung showed the signed-in
Pulse shell with a visually blank content area, so the physical large-text
Search verification could not be completed; investigate that rendering/state
issue before treating the device acceptance pass as complete.

Signed-in Samsung acceptance checkpoint — October 13, 2026: the blank Pulse
surface was traced to an expanding tab-indicator stack receiving an unbounded
sliver height. The tab row now has a bounded 52dp height and renders all three
segments. The shell dock no longer claims the full Scaffold height, uses an
edge-to-edge surface with a top divider, and is 64dp tall (60dp collapsed) to
accommodate Samsung font metrics without overflow. Pulse, Discover, Following,
Wall, Vault, Search, Dex, Dex filters, a species detail, card-detail Overview /
Collection / Activity, card overflow, scanner entry, and Back restoration were
exercised without remote mutation. Discover and Following now use a familiar
Instagram-style vertical feed hierarchy: collector identity and intent first,
full-width edge-to-edge card media at the card's natural aspect ratio, then a
flat icon action row and concise card metadata. Card artwork is never cropped:
the complete border, title, number, and lower card details remain visible. The
icon row exposes only real actions—message, details, and copy selection when
applicable. Posts remain flat and separated by a divider without nested card
containers.
The scanner initialized after a one-time camera grant; no camera view was
captured or retained. Focused analysis and 38 relevant shell, Pulse, and
visual-contract tests pass, and the final device log scan showed no Flutter
overflow, infinite-constraint, fatal exception, or ANR. Evidence is retained in
`artifacts/audits/2026-10-13/samsung_signed_in/`.

Final engineering acceptance — October 14, 2026: a 12-image Flutter golden
matrix now covers 320px and 412 × 915 at 1.0, 1.3, and 2.0 text scales in both
light and dark themes. The full Flutter suite passes 680 tests and analysis is
clean. A refreshed read-only Samsung crawl verified signed-in pricing, Back
restoration to the same Wall section, and Pulse, Vault, Search, and Wall at
200% system text. The final log scan found no Flutter overflow, infinite
constraint, fatal exception, or ANR, and the device font scale was restored to
0.8. Deterministic tests and the physical crawl cover all six critical task
flows; an independent moderated participant study remains research work that
cannot be truthfully simulated by an automated agent. See
`docs/audits/app_visual_simplification_v1/FINAL_ACCEPTANCE_20261014.md`.

Physical Samsung read-only crawl:

1. Cold launch and verify shell geometry.
2. Open Pulse, change all three tabs, open one item, and return.
3. Open Wall, scroll sections, switch section, and open one card.
4. Open Scan and back out without capture or mutation.
5. Open Vault, search, filter, sort, switch layout, long-press, and dismiss.
6. Open Search, inspect resting discovery, search, filter, and open a result.
7. Verify Card detail tabs, zoom, overflow, and back behavior without mutation.
8. Open Dex, filter, switch layout, open a species, and return.
9. Repeat with enlarged text and scan device logs for overflow, exceptions, ANR, and image failures.

Moderated usability pass:

1. Run the six critical task flows without coaching beyond the task statement.
2. Ask the participant to predict the result before public, destructive, or ownership actions.
3. Record completion, time, wrong turns, Back presses, and terminology confusion.
4. Fix every blocker and high-severity misunderstanding before visual sign-off.
5. Repeat failed flows after the correction without explaining the new layout.

The crawl must not purchase, share externally, post, comment, mutate Vault, change Wall membership, change intent, start/stop projects, or accept a scan result.

## 8. Test updates and additions

Update brittle source-string tests only when the underlying invariant is replaced by a stronger widget or semantics test.

Required new coverage:

- signed-in dock still contains exactly five items;
- Vendor remains reachable outside the dock;
- dock order and Scan non-selection behavior;
- Pulse text-tab behavior and flat row semantics;
- phone Vault grid always resolves to two columns;
- Vault overflow action is below artwork and long press has a visible alternative;
- Wall section tabs do not clip and the plus action has an accessible label;
- personal Wall uses a skeleton instead of a centered spinner;
- local recent-search cap, removal, and Clear All;
- Browse rows route only to implemented destinations;
- Card detail tab content remains reachable and dynamic ownership CTA is correct;
- Dex root has one progress summary and retains filter/sort truth;
- no target screen overflows at 320px or text scale 2.0.
- root-to-detail-to-root journeys restore the originating state.
- destructive, public, and ownership mutations clearly identify their target and expected result.

Existing tests protecting resolver order, canonical navigation, pricing proof, hosted artwork, Wall privacy, exact-copy identity, Dex completion truth, and scanner behavior must remain passing without weakening assertions.

## 9. Rollout strategy

Implement one phase per reviewable commit or isolated patch set:

1. fixtures and shared tokens;
2. shell;
3. Pulse;
4. Wall;
5. Scan regression checkpoint;
6. Vault;
7. Search;
8. Card detail;
9. Dex;
10. hardening and Samsung acceptance.

Do not mix backend work, pricing changes, or web parity work into these patches. If temporary presentation flags are used for side-by-side validation, use one compile-time visual flag and remove it after owner acceptance rather than leaving permanent dual implementations.

Rollback is a phase-level revert. No data rollback should be necessary because this plan changes no data model or server behavior.

## 10. Effort and completion definition

Expected implementation effort: approximately 16–23 focused engineering days, including the baseline heuristic audit, automated tests, moderated task-flow validation, and one full Samsung acceptance pass. The range accounts for the size of `lib/main.dart`, `lib/card_detail_screen.dart`, and the Wall/Dex surfaces, plus preserving the extensive existing contract suite.

The project is complete only when:

- all six approved screen directions are represented in the running Flutter app;
- the production dock is exactly five items in the approved order;
- every changed screen has loading, populated, empty, and error coverage;
- all pre-existing data and navigation invariants pass;
- the full Flutter suite passes;
- the Samsung crawl shows no overflow, dock obstruction, blank spinner route, crash, or ANR;
- screenshots are reviewed against the mockups for hierarchy and density;
- all six collector task flows complete without coaching or state loss;
- the final heuristic audit has no unresolved severity-3 or severity-4 findings;
- users can consistently distinguish card, printing/version, and owned copy;
- no database, migration, RPC, auth, RLS, or remote mutation scope appears in the final diff.

## 11. Supporting plugin and skill strategy

The implementation does not require a large plugin stack. The smallest useful set is:

### Already installed and directly useful

- `design-taste-frontend`: cohesive visual hierarchy, spacing, anti-card-overuse, and interaction-state discipline.
- `web-design-guidelines`: accessibility, focus, content resilience, safe-area, motion, and interaction audit checklist. Its web-specific HTML rules must be translated to Flutter semantics rather than copied literally.
- `image-to-code`: reference-image analysis and implementation comparison for visually important screens.
- `awesome-design`: visual-system comparison and token inspiration. It is not a usability authority.
- `playwright-cli`: valuable for later mobile-web parity and browser journeys, but not a substitute for Flutter widget tests or physical Samsung testing.

### Useful directory plugins, if the workflow needs them

- **Figma**: best addition when the approved mockups and component states should become a collaborative design source of truth. Use it for component variants, interactive prototypes, annotations, and design-to-implementation comparison.
- **Linear**: best addition when heuristic findings, screen phases, acceptance criteria, and regressions need durable issue tracking across implementation and review.
- **Data Analytics**: useful only after Grookai has an approved event model and privacy-safe product telemetry. It can help analyze funnels and failure points, but it should not be connected merely to make a visual redesign.
- **Notion**: optional for shared research and usability notes. The repository plan should remain authoritative for engineering execution, so Notion is not required.

Do not install plugins simply because they are design-adjacent. Figma and Linear are the only immediately useful external integrations for this project; analytics becomes useful only with approved data.

### Recommended repository-specific skill

Create a focused `grookai-usability-review` skill before implementation if repeated audits will continue. It should package:

- the five-item navigation and shell-mode contract;
- the card/printing/copy terminology rules;
- Jakob’s Law mental models for each screen;
- Nielsen heuristic scoring and severity definitions;
- the six critical task flows;
- Samsung viewport and enlarged-text checks;
- exact-printing, privacy, and mutation boundaries;
- a standard audit output containing evidence, severity, affected task, recommendation, and verification.

This skill would improve consistency more than another visual-inspiration plugin because it would make every future Grookai review use the same product-specific usability standard.

## 12. External references

- [Jakob’s Law of Internet User Experience](https://www.nngroup.com/videos/jakobs-law-internet-ux/)
- [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [OpenAI plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [OpenAI skills and repeatable workflows](https://developers.openai.com/plugins/concepts/skills)
