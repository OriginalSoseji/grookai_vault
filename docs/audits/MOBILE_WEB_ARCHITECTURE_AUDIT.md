# MOBILE WEB ARCHITECTURE AUDIT

## GLOBAL SHELL

- The web app currently uses one shared root shell across all breakpoints in [layout.tsx](/c:/grookai_vault/apps/web/src/app/layout.tsx).
- That shell always renders:
  - [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx)
  - a single `<main>` wrapped in [PageContainer.tsx](/c:/grookai_vault/apps/web/src/components/layout/PageContainer.tsx)
  - a shared footer
- [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx) is top-header based:
  - sticky top bar
  - brand link
  - pill-style primary nav (`Explore`, `Sets`, `Compare`, `Vault`)
  - optional inline top search for `/explore`, `/search`, and `/card/[gv_id]`
  - account/profile links
- The shell is shared/generic, not mobile-specific:
  - there is no dedicated mobile header component
  - there is no mobile bottom nav in `apps/web/src`
  - there is no web `matchMedia`, `useMediaQuery`, `isMobile`, or bottom-nav shell implementation in `apps/web/src` by repository search
- [PageContainer.tsx](/c:/grookai_vault/apps/web/src/components/layout/PageContainer.tsx) applies the same `maxWidth: 1280` and `paddingLeft/Right = spacing.xl` to all breakpoints.
- [designTokens.ts](/c:/grookai_vault/apps/web/src/styles/designTokens.ts) defines `spacing.xl = 24px`, so the default app shell inherits desktop-friendly horizontal chrome and spacing even on smaller screens.

## PUBLIC PROFILE SURFACE

- Public profile routes are already server-data-first and presentation-composed:
  - [apps/web/src/app/u/[slug]/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/page.tsx)
  - [apps/web/src/app/u/[slug]/collection/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/collection/page.tsx)
  - [apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx)
- Server data loading is already separated:
  - [getPublicProfileBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getPublicProfileBySlug.ts) resolves profile identity and media
  - [getSharedCardsBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getSharedCardsBySlug.ts) resolves public wall/collection rows
- Presentation is already componentized:
  - [PublicCollectorHeader.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectorHeader.tsx)
  - [FeaturedWallSection.tsx](/c:/grookai_vault/apps/web/src/components/public/FeaturedWallSection.tsx)
  - [PublicCollectionGrid.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectionGrid.tsx)
- The profile routes already compose these layers in order:
  - header
  - featured wall
  - collection
- That means public profile already has a clean server/presentation split:
  - route loads data once on the server
  - downstream visual surfaces are separate components
  - mobile/desktop divergence can happen inside those presentational components without changing route contracts
- The pokemon-filtered profile route in [apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx) follows the same pattern:
  - server route loads and filters shared cards
  - shared presentation layer renders the collection grid

## VAULT SURFACE

- The vault route is also already split between server data loading and client presentation:
  - [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
  - [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) is the server boundary:
  - authenticates user
  - calls [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
  - reads shared-card/profile/image tables
  - normalizes server data into `VaultCardData[]`
  - passes plain props into [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) is the presentation-and-interaction seam:
  - marked `"use client"`
  - owns view state, search state, density state, modals, smart views, optimistic UI, and action wiring
  - renders the compact header, vault cards section, search controls, density toggle, and recently added lane
- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx) is already a leaf presentation component that receives normalized row data plus callbacks.
- This is strong evidence that vault mobile divergence can happen at the presentation wrapper level:
  - `VaultCollectionView` can branch mobile vs desktop layout
  - `VaultCardTile` can remain shared or receive minor density/layout variants
  - server reads, normalized data shape, and server actions do not need to move

## MOBILE REFERENCE MODEL

- The repository already contains a mobile app-shell reference in Flutter at [lib/main.dart](/c:/grookai_vault/lib/main.dart).
- The actual mobile shell is `AppShell` in [lib/main.dart](/c:/grookai_vault/lib/main.dart):
  - uses `Scaffold`
  - uses `IndexedStack` to preserve tab state
  - uses `NavigationBar` as bottom navigation
  - destinations are `Catalog`, `Scan`, and `Vault`
- This is explicit repository evidence of a bottom-nav mobile interaction model.
- The repo also contains corroborating audit evidence in [UI_AUDIT_REPORT_V1.md](/c:/grookai_vault/docs/audits/UI_AUDIT_REPORT_V1.md), but the primary evidence is the live Flutter code in [lib/main.dart](/c:/grookai_vault/lib/main.dart).
- Under Jakob’s Law, this is the strongest repo-backed candidate for a future web-mobile shell pattern.

## VERIFIED FINDINGS

1. The web app currently has one shared root shell across breakpoints.
2. That shell is top-header based and sticky.
3. The web app does not currently have a dedicated mobile shell.
4. The public profile surface already separates server data loading from presentation composition.
5. The vault surface already separates server data loading from client presentation and interaction.
6. The Flutter app already establishes a bottom-nav mobile shell pattern in-repo.
7. The public profile and vault surfaces are already componentized enough to support presentation-layer divergence without changing backend plumbing.

## CONFIRMED GAPS

- Missing mobile-specific web shell:
  - no bottom nav
  - no mobile route chrome
  - no dedicated mobile header
- Shared desktop-oriented shell inheritance:
  - [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx) is the same on all breakpoints
  - [PageContainer.tsx](/c:/grookai_vault/apps/web/src/components/layout/PageContainer.tsx) applies fixed 24px horizontal padding globally
- Public profile still inherits the same generic web shell above the collector-specific presentation.
- Vault still inherits the same generic web shell above a large, dense client view that was clearly composed for shared/desktop behavior first:
  - compacted recently, but still one client view serving all breakpoints
  - smart views, search, density toggle, and section stacking all live in one component
- There is no repo evidence of a current breakpoint-level web shell switch or mobile-only route wrapper in `apps/web/src/app`.

## SAFE SPLIT BOUNDARIES

- Safe to split:
  - [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx) into desktop/mobile presentation variants behind the same root layout contract
  - public profile presentation components:
    - [PublicCollectorHeader.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectorHeader.tsx)
    - [FeaturedWallSection.tsx](/c:/grookai_vault/apps/web/src/components/public/FeaturedWallSection.tsx)
    - [PublicCollectionGrid.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectionGrid.tsx)
  - vault presentation components:
    - [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
    - [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- Safe split pattern:
  - same route file
  - same server data loader
  - same normalized props
  - different desktop/mobile presentational wrappers or subcomponents
- Public profile route files are already good split seams because they fetch once, then compose display components.
- The vault route is already a good split seam because the server page resolves data once, then hands the interactive UI off to one client entry component.

## BOUNDARIES THAT MUST REMAIN SHARED

- Must remain shared:
  - [layout.tsx](/c:/grookai_vault/apps/web/src/app/layout.tsx) as the root route tree entrypoint
  - route paths and route files under `apps/web/src/app`
  - server data loaders:
    - [getPublicProfileBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getPublicProfileBySlug.ts)
    - [getSharedCardsBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getSharedCardsBySlug.ts)
    - [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
  - normalized data contracts passed into client components
  - current server actions and mutations used by vault
  - public wall/shared-card storage model
  - backend auth and Supabase plumbing
- Unsafe split points:
  - duplicating server routes for mobile vs desktop
  - forking backend contracts per breakpoint
  - changing canonical data loaders just to serve different layout structure

## AUDIT CONCLUSION

## A. Mobile divergence is feasible as a presentation-only initiative

- The repository does **not** show backend coupling that blocks mobile-specific web presentation.
- The correct pattern, based on current repo architecture, is:
  - same backend
  - same routes
  - same data contracts
  - same mutations
  - different presentation/layout by window or breakpoint
- The strongest safe split points are:
  - global shell chrome in [SiteHeader.tsx](/c:/grookai_vault/apps/web/src/components/layout/SiteHeader.tsx)
  - public profile presentation components under `apps/web/src/components/public`
  - vault presentation components under `apps/web/src/components/vault`
- The strongest shared boundaries that should remain untouched are:
  - route-level server loaders
  - normalized data contracts
  - server actions
  - Supabase/backend plumbing
- Operationally, the repo already supports a mobile-web initiative that diverges at the presentation layer while preserving desktop behavior and backend stability.
