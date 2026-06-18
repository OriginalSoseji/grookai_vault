# Grookai App Source Of Truth UI Audit V1

Date: 2026-06-17

Status: audit only

No database writes, migrations, routing changes, pricing changes, vault mutations, or UI implementation changes were performed for this audit.

## Objective

Use the actual Grookai app as the visual and interaction source of truth, then identify where the website and web app need to move so the product feels like one premium collector platform.

The user preference is clear:

```text
The actual app is the product experience to match.
The website and web app should converge toward it.
```

## Source Of Truth

Primary app files reviewed:

- `lib/main.dart`
- `lib/main_shell.dart`
- `lib/widgets/card_surface_artwork.dart`
- `lib/widgets/card_surface_price.dart`
- `lib/widgets/card_view_mode.dart`
- `lib/screens/dex/grookai_dex_screen.dart`
- `lib/screens/sets/public_sets_screen.dart`
- `lib/card_detail_screen.dart`

Primary web files reviewed:

- `apps/web/src/app/globals.css`
- `apps/web/src/styles/designTokens.ts`
- `apps/web/src/components/layout/SiteHeader.tsx`
- `apps/web/src/components/layout/MobileBottomNav.tsx`
- `apps/web/src/components/cards/PokemonCardGridTile.tsx`
- `apps/web/src/components/explore/ExploreCardGridItem.tsx`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/app/dex/page.tsx`
- `apps/web/src/app/sets/page.tsx`
- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/features/vault/components/VaultCollectionView.tsx`

## App Design Rules To Preserve

### 1. Behavior-First Navigation

The actual app primary navigation is:

```text
Search, Feed, Scan, Wall, Vault
```

This is documented in `lib/main_shell.dart` as the bottom navigation direction. Scan is a central primary action. Profile/account is not treated as a bottom-nav destination.

### 2. Compact Premium Surfaces

The app uses rounded, quiet surfaces instead of heavy dashboard panels.

Typical app patterns:

- radii around `14`, `18`, and `22`
- subtle borders using low-alpha outline colors
- low, soft shadows
- no stacked card-inside-card composition
- surface cards that feel touchable but not loud

### 3. Typography Hierarchy

The app favors confident but compact hierarchy:

- app title and section titles use `700` to `800` weight
- metadata is small, calm, and secondary
- labels are compact with light letter spacing
- card names and collection states get priority over diagnostics

### 4. Static Card Imagery

The actual app card imagery pattern is static and contained:

- preserved card aspect ratio
- centered image
- no internal scroll frame
- optional click/tap zoom behavior
- fallback state remains quiet

### 5. Dex And Sets Are Collector Views

The app Dex and Sets screens use:

- emphasized top surface
- progress or discovery context
- search and filters near the top
- row/card items with soft surface styling
- clear collection progress

They do not read like admin tables.

## Main Web Mismatches

### 1. Mobile Navigation Does Not Match The App

Current web mobile nav is:

```text
Search, Feed, Wall, Vault, Profile
```

Actual app nav is:

```text
Search, Feed, Scan, Wall, Vault
```

This is the strongest cohesion gap. It makes the web app feel like a different product.

Recommended fix:

- replace Profile with Scan in primary mobile nav
- make Scan the center action
- move Profile/account into header, drawer, or account menu

### 2. Dex Landing Still Feels Like A Web Table

The web Dex landing currently uses a table-like structure with columns such as number, Pokemon, owned, and completion.

The app Dex uses progress-first cards and species rows with:

- Pokemon Progress hero
- shown/started/open counters
- owned/total printings
- percentage progress
- clean row cards

Recommended fix:

- redesign web Dex landing around the app Dex pattern
- preserve the completion percentage on the landing page
- use app-style species tiles instead of table rows

### 3. Sets Page Is Too Generic

The web Sets page uses a conventional page intro and result area. The app Sets screen feels more like a discovery surface with search, filters, and set cards.

Recommended fix:

- rebuild Sets landing around the app pattern
- include a stronger collection/discovery header
- use horizontal filters and premium set tiles
- make the page feel like a collector catalog, not a directory

### 4. Search Cards Expose Too Much Database Detail

Search and explore tiles currently expose technical identity details such as printing IDs and diagnostic labels too prominently.

These are useful, but they should not dominate the normal collector experience.

Recommended fix:

- keep GV-ID and printing ID available
- move them into a quieter footer, disclosure, copy control, or detail state
- make card name, set, finish, image confidence, ownership, and value the primary visual hierarchy

### 5. Dark Mode Is Still Patchy

The web global CSS has broad dark-mode overrides. This can fix some pages while leaving white blocks or mismatched surfaces elsewhere.

Recommended fix:

- move toward shared surface primitives
- stop relying on one-off dark overrides
- require every page shell, card, panel, and modal to consume the same tokenized surface classes

### 6. Card Detail Is Closest, But Not Yet The Whole Product

The card detail page now has the right direction:

- product hero
- static card image
- image modal
- pricing rail
- variant/finish selector
- add-to-vault action

This should become the model for the rest of the web experience, not a one-off page.

### 7. Vault Is Stronger Than Other Web Areas, But Still Diverges

Vault has richer interaction and stats, but still contains many hardcoded visual classes and local styling decisions.

Recommended fix:

- migrate Vault surfaces and controls to the same shared Grookai primitives
- keep functionality stable
- make it visually match Dex, Sets, Search, and Card Detail

## Recommended Implementation Plan

### Phase 1 - Web Shell Parity

Goal: make the web app immediately feel like the real app.

Tasks:

- update mobile bottom nav to `Search, Feed, Scan, Wall, Vault`
- make Scan the center primary action
- move Profile out of primary bottom navigation
- align header spacing, surface, and typography with app shell
- keep desktop navigation usable, but make it feel more app-like

Why first:

Navigation is global. Fixing it makes every page feel less fragmented.

### Phase 2 - Shared Visual Primitives

Goal: stop page-by-page styling drift.

Tasks:

- align CSS tokens to app radii, surfaces, shadows, and spacing
- formalize shared classes for:
  - app shell
  - soft surface
  - collection card
  - image stage
  - compact metric
  - primary action
  - quiet metadata
  - segmented controls
- reduce hardcoded white backgrounds and dark-mode exceptions

### Phase 3 - Dex Landing Redesign

Goal: make Dex reflect the real app and the user vault state.

Tasks:

- replace table layout with app-style species cards
- keep percent completion visible on the Dex landing page
- preserve search and filtering
- show owned/total progress per species
- keep mobile dense but touch-friendly

### Phase 4 - Sets Redesign

Goal: make Sets feel like a collector catalog.

Tasks:

- add app-style top surface
- use collection/discovery stats
- make search and filters feel native
- redesign set tiles around progress and release identity

### Phase 5 - Search And Card Grid Polish

Goal: make search feel premium and less database-heavy.

Tasks:

- prioritize image, card name, set, finish, price, ownership
- make diagnostics secondary
- preserve image-confidence honesty
- improve missing-image and representative-image display copy

### Phase 6 - Vault Visual Alignment

Goal: keep Vault powerful but make it visually consistent.

Tasks:

- replace local hardcoded surfaces with shared primitives
- preserve smart views and collection tools
- verify dark mode across every Vault state

### Phase 7 - Card Detail Final Pass

Goal: keep Card Detail as the premium card page standard.

Tasks:

- verify image modal always overlays the full page
- ensure no internal image scrolling returns
- add special variant explanations where data exists
- keep Add to Vault as primary action

### Phase 8 - Cohesion QA

Goal: make the website feel usable end to end.

Tasks:

- run link integrity audit
- test all primary nav links
- test representative set pages
- test Dex landing and species pages
- test card detail with pricing, no pricing, exact image, representative image, and missing image
- test light and dark mode
- test mobile and desktop layouts

## Acceptance Standard

The web and web app should feel like the same product as the actual app.

That means:

- same primary navigation model
- same surface language
- same card-first collector hierarchy
- same Dex progress model
- same image confidence honesty
- same premium restraint
- no admin-table feel on collector surfaces

## Recommended Next Step

Start with Phase 1 and Phase 2 together:

```text
Web shell parity plus shared visual primitives.
```

This gives the rest of the redesign a stable foundation and prevents another round of page-specific styling drift.
