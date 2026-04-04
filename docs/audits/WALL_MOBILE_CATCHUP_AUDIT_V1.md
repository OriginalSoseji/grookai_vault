# WALL_MOBILE_CATCHUP_AUDIT_V1

## OBJECTIVE
Audit the authoritative Wall/public collector surface on web and the current Flutter/mobile state, identify the contract gap without guessing intent from memory, and define a deterministic phased merge path for mobile Wall catch-up.

Scope rules used for this audit:

- Repository evidence only.
- Wall/public collector/public collection surfaces only.
- No implementation beyond this artifact.
- No compare, founder tools, pricing-engine internals unrelated to Wall UI, broad catalog/search redesign, or unrelated vault work.

Primary evidence files audited for this artifact:

- Web route entry files:
  - `apps/web/src/app/u/[slug]/page.tsx`
  - `apps/web/src/app/u/[slug]/collection/page.tsx`
  - `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`
  - `apps/web/src/app/wall/page.tsx`
- Web presentational/action components:
  - `apps/web/src/components/public/PublicCollectorHeader.tsx`
  - `apps/web/src/components/public/PublicCollectorProfileContent.tsx`
  - `apps/web/src/components/public/PublicCollectionGrid.tsx`
  - `apps/web/src/components/public/PublicCollectionEmptyState.tsx`
  - `apps/web/src/components/public/PublicPokemonJumpForm.tsx`
  - `apps/web/src/components/public/FollowCollectorButton.tsx`
  - `apps/web/src/components/public/FeaturedWallSection.tsx`
  - `apps/web/src/components/network/ContactOwnerButton.tsx`
- Web helper/type layer:
  - `apps/web/src/lib/getPublicProfileBySlug.ts`
  - `apps/web/src/lib/getSharedCardsBySlug.ts`
  - `apps/web/src/lib/sharedCards/publicWall.shared.ts`
  - `apps/web/src/lib/sharedCards/wallCategories.ts`
  - `apps/web/src/lib/network/intent.ts`
  - `apps/web/src/lib/follows/getCollectorFollowCounts.ts`
  - `apps/web/src/lib/follows/getCollectorFollowState.ts`
- Flutter/mobile surfaces and contracts:
  - `lib/main.dart`
  - `lib/services/vault/vault_card_service.dart`
  - `lib/models/card_print.dart`
  - `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`

## WEB WALL AUDIT
Authoritative public Wall surfaces:

- `apps/web/src/app/u/[slug]/page.tsx`
  - Public collector profile route.
  - This is the closest thing to the authoritative public Wall shell because it combines collector identity, shared collection, and in-play cards.
- `apps/web/src/app/u/[slug]/collection/page.tsx`
  - Public shared-collection route.
- `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`
  - Public filtered collection route.

Important non-authoritative Wall-adjacent route:

- `apps/web/src/app/wall/page.tsx`
  - Private authenticated recent-vault-activity feed.
  - This route is named `wall`, but it is not the public collector Wall/product surface that mobile needs to inherit.

Route files and data/helper layer:

- `getPublicProfileBySlug(slug)`
  - Reads `public_profiles`.
  - Enforces `public_profile_enabled`.
  - Returns collector identity fields: `user_id`, `slug`, `display_name`, `vault_sharing_enabled`, `created_at`, `avatar_url`, `banner_url`.
- `getSharedCardsBySlug(slug)`
  - Public Wall/shared collection read contract.
  - Reads `public_profiles`, `shared_cards`, `card_prints`, `sets`, `vault_item_instances`, `slab_certs`, and `v_card_stream_v1`.
  - Produces `PublicWallCard[]` with collection identity, ownership summary, wall metadata, and discoverable state merged.
- `getInPlayCardsBySlug(slug)`
  - Reads `public_profiles` plus `v_card_stream_v1`.
  - Produces `PublicWallCard[]` specialized for discoverable in-play cards.
- `getCollectorFollowCounts(userId)`
  - Reads `collector_follows`.
- `getCollectorFollowState(followerUserId, followedUserId)`
  - Reads `collector_follows`.
- `PublicWallCard` in `publicWall.shared.ts`
  - Canonical web card contract for Wall-like public collection surfaces.
  - Includes identity, collection ownership, wall category, public note, in-play intent counts, discoverable copy metadata, and optional exact-copy routing via `gv_vi_id`.

Presentational components:

- `PublicCollectorHeader`
- `PublicCollectorProfileContent`
- `PublicCollectionGrid`
- `PublicCollectionEmptyState`
- `PublicPokemonJumpForm`
- `FollowCollectorButton`
- `ContactOwnerButton`

Reusable but not currently mounted in the authoritative routes:

- `FeaturedWallSection`
  - Uses `PublicWallCard`.
  - Supports category filtering over `wall_category`.
  - It is present in the repo but not referenced by the current `/u/[slug]` routes.
  - It should be treated as available reusable UI, not as the active product contract.

Major UI sections in render order:

1. `/u/[slug]` public profile route:
   - `PublicCollectorHeader`
   - `PublicCollectionEmptyState` when sharing is off
   - `PublicCollectionEmptyState` when both shared and in-play are empty
   - else `PublicCollectorProfileContent`
2. `PublicCollectorProfileContent` render order:
   - segment toggle: `Collection` / `In Play`
   - collection segment:
     - collection intro card
     - `PublicPokemonJumpForm`
     - density toggle
     - `PublicCollectionGrid` or collection empty state
   - in-play segment:
     - in-play intro card
     - aggregated trade/sell/showcase badges
     - discoverable card grid
     - optional exact-copy details / grouped contact actions per tile
     - in-play empty state
3. `/u/[slug]/collection` route adds:
   - `PublicCollectorHeader`
   - `View profile` link
   - collection-only `PublicCollectorProfileContent`
4. `/u/[slug]/pokemon/[pokemon]` route adds:
   - `PublicCollectorHeader`
   - Pokémon-filter summary card
   - links back to profile and full collection
   - `PublicPokemonJumpForm`
   - `PublicCollectionGrid` or empty state
5. `/wall` private route render order:
   - recent-activity hero card
   - explicit error state if `v_recently_added` fails
   - explicit empty state if feed is empty
   - recent activity feed cards linking to `/card/[gv_id]`

Action surfaces present on web:

- Follow / unfollow collector.
- Login-to-follow fallback.
- Segment toggle between `Collection` and `In Play`.
- Density toggle for collection grids.
- Pokémon jump/filter form.
- Open public card / exact copy.
- Open individual discoverable copy from `details`.
- Contact owner for trade, buy, or showcase flows.
- View profile / collection navigation links on collection and Pokémon routes.

Conditional states on web:

- Missing or non-public profile calls `notFound()`.
- `vault_sharing_enabled === false` renders `Collection not shared yet`.
- No shared cards and no in-play cards renders `No cards yet`.
- In-play segment defaults active only when in-play cards exist.
- Contact actions are hidden on the owner's own profile.
- Grouped contact CTA is shown only when multiple discoverable copies collapse to one actionable anchor.
- `FeaturedWallSection` exists but is not currently part of route render order.

Loading, error, and empty states on web:

- No `loading.tsx` or `error.tsx` files are present under `apps/web/src/app/u`.
- Public collector routes rely on server render + `notFound()` + `PublicCollectionEmptyState`.
- `/wall` private recent-activity route has:
  - explicit error state
  - explicit empty state

Web authority conclusion:

- The authoritative public Wall surface is the `/u/[slug]` family, not `/wall`.
- The public web Wall depends on explicit collector, sharing, follow, and discoverable-card contracts.
- The active public surface already includes identity, segmentation, public collection, in-play intent signaling, and contact affordances.

## FLUTTER WALL AUDIT
Current Flutter/mobile Wall entry state:

- No dedicated public Wall, public collector profile, or public shared-collection screen was found in `lib`.
- Repo search across `lib` for `public`, `profile`, `collector`, `shared`, `follow`, `showcase`, `trade`, `sell`, and `wall` returns no current Flutter public Wall surface.
- The nearest Wall-adjacent mobile surface is the authenticated private `VaultPage` in `lib/main.dart`.

Current entry file(s):

- `lib/main.dart`
  - `AppShell` exposes three tabs: `Catalog`, `Scan`, and `Vault`.
  - `VaultPage` is the only current collector-like surface in mobile.
- `lib/services/vault/vault_card_service.dart`
  - Supplies `VaultPage` data through `getCanonicalCollectorRows(client: supabase)`.
- `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`
  - Defines the RPC contract used by `VaultPage`.

Whether Wall is absent, partial, or represented through another screen:

- Public Wall is absent on Flutter/mobile.
- A private vault collector list exists, but it is a different product surface and different data model.
- The mobile collector-like surface is private inventory management, not public collector presentation.

Current widget composition:

- `AppShell`
  - app bar with refresh/logout
  - bottom navigation: Catalog, Scan, Vault
- `VaultPage`
  - search field
  - sort menu
  - loading spinner or empty text
  - `ListView.separated`
  - `_VaultItemTile`
- `_VaultItemTile`
  - card thumb
  - name
  - set + number subtitle
  - GV-ID line
  - condition chip
  - quantity text
  - scan / increment / decrement actions
  - tap-through to `CardDetailScreen`

Current data path:

- `VaultPage.reload()`
  - calls `VaultCardService.getCanonicalCollectorRows(client: supabase)`
- `VaultCardService.getCanonicalCollectorRows`
  - calls RPC `vault_mobile_collector_rows_v1`
- `vault_mobile_collector_rows_v1`
  - authenticated private read over the current user's active vault instances
  - returns:
    - `id`
    - `vault_item_id`
    - `card_id`
    - `gv_id`
    - `condition_label`
    - `created_at`
    - `name`
    - `set_name`
    - `number`
    - `photo_url`
    - `image_url`
    - `owned_count`
    - `gv_vi_id`

Visible sections on Flutter/mobile today:

1. Search + sort controls.
2. Loading spinner or empty state text.
3. Private vault inventory rows.
4. Floating scan action when the Vault tab is active.

Action controls on Flutter/mobile today:

- Scan a card from Vault.
- Increase quantity.
- Decrease quantity.
- Swipe-to-delete.
- Open `CardDetailScreen`.
- Add from catalog picker.

Loading, error, and empty states on Flutter/mobile:

- Loading:
  - explicit `CircularProgressIndicator` in `VaultPage`.
- Empty:
  - explicit `No items found.` text.
- Error:
  - no explicit error surface in `VaultPage.reload()`.
  - failed collector-row loads are not mapped to a Wall-style error state.

Reusable mobile subcomponents relevant to this audit:

- `_VaultItemTile`
- `VaultCardService.getCanonicalCollectorRows`
- `VaultCardIdentity`

Flutter authority conclusion:

- There is no current Flutter public Wall authority to catch up.
- The nearest mobile surface is private vault inventory.
- The divergence is not a styling drift between two existing Wall screens; it is a surface absence plus a contract mismatch.

## WALL GAP MATRIX
| Domain | Web | Flutter | Status | Notes |
| --- | --- | --- | --- | --- |
| profile header / collector identity | `PublicCollectorHeader` with avatar, banner, display name, slug, joined date, follow counts, stats, and follow CTA | No public collector header; only app-level `Catalog` / `Grookai Vault` app-bar titles | ABSENT_ON_FLUTTER | Mobile has no public profile route or slug-based collector identity surface |
| featured cards / showcase | In-play segment surfaces showcase counts; `FeaturedWallSection` exists as reusable UI but is not mounted on current routes | No public showcase or featured-card surface | ABSENT_ON_FLUTTER | Do not treat unused `FeaturedWallSection` as current parity contract |
| public collection grid | `PublicCollectionGrid` renders shared cards using `PublicWallCard[]` | `VaultPage` renders a private inventory list from `vault_mobile_collector_rows_v1` | DIFFERENT_MODEL | Mobile has a collector-like list, but it is private inventory, not public shared collection |
| trade / sell / showcase signals | Aggregated in-play badges plus per-card intent counts and labels | None | ABSENT_ON_FLUTTER | No mobile contract for `intent`, `trade_count`, `sell_count`, or `showcase_count` |
| wall filters / tabs / segmentation | Collection / In Play segment toggle; Pokémon jump/filter route; density toggle | Search + sort over private vault rows | DIFFERENT_MODEL | Mobile controls inventory browsing, not public Wall segmentation |
| card action affordances | Open card, open exact copy, view copies, follow, density, Pokémon jump | Open card detail, scan, qty increment/decrement, delete, add via catalog | DIFFERENT_MODEL | Mobile actions are private vault management actions |
| contact / interaction affordances | `ContactOwnerButton` for trade/buy/showcase; follow/unfollow collector | None | ABSENT_ON_FLUTTER | No contact or follow path exists in Flutter |
| ownership proof / counts | Public owned counts, raw/slab summary, discoverable copies, graded copy metadata | Private `owned_count`, `condition_label`, and optional `gv_vi_id` | DIFFERENT_MODEL | Both surfaces show counts, but the meaning and exposure model differ |
| recent activity / highlights | Separate private `/wall` recent-vault-activity feed exists | Private Vault list sorts newest by default but is not an activity feed | DIFFERENT_MODEL | Web recent activity is its own route; Flutter has no Wall highlight surface |
| loading state | Public routes rely on server render; `/wall` private route has load result states without route-level loading files | Explicit spinner in `VaultPage` | DIFFERENT_MODEL | Public Wall and private vault loading patterns are not aligned |
| empty state | `Collection not shared yet`, `No cards yet`, `No cards in play yet`, Pokémon-filter no-match | `No items found.` | DIFFERENT_MODEL | Mobile empty state reflects private inventory search, not public Wall states |
| error state | `notFound()` for missing public profile; explicit `/wall` feed error | No explicit `VaultPage` error UI | WEB_RICHER | Mobile lacks a dedicated collector-surface error state |

## DEPENDENCY / CONTRACT TRACE
Relevant web helpers, types, and dependencies:

- `getPublicProfileBySlug`
  - base collector identity contract
  - source: `public_profiles`
- `getSharedCardsBySlug`
  - shared/public collection contract
  - sources:
    - `public_profiles`
    - `shared_cards`
    - `card_prints`
    - `sets`
    - `vault_item_instances`
    - `slab_certs`
    - `v_card_stream_v1`
- `getInPlayCardsBySlug`
  - discoverable/in-play contract
  - sources:
    - `public_profiles`
    - `v_card_stream_v1`
- `PublicWallCard`
  - current active web Wall card type
  - includes identity, ownership summary, wall metadata, and discoverable metadata in one card contract
- `getCollectorFollowCounts`
  - source: `collector_follows`
- `getCollectorFollowState`
  - source: `collector_follows`
- `DiscoverableVaultIntent`
  - intent taxonomy used for trade/sell/showcase UI
- `WallCategory`
  - category taxonomy present in repo
  - currently active in type/helper layer and `FeaturedWallSection`, but not mounted by the authoritative `/u/[slug]` routes

Relevant Flutter repositories/services/models/dependencies:

- `VaultPage` in `lib/main.dart`
  - current collector-like mobile surface
- `VaultCardService.getCanonicalCollectorRows`
  - current mobile collector-row read
- `vault_mobile_collector_rows_v1`
  - current mobile collector-row RPC
  - private/authenticated only
  - returns inventory-management fields, not public collector fields
- `CardPrint` in `lib/models/card_print.dart`
  - catalog card identity model
  - useful for card detail/catalog, but not a public Wall contract

Current contract gaps blocking Wall parity on Flutter:

- No Flutter contract for:
  - `PublicProfile`
  - `PublicWallCard`
  - `collector_follows`
  - discoverable in-play intent counts
  - `public_note`
  - `wall_category`
  - public `vault_sharing_enabled` gate
- No Flutter route keyed by public collector slug.
- No Flutter surface consuming `v_card_stream_v1` for public Wall rendering.
- No Flutter follow/contact action path.

Divergence classification:

- Public collector identity: surface-absent and contract-missing.
- Shared collection grid: different-model and contract-missing.
- In-play / trade / sell / showcase: surface-absent and contract-missing.
- Follow/contact: surface-absent and contract-missing.
- Overall Wall divergence is not presentation-only.

Cardinal contract/rule constraints for safe mobile Wall work:

- Do not treat `/wall` as the authoritative public Wall surface; it is a private feed.
- Do not repurpose `vault_mobile_collector_rows_v1` as a public Wall contract.
- Respect `public_profile_enabled` and `vault_sharing_enabled` gates before rendering collector/public collection surfaces.
- Follow state and contact affordances require viewer identity and owner identity; they are not purely presentational.
- `FeaturedWallSection` is reusable but not active route contract; do not make it the first parity target unless web mounts it first.

## PHASED MERGE PLAN
### P1 — Wall Entry Surface
- Target files:
  - `lib/main.dart`
  - new dedicated Flutter Wall screen file under `lib/` because no authoritative mobile Wall file exists today
- Change type:
  - establish a distinct mobile Wall entry surface
  - add slug-based public collector entry routing
  - render loading / not-found / not-shared / empty shell states
- Risk level:
  - Medium
- Dependency risk:
  - Medium
  - Requires the smallest truthful public collector read contract before the shell is useful
- Safe verification method:
  - open Wall in simulator from a known slug
  - verify loading, missing-profile, and not-shared states
  - confirm Catalog / Scan / Vault flows still work

### P2 — Collector Identity + Featured Surface
- Target files:
  - dedicated Flutter Wall screen
  - new Flutter model/helper files for public collector identity only if needed
- Change type:
  - render collector header parity first
  - add top-of-surface structure for the collector view
  - if a featured strip is added, keep it read-only and derived from the active web contract, not from unused category assumptions
- Risk level:
  - Medium
- Dependency risk:
  - Medium to High
  - Requires a mobile read contract for `public_profiles`
- Safe verification method:
  - verify collector name, slug, avatar/banner fallback, joined/follow counts, and empty collection shell in simulator

### P3 — Collection / Intent Surface
- Target files:
  - dedicated Flutter Wall screen
  - new Flutter collection tile/list widgets
  - new Flutter service/model layer for public collection cards
- Change type:
  - render shared collection
  - add collection vs in-play segmentation
  - surface trade / sell / showcase signals and ownership summaries
- Risk level:
  - High
- Dependency risk:
  - High
  - Requires mobile equivalents of `getSharedCardsBySlug`, `getInPlayCardsBySlug`, `PublicWallCard`, and `DiscoverableVaultIntent`
- Safe verification method:
  - verify collection counts, segment switching, intent badges, and card navigation from the simulator

### P4 — Interaction Surface
- Target files:
  - dedicated Flutter Wall screen
  - follow/contact action widgets
  - supporting Flutter service/action files for follow/contact if supported
- Change type:
  - add follow/unfollow affordance
  - add owner-contact pathways
  - add richer exact-copy / grouped-copy actions only if the contract supports them
- Risk level:
  - High
- Dependency risk:
  - High
  - Requires viewer-aware follow/contact contracts and authenticated state handling
- Safe verification method:
  - verify signed-out vs signed-in states
  - verify own-profile suppression rules
  - verify follow/contact CTA state transitions and failure states

## RECOMMENDED FIRST SLICE
Smallest safe first mobile Wall slice:

- Implement `P1 — Wall Entry Surface` as a dedicated read-only public collector shell keyed by slug.
- Limit the first slice to:
  - public collector identity read
  - header shell
  - loading / not-found / not-shared / empty states
  - no collection cards, no in-play cards, no follow/contact actions yet

Why this is the safest first slice:

- High visibility:
  - it creates the missing public Wall entry surface immediately
- Low risk:
  - it avoids the heavy shared-card, in-play, follow, and contact contracts
- Aligned with Grookai's interaction/network direction:
  - it establishes the collector-facing public identity surface that all later collection and interaction work depends on
- Easy to verify in simulator:
  - one slug-based route with deterministic state branches

Why a pure presentation-only first slice is not available:

- Flutter currently has no public Wall entry contract to restyle.
- The smallest truthful mobile Wall step requires a minimal public collector read before UI parity work can begin.

## NOTES / DO NOT ASSUME
- Do not assume `/wall` on web is the public Wall target for mobile parity. Repo evidence shows it is a private recent-activity feed.
- Do not assume `FeaturedWallSection` is current product behavior. It exists in the repo but is not mounted by the authoritative public collector routes.
- Do not assume Flutter Vault equals Wall. `VaultPage` is private inventory management backed by `vault_mobile_collector_rows_v1`.
- Do not assume Wall parity is presentation-only. The active public web surface depends on contracts Flutter does not currently have.
- Do not assume trade / sell / showcase, follow, or contact affordances can be added safely before a public collector read contract exists.
