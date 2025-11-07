# Grookai Vault – Scan Overview

This document inventories screens/routes, themes, colors, animations, and data flows.

## Screens & Routes (owner widgets)
- App shell and routing: `lib/ui/app/app.dart`, `lib/ui/app/routes.dart`
- Explore feed: `lib/features/explore/explore_feed_page.dart`, widgets under `lib/features/explore/widgets/`
- Wall feed: `lib/features/wall/wall_feed_page.dart`, helpers under `lib/features/wall/widgets/`
- Search: `lib/features/search/unified_search_page.dart`, `lib/features/search/unified_search_sheet.dart`
- Card Detail: `lib/features/pricing/card_detail_page.dart`
- Dev diagnostics: `lib/features/dev/diagnostics_page.dart`, pricing diagnostics under `lib/features/dev/diagnostics/`
- Scanner: `lib/features/scan/*` and `lib/features/scanner/*`

## Theme & Tokens
- Existing theme bridges: `lib/ui/app/theme.dart`, `GVTheme`
- New Thunder Aesthetic tokens: `lib/theme/thunder_palette.dart`, theme: `lib/theme/thunder_theme.dart`

## Color usages
- Common inline colors found in:
  - Explore widgets (gradients, backdrops)
  - Diagnostics banners (amber/red withOpacity)
  - Misc. chip/button tints
- Plan: replace with theme tokens (Thunder.base/surface/onSurface/accent)

## Animations & Visual Effects
- Blur/backdrop: `ImageFiltered`, `BackdropFilter` in explore widgets
- Hero transitions for images in explore cards
- Added `ThunderGlow` for subtle accent aura on interaction

## Data Flows (screen → service/edge)
- Explore Feed → `WallFeedService` (HTTP) and `wall_feed_v` REST
- Wall Feed → REST `wall_feed_v` (image_url, dimensions)
- Search → `SearchGateway` then `PricesRepository` for async price attach
- Card Detail → `PriceService` (`latestIndex`, `latestFloors`, `latestGvBaseline`, `indexHistory`, `latestSold5`)
- Edge: `thumb_maker` (writes public thumbs), `ebay_sold_engine` (stub)

