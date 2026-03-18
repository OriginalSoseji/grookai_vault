# MOBILE JAKOB'S LAW UX CONTRACT V1

## STATUS

DEFINED

## SOURCE OF TRUTH

- Repository evidence from [MOBILE_WEB_ARCHITECTURE_AUDIT.md](/c:/grookai_vault/docs/audits/MOBILE_WEB_ARCHITECTURE_AUDIT.md)
- Current shared web shell in [layout.tsx](/c:/grookai_vault/apps/web/src/app/layout.tsx) and [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx)
- Current public profile presentation seams:
  - [page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/page.tsx)
  - [page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/collection/page.tsx)
  - [PublicCollectorHeader.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectorHeader.tsx)
  - [FeaturedWallSection.tsx](/c:/grookai_vault/apps/web/src/components/public/FeaturedWallSection.tsx)
  - [PublicCollectionGrid.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectionGrid.tsx)
- Current vault presentation seam:
  - [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
  - [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- Mobile reference model already present in [main.dart](/c:/grookai_vault/lib/main.dart) via Flutter `AppShell` and `NavigationBar`

## 1. CORE PRODUCT POSTURE

Mobile Grookai is:

> Identity + Inventory + Showcase

Mobile Grookai is not:

> database viewer

This contract assumes the current backend, routes, data loaders, and server actions remain shared with desktop.

## 2. PRIMARY NAVIGATION MODEL

Mobile web must use bottom navigation as the primary app-shell model.

Final mobile tab set:

```text
Vault | Explore | Wall | Profile
```

Route mapping:

| Tab | Route | Role |
| --- | --- | --- |
| Vault | `/vault` | inventory |
| Explore | `/explore` | discovery |
| Wall | `/u/[slug]` | showcase |
| Profile | `/account` | identity + settings |

Contract rules:

- Bottom nav is persistent across mobile routes.
- Active tab is always visible.
- Bottom nav is thumb-accessible and always present on core mobile surfaces.
- Mobile must not rely on the current desktop top-header nav as the primary navigation model.

## 3. SURFACE ROLE CONTRACT

### Vault

Vault behaves like a portfolio/inventory app.

Mental model:

- Collectr-style inventory
- fast scan of owned cards
- compact, utility-first

Behavior rules:

- dense card grid
- search near the top
- inline actions
- minimal padding
- no oversized header
- no marketing copy
- no need for the current desktop density toggle on mobile

### Explore

Explore behaves like a discovery feed.

Mental model:

- Instagram home
- lightweight TikTok-style visual feed

Behavior rules:

- visual-first
- scroll-first
- minimal chrome
- quick tap-through into card detail
- avoid heavy filter panels on first mobile pass

### Wall

Wall behaves like a social showcase/feed hybrid.

Mental model:

- Instagram profile grid + showcase feed

Behavior rules:

- vertical scroll first
- Featured Wall is the lead section
- category chips are horizontally scrollable
- cards are larger than vault cards
- emphasis is on slabs, grails, and collector taste
- showcase takes priority over density

### Profile

Profile behaves like an identity surface.

Mental model:

- Instagram profile

Behavior rules:

- banner
- avatar
- username
- compact stats
- wall visible immediately after identity
- collection is secondary
- avoid long text blocks

## 4. HEADER CONTRACT

Mobile header behavior must diverge from the current desktop shell.

Allowed:

- no top header on some mobile surfaces
- minimal top bar
- compact title row
- inline search for vault and explore

Forbidden:

- reusing the full desktop [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx) as-is
- large stacked title/subtitle header blocks
- duplicate top navigation plus bottom navigation

Header rule:

- content must win vertical space over chrome

## 5. SPACING AND DENSITY CONTRACT

Mobile spacing must tighten materially relative to the current shared shell.

Global rules:

- reduce padding roughly 40-60% versus current desktop-oriented shell inheritance
- reduce vertical rhythm
- prioritize one primary section per viewport

Grid rules:

- vault uses compact density by default
- wall uses medium density
- profile identity uses stacked, readable spacing rather than wide desktop spacing

## 6. CARD INTERACTION CONTRACT

All mobile cards are tap-first.

Rules:

- full-width touch-friendly targets
- immediate visual feedback
- tap opens detail
- actions must be reachable without precision cursor behavior

Future-ready but not required in V1:

- long press
- swipe gestures

## 7. CATEGORY INTERACTION CONTRACT

Wall category chips must behave like lightweight story/feed filters.

Rules:

- horizontal scroll on mobile
- immediate client-side update
- minimal friction
- visible active state

The current category model remains shared with desktop:

- same `wall_category`
- same labels
- same data source

## 8. NAVIGATION BEHAVIOR CONTRACT

Navigation must feel app-like on mobile.

Rules:

- bottom nav persists across core routes
- active destination always visible
- route changes do not require a hidden menu to discover core navigation

Forbidden:

- top-nav + bottom-nav duplication as co-equal systems
- hamburger-first primary navigation for the core app

## 9. WHAT DISAPPEARS ON MOBILE

The following should be removed or materially reduced on mobile presentation:

- current desktop top-header dominance
- excessive top padding
- multi-column desktop section chrome
- secondary descriptive copy that delays card content
- low-priority control clusters that compete with cards

## 10. WHAT BECOMES PRIMARY ON MOBILE

Mobile prioritizes:

- wall
- cards
- identity
- scrolling

This means the mobile experience should surface content before chrome.

## 11. SYSTEM ARCHITECTURE RULE

Mobile divergence must remain presentation-only.

Must remain unchanged:

- backend
- routes
- queries
- server actions
- data contracts
- auth model
- public wall storage model

Allowed divergence:

- shell
- header behavior
- section order emphasis
- spacing
- grid density
- presentation wrappers
- breakpoint-specific component variants

## 12. REPO-ALIGNED SPLIT RULE

The safe mobile split must follow the current repo seams established in the audit.

Shared route/data seams remain:

- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/page.tsx)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/collection/page.tsx)
- [getPublicProfileBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getPublicProfileBySlug.ts)
- [getSharedCardsBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getSharedCardsBySlug.ts)
- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)

Mobile presentation split is allowed at:

- [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx)
- [PublicCollectorHeader.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectorHeader.tsx)
- [FeaturedWallSection.tsx](/c:/grookai_vault/apps/web/src/components/public/FeaturedWallSection.tsx)
- [PublicCollectionGrid.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectionGrid.tsx)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)

## 13. DESIGN NORTH STAR

Mobile Grookai should feel like:

> Instagram for identity and flow

plus

> Collectr for cards, inventory, and future value context

This is not a literal clone contract. It is a behavior contract:

- familiar bottom-nav app shell
- scroll-first content
- profile identity that feels personal
- card-first inventory and showcase behavior

## 14. SUCCESS CRITERIA

Mobile succeeds when:

- it feels like an app immediately
- core navigation requires zero explanation
- cards appear before chrome
- wall feels like a destination
- vault feels like inventory, not a dashboard page
- profile feels like identity, not settings overflow
- users want to keep scrolling

## CONTRACT RESULT

Mobile architecture direction is now defined as:

- bottom-nav app shell
- identity-first profile
- wall as showcase
- vault as compact inventory
- explore as discovery feed
- presentation-layer divergence only

This contract is implementation-ready as a behavioral north star, but it does not authorize code changes by itself.
