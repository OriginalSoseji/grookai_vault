OWNERSHIP PASS AUDIT V1

Purpose

Audit the entire mobile app for ownership awareness so Grookai can later feel smart everywhere a card appears.

Repo Guard
	•	working directory: /Users/cesarcabral/grookai_vault
	•	.git present: yes
	•	audit only: yes
	•	no implementation performed: yes

## Card Surface Inventory

### Explore / Search catalog cards
- surface name: Explore curated cards + Explore search results
- owner file: `lib/main.dart`
- route/entry: `AppShell.explore -> HomePage -> _buildCatalogCard`
- card type shown: canonical card prints
- notes: curated trending and searched cards share the same card surface; tap goes to `_openSearchCardActionHub`.

### Explore / Search action drawer
- surface name: Explore action hub bottom sheet
- owner file: `lib/main.dart`
- route/entry: `HomePage._openSearchCardActionHub -> _SearchResultActionSheet`
- card type shown: canonical card print with ownership actions
- notes: this is the current ownership-aware layer for Explore and Search.

### Canonical card detail
- surface name: Card detail
- owner file: `lib/card_detail_screen.dart`
- route/entry: opened from Explore, Network, Sets, Compare, Public Collector, GVVI, scanner flows
- card type shown: canonical card print
- notes: supports optional caller-provided vault/contact/exact-copy context.

### Card detail related versions sheet
- surface name: Card family / other versions sheet
- owner file: `lib/card_detail_screen.dart`
- route/entry: `CardDetailScreen._openOtherVersions`
- card type shown: canonical related card prints
- notes: opens nested `CardDetailScreen` instances with canonical props only.

### Vault grid / list
- surface name: Vault grouped collection grid + list
- owner file: `lib/main_vault.dart`
- route/entry: `AppShell.vault -> VaultPage`
- card type shown: collector-owned grouped canonical cards
- notes: includes grouped views like All, Wall, Dupes, Recent, Sets, Pokemon.

### Manage Card
- surface name: Manage Card control center
- owner file: `lib/screens/vault/vault_manage_card_screen.dart`
- route/entry: from Vault grid, Card Detail, Private GVVI
- card type shown: grouped owned canonical card with exact-copy inventory
- notes: segmented into `Overview`, `Wall`, and `Copies`.

### Private GVVI
- surface name: Private exact-copy screen
- owner file: `lib/screens/vault/vault_gvvi_screen.dart`
- route/entry: direct add flow, Manage Card copies, Explore drawer owned-copy jump
- card type shown: owned exact copy
- notes: current exact-copy source of truth for private ownership.

### My Wall / public collector wall cards
- surface name: My Wall public card grid + public collector wall
- owner files: `lib/main_shell.dart`, `lib/screens/public_collector/public_collector_screen.dart`
- route/entry: `AppShell.wall -> _MyWallTab -> PublicCollectorScreen`, and direct `PublicCollectorScreen(slug: ...)`
- card type shown: public collector-owned cards and public exact-copy anchors
- notes: My Wall resolves the current user's public slug first, then reuses the public collector wall surface.

### Public GVVI
- surface name: Public exact-copy screen
- owner file: `lib/screens/gvvi/public_gvvi_screen.dart`
- route/entry: from Public Collector wall, Card Detail, Network exact-copy opens
- card type shown: public exact copy
- notes: owner, intent, price, note, and inquiry path live here.

### Network feed interaction cards
- surface name: Network feed cards + copy picker sheet
- owner files: `lib/screens/network/network_screen.dart`, `lib/services/network/network_stream_service.dart`
- route/entry: `AppShell.network -> NetworkScreen`
- card type shown: mixed source rows: collector wall cards, collector in-play cards, canonical DB discovery cards
- notes: cards can open canonical detail or public/private GVVI depending on row source and copy state.

### Compare workspace cards
- surface name: Compare card previews
- owner file: `lib/screens/compare/compare_screen.dart`
- route/entry: Compare workspace
- card type shown: canonical public cards
- notes: compare cards open `CardDetailScreen` with canonical props.

### Public set detail cards
- surface name: Set detail card grid + list
- owner file: `lib/screens/sets/public_set_detail_screen.dart`
- route/entry: `PublicSetDetailScreen(setCode: ...)`
- card type shown: canonical public cards inside a set
- notes: taps open `CardDetailScreen`.

### Messaging inbox card tiles
- surface name: Messages inbox thread cards
- owner file: `lib/screens/network/network_inbox_screen.dart`
- route/entry: `NetworkInboxScreen`
- card type shown: card-anchored conversation summaries
- notes: cards are the conversation anchor, not ownership surfaces.

### Messaging thread header
- surface name: Messages thread card header
- owner file: `lib/screens/network/network_thread_screen.dart`
- route/entry: `NetworkThreadScreen(thread: ...)`
- card type shown: card context header for a conversation
- notes: compact card block above the message list.

### Scanner identify candidates
- surface name: Scanner candidate list
- owner file: `lib/screens/scanner/scan_identify_screen.dart`
- route/entry: `ScanIdentifyScreen`
- card type shown: candidate canonical cards returned by identify flow
- notes: tapping immediately adds the candidate to the vault.

## Ownership Classification

### Explore / Search catalog cards
- classification: Partially Ownership Aware
- evidence: `HomePage._loadTrending` and `_runSearch` populate `_ownedCountsByCardId` through `VaultCardService.getOwnedCountsByCardPrintIds`, but `_buildCatalogCard` passes only canonical card + pricing into the visible tile and ownership shows up only after tap.
- exact signals present: current-user owned counts are preloaded; tap path is ownership-aware.
- exact signals missing: visible tile-level owned signal, wall state, in-play state, exact-copy shortcut without opening the drawer.

### Explore / Search action drawer
- classification: Ownership Aware
- evidence: `_SearchResultActionSheet` changes CTA labels from `Add to Vault` to `Add another copy`, shows `View your copy`, supports `Remove from Vault`, and uses `_resolveLatestOwnedCopyTarget` / `_resolveOwnedCardAnchor` for deterministic private-copy jumps.
- exact signals present: canonical owned/not-owned, owned count, exact-copy jump, add-another-copy, remove-one-copy.
- exact signals missing: wall state and in-play state are not surfaced.

### Canonical card detail
- classification: Inconsistent
- evidence: `_hasVaultContext` depends on `widget.quantity` / `widget.condition`, `_hasExactCopyContext` depends on `widget.exactCopyGvviId`, and `_loadActionContext` only deepens ownership when an exact-copy or contact context is already injected by the caller.
- exact signals present: `In your vault`, `Manage card`, `Exact copy`, and collector actions can appear when upstream callers pass ownership context.
- exact signals missing: the screen does not resolve ownership from `cardPrintId` on its own, so the same canonical card can be ownership-aware or ownership-blind depending on entry path.

### Card detail related versions sheet
- classification: Ownership Blind
- evidence: `_openOtherVersions` constructs new `CardDetailScreen` routes with canonical card props only.
- exact signals present: none.
- exact signals missing: owned count, exact-copy awareness, wall/in-play awareness.

### Vault grid / list
- classification: Ownership Aware
- evidence: `reload()` pulls grouped collector rows from `vault_mobile_collector_rows_v1`, merges shared wall state through `getSharedStatesByCardPrintIds`, displays quantity/condition, and routes to `VaultManageCardScreen` with `ownedCount`, `gvviId`, and canonical identity.
- exact signals present: grouped ownership, count, wall filter, grouped-manage jump.
- exact signals missing: direct exact-copy jump from the tile itself and explicit in-play signaling.

### Manage Card
- classification: Ownership Aware
- evidence: `VaultCardService.loadManageCard` resolves grouped card truth, copies, in-play count, wall state, price mode, and primary shared GVVI, then `VaultManageCardScreen` exposes those across `Overview`, `Wall`, and `Copies`.
- exact signals present: canonical ownership, count, exact-copy list, wall state, in-play state, intent.
- exact signals missing: none at the grouped-card layer.

### Private GVVI
- classification: Ownership Aware
- evidence: `VaultGvviService.loadPrivate` resolves exact-copy data including `activeCopyCount`, `intent`, `isSharedOnWall`, `publicProfileEnabled`, `vaultSharingEnabled`, outcomes, notes, and media; `VaultGvviScreen` surfaces wall/public/manage actions at the top.
- exact signals present: exact-copy ownership, grouped count, wall/public state, intent, private/public jump.
- exact signals missing: none at the exact-copy layer.

### My Wall / public collector wall cards
- classification: Partially Ownership Aware
- evidence: `PublicCollectorService.loadBySlug` returns `collectionCards` and `inPlayCards`, with `gvviId`, `intent`, `publicNote`, price mode, and `inPlayCopies`; tiles open `PublicGvviScreen` when an exact-copy id exists.
- exact signals present: public owner card ownership, public exact-copy anchors, wall intent, in-play segmentation.
- exact signals missing: total owned count, viewer-owned same-card awareness, private-copy jump for the current user, stronger self-path when this is My Wall.

### Public GVVI
- classification: Partially Ownership Aware
- evidence: `VaultGvviService.loadPublic` resolves the public exact copy, owner, intent, discoverability, price mode, note, and media; `PublicGvviScreen` exposes `Inquire about this card`.
- exact signals present: public exact-copy ownership and public presentation truth.
- exact signals missing: viewer-owned canonical awareness, viewer-owned count, viewer jump to their own copy when they also own the card.

### Network feed interaction cards
- classification: Inconsistent
- evidence: `NetworkStreamService` mixes `collectorWall`, `collectorInPlay`, `dbHighEnd`, and `dbRandomExplore` rows; collector rows carry public ownership state and `inPlayCopies`, while discovery rows are canonical DB cards with no ownership subject.
- exact signals present: public owner intent, public in-play copy counts, public exact-copy open path, discovery source labels.
- exact signals missing: unified viewer ownership awareness, one consistent ownership contract across collector and discovery rows, explicit same-card ownership intelligence for the current user.

### Compare workspace cards
- classification: Ownership Blind
- evidence: `CompareScreen` fetches `ComparePublicCard` rows and only opens canonical `CardDetailScreen`.
- exact signals present: none.
- exact signals missing: owned count, exact-copy jump, wall/in-play state.

### Public set detail cards
- classification: Ownership Blind
- evidence: `PublicSetDetailScreen` renders canonical `PublicSetCard` tiles and routes straight to canonical `CardDetailScreen`.
- exact signals present: none.
- exact signals missing: owned count, exact-copy jump, wall/in-play state.

### Messaging inbox card tiles
- classification: Ownership Blind
- evidence: `NetworkInboxScreen` renders `CardInteractionThreadSummary` with card art, card name, counterpart, and thread status only.
- exact signals present: card context only.
- exact signals missing: owned count, exact-copy jump, wall/in-play state.

### Messaging thread header
- classification: Ownership Blind
- evidence: `NetworkThreadScreen` shows compact card context and a `View card` link, but does not resolve any ownership state for the current user.
- exact signals present: card context only.
- exact signals missing: owned count, exact-copy jump, wall/in-play state.

### Scanner identify candidates
- classification: Ownership Blind
- evidence: `ScanIdentifyScreen` candidate taps call `_addToVault` immediately through `VaultCardService.addOrIncrementVaultItem` without checking owned counts first.
- exact signals present: add-to-vault only.
- exact signals missing: already-owned state, count, exact-copy jump, wall/in-play state.

## Ownership Layer Audit

| Surface | Canonical ownership | Count awareness | Exact-copy awareness | Wall awareness | In-play awareness | Self vs other awareness | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Explore / Search catalog cards | yes | yes | no | no | no | no | `_ownedCountsByCardId` is loaded for current user, but the visible tile does not surface it directly. |
| Explore / Search action drawer | yes | yes | yes | no | no | no | `ownedCount`, `View your copy`, and deterministic GVVI resolution are all wired here. |
| Vault grid / list | yes | yes | yes | yes | no | yes | grouped collector rows include count and `gv_vi_id`; shared wall state is merged separately. |
| Canonical card detail | no | no | yes | no | no | yes | exact-copy and self/other behavior exist only when caller props inject that context. |
| Card detail related versions sheet | no | no | no | no | no | no | opens canonical detail only. |
| Manage Card | yes | yes | yes | yes | yes | yes | `loadManageCard` resolves grouped ownership, copies, intent, wall state, and counts. |
| Private GVVI | yes | yes | yes | yes | yes | yes | `loadPrivate` is private exact-copy truth. |
| My Wall / public collector wall cards | yes | no | yes | yes | yes | yes | public owner exact-copy state is known; My Wall is a self entry path but tile behavior stays public. |
| Public GVVI | yes | no | yes | yes | yes | yes | public exact-copy truth is known and inquiry hides for self via `ContactOwnerButton`. |
| Network feed interaction cards | yes | yes | yes | yes | yes | no | collector rows know public ownership layers; discovery rows do not, which is the inconsistency. |
| Compare workspace cards | no | no | no | no | no | no | canonical compare only. |
| Public set detail cards | no | no | no | no | no | no | canonical set browsing only. |
| Messaging inbox card tiles | no | no | no | no | no | no | thread summary is card-context only. |
| Messaging thread header | no | no | no | no | no | no | thread header is card-context only. |
| Scanner identify candidates | no | no | no | no | no | no | add flow is blind to existing ownership. |

## Ownership Source Audit

- existing ownership-related services:
  - `lib/services/vault/vault_card_service.dart`
  - `lib/services/vault/vault_gvvi_service.dart`
  - `lib/services/public/public_collector_service.dart`
  - `lib/services/network/network_stream_service.dart`
  - `lib/services/network/card_interaction_service.dart` for card-anchored messaging context only

- existing ownership-related models:
  - `VaultManageCardData`
  - `VaultManageCardCopy`
  - `VaultOwnedCardAnchor`
  - `VaultOwnedCopyTarget`
  - `VaultSharedCardState`
  - `VaultGvviData`
  - `PublicGvviData`
  - `PublicCollectorCard`
  - `PublicCollectorCopy`
  - `NetworkStreamRow`
  - `NetworkStreamCopy`

- existing helper / resolver functions:
  - `VaultCardService.getOwnedCountsByCardPrintIds`
  - `VaultCardService.resolveOwnedCardAnchor`
  - `VaultCardService.resolveLatestOwnedCopyTarget`
  - `VaultCardService.loadManageCard`
  - `VaultCardService.getSharedStatesByCardPrintIds`
  - `VaultGvviService.loadPrivate`
  - `VaultGvviService.loadPublic`
  - `PublicCollectorService._fetchPrimarySharedGvviByCardId`
  - `PublicCollectorService._fetchPublicDiscoverableCopiesByCardId`
  - `NetworkStreamService._fetchInPlayCopies`
  - `NetworkStreamService.getOwnershipSummary`

- where counts come from:
  - canonical owned counts for current user come from `vault_owned_counts_v1`
  - grouped manage counts come from `vault_mobile_card_copies_v1` plus fallback counts passed from callers
  - public/network quantity and in-play counts come from `v_card_stream_v1` and `public_discoverable_card_copies_v1`

- where exact-copy routes come from:
  - private exact-copy routes come from `gv_vi_id` and `vault_mobile_instance_detail_v1`
  - deterministic private owned-copy jumps come from `resolveLatestOwnedCopyTarget`
  - public exact-copy routes come from `public_shared_card_primary_gvvi_v1`, `public_discoverable_card_copies_v1`, and `public_vault_instance_detail_v1`

- where wall / in-play state comes from:
  - grouped wall state comes from `shared_cards` and `VaultCardService.getSharedStatesByCardPrintIds`
  - exact-copy public visibility comes from `VaultGvviData.isSharedOnWall`
  - intent / in-play state comes from `vault_items.intent`, per-copy intents, `v_card_stream_v1`, and public discoverable copy wrappers

- duplication / drift risks:
  - canonical ownership counts are centralized, but only Explore/Search consumes them today
  - exact-copy resolution is centralized in `VaultCardService`, but caller UIs still carry fallback logic and comments in `main.dart`
  - `CardDetailScreen` is prop-driven instead of resolver-driven, which creates path-dependent ownership behavior
  - primary shared GVVI lookup is implemented in both `VaultCardService` and `PublicCollectorService`
  - discoverable/public copy mapping is implemented in both `PublicCollectorService` and `NetworkStreamService`
  - intent normalization and intent labels are duplicated across vault, public, network, and UI layers
  - public card surfaces know the public owner's relationship to the card, while Explore knows the viewer's relationship to the card; there is no shared envelope that can express both cleanly

## Unified Ownership Contract V1

- fields:
  - `owned`: `bool` — at least one active, non-archived canonical ownership row exists for the contract subject and `card_print_id`
  - `ownedCount`: `int` — active copy count for that same subject/card pair
  - `primaryVaultItemId`: `String?` — active grouped vault anchor when one exists
  - `primaryGvviId`: `String?` — deterministic best exact-copy target when one can be proven
  - `hasExactCopy`: `bool` — whether a stable exact-copy jump target exists now
  - `onWall`: `bool` — whether the subject currently has a shared/public wall presentation for this card
  - `inPlay`: `bool` — whether at least one active copy is expressing a discoverable intent now
  - `isSelfContext`: `bool` — whether the ownership subject is the signed-in user
  - `bestJumpAction`: `OwnershipJumpAction` — one of `add_to_vault`, `view_your_copy`, `add_another_copy`, `open_manage_card`, `none`

- recommended companion metadata:
  - `cardPrintId`: always required
  - `gvId`: optional canonical public id
  - `subjectUserId`: optional but important for public surfaces so `owned` is never ambiguous
  - `surfaceOwnerUserId`: optional when the surface is about another collector

- meaning:
  - canonical ownership is: does the contract subject own this canonical card at all?
  - exact-copy ownership is: can the app prove a specific active instance and route to it now?
  - wall awareness is: does the subject currently expose or share the card publicly?
  - in-play awareness is: is at least one active copy expressing `trade`, `sell`, or `showcase` rather than `hold`?

- source-of-truth expectations:
  - `owned` and `ownedCount` should come from a single resolver rooted in `card_print_id` plus ownership subject, not from caller props
  - `primaryVaultItemId` should come from the active vault anchor
  - `primaryGvviId` should come from the deterministic exact-copy ladder already proven in `resolveLatestOwnedCopyTarget`
  - `onWall` should come from grouped shared state or exact-copy public state, not from UI text
  - `inPlay` should come from intent/discoverability data, not from badge wording
  - `bestJumpAction` should be computed once in the resolver layer, not reimplemented per screen

- what should be optional:
  - `primaryVaultItemId` and `primaryGvviId` must be nullable
  - public surfaces may have `subjectUserId` for the public owner but no private vault ids for the viewer
  - a surface can still consume `owned`, `ownedCount`, `hasExactCopy`, and `bestJumpAction` safely even when private ids are absent

- what every surface can depend on:
  - a stable `owned` bool
  - a stable `ownedCount` int
  - a stable `hasExactCopy` bool
  - a stable `bestJumpAction`
  - nullable private ids instead of guessing

- governance note:
  - public surfaces and private surfaces should not overload the same `owned` bit without a subject. The later rollout should evaluate this contract for an explicit subject user so the app can carry both public-owner truth and viewer-owned truth where needed.

## Surface Rules

### Explore / Search catalog cards
- ownership depth required: lightweight canonical ownership + count
- preferred UI signal: keep the tile clean; surface ownership in the drawer first, not as heavy tile chrome
- jump action expected: `view_your_copy` if owned, otherwise `add_to_vault`
- notes: this surface already protects image-first browsing, so later ownership rollout should stay quiet here

### Explore / Search action drawer
- ownership depth required: canonical ownership + count + deterministic exact-copy jump
- preferred UI signal: CTA swap, `View your copy`, `Add another copy`, `Remove from Vault`
- jump action expected: private GVVI first, Manage Card fallback only when exact-copy truth cannot be proven
- notes: this is already the closest thing to a shared ownership-aware surface

### Canonical card detail
- ownership depth required: full canonical ownership awareness
- preferred UI signal: concise ownership summary under the hero with one obvious next action
- jump action expected: `view_your_copy` or `open_manage_card`
- notes: this surface must stop depending on caller-injected ownership props

### Vault grid / list
- ownership depth required: grouped ownership-native
- preferred UI signal: existing count/wall structure stays primary
- jump action expected: `open_manage_card`
- notes: later rollout is mostly contract adoption and cleanup, not behavior expansion

### Manage Card
- ownership depth required: full grouped-card ownership awareness
- preferred UI signal: Overview is the grouped source of truth; Wall and Copies remain focused tabs
- jump action expected: `open_manage_card` is already the destination; copies tab then fans out to exact copies
- notes: consume the same contract later so grouped state stops being re-derived ad hoc

### Private GVVI
- ownership depth required: full exact-copy awareness
- preferred UI signal: exact-copy hero remains primary, grouped state stays supportive
- jump action expected: `view_your_copy` lands here directly
- notes: this is the terminal surface for proven exact-copy truth

### My Wall / public collector wall cards
- ownership depth required: public owner awareness first, viewer-owned same-card awareness second
- preferred UI signal: public intent stays primary; any viewer-owned signal should be quiet
- jump action expected: open public GVVI first; later allow self viewer shortcut when appropriate
- notes: My Wall should not look like a private surface, even when the viewer is the owner

### Public GVVI
- ownership depth required: public exact-copy awareness plus optional viewer-owned same-card awareness
- preferred UI signal: keep owner + intent + price primary, add quiet viewer-owned bridge later
- jump action expected: public inquiry remains primary; optional `View your copy` bridge later
- notes: this is where public exact-copy truth and viewer-owned truth need to coexist cleanly

### Network feed interaction cards
- ownership depth required: lightweight mixed-source awareness
- preferred UI signal: subtle source-aware ownership summary, never heavy admin UI
- jump action expected: open public/private exact copy when the row has one; canonical card otherwise
- notes: discovery rows and collector rows need one shared ownership envelope before UI consistency is possible

### Compare workspace cards
- ownership depth required: lightweight canonical ownership + count
- preferred UI signal: quiet owned chip or count near each compared card
- jump action expected: `view_your_copy` from the compared card if owned
- notes: compare should stay analytical, not turn into a control panel

### Public set detail cards + related versions
- ownership depth required: lightweight canonical ownership + count
- preferred UI signal: small owned marker or count
- jump action expected: open drawer or canonical detail with ownership-aware state
- notes: these are discovery rails, so the signal should stay glanceable

### Messaging inbox + thread card context
- ownership depth required: lightweight canonical ownership only
- preferred UI signal: quiet ownership hint at most
- jump action expected: `view_your_copy` is optional and secondary to the conversation
- notes: card context should stay primary over ownership chrome here

### Scanner identify candidates
- ownership depth required: canonical ownership + count
- preferred UI signal: `Already in vault` / `Add another copy`
- jump action expected: still allow immediate add, but with truthful existing-ownership context
- notes: low-traffic surface, but easy win once the shared contract exists

## Rollout Plan

### P0
- surfaces:
  - shared ownership resolver layer
  - Explore / Search cards + action drawer
  - canonical Card Detail
  - Network feed interaction cards
- why:
  - these are the most visible discovery and decision surfaces
  - they currently split ownership truth across counts, props, and source-specific row models
  - fixing these first changes the product feel immediately

### P1
- surfaces:
  - Public GVVI
  - My Wall / Public Collector wall cards
- why:
  - these are the highest-value public surfaces after discovery
  - they already know public-owner truth, but they do not bridge cleanly into viewer-owned truth
  - this is where self-vs-other behavior needs to become intentional

### P2
- surfaces:
  - Vault grid / list
  - Manage Card
  - Private GVVI
  - Compare workspace
  - Public set detail cards
  - card detail related versions
- why:
  - these surfaces are already partially or fully ownership-native
  - the main need here is contract adoption and consistency, not brand-new capability
  - this is the cleanup layer that prevents future drift

### P3
- surfaces:
  - Messaging inbox cards
  - Messaging thread header
  - Scanner identify candidates
  - any remaining edge discovery rails
- why:
  - these are lower-frequency or secondary-entry surfaces
  - they should become ownership-aware eventually, but they are not the first collector pain point

## Audit Integrity Check

- files intentionally changed:
  - checkpoint only: `docs/checkpoints/OWNERSHIP_PASS_AUDIT_V1.md`

- implementation changes made:
  - none

- note:
  - the repository already had many pre-existing modified files before this audit
  - this pass did not intentionally edit application code, schemas, or UI logic
