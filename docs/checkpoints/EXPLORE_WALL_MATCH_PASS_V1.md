# EXPLORE WALL MATCH PASS V1

## Purpose
Make Explore card presentation match My Wall so Grookai uses one consistent card visual language.

## Scope Lock
- card presentation only
- no Explore behavior changes
- no header/drawer/filter changes

## Wall Reference Audit
- wall grid source: [`lib/screens/public_collector/public_collector_screen.dart`](/Users/cesarcabral/grookai_vault/lib/screens/public_collector/public_collector_screen.dart) `_PublicCardTileList`
- wall card widget source: [`lib/screens/public_collector/public_collector_screen.dart`](/Users/cesarcabral/grookai_vault/lib/screens/public_collector/public_collector_screen.dart) `_PublicCardTile`
- wall cross-axis count: dynamic, but current phone widths resolve to `2`
- wall spacing: `6` horizontal and `6` vertical via `Wrap(spacing: 6, runSpacing: 6)`
- wall aspect ratio: artwork `AspectRatio(0.69)` with `borderRadius: 22`
- wall caption rhythm:
- `6` below artwork
- title block fixed to `40`
- `3` below title
- meta/price row fixed to `22`
- `5` below meta row
- chip row fixed to `22`
- wall card visual notes:
- no extra image shadow wrapper
- artwork uses `CardSurfaceArtwork(... backgroundColor: surfaceContainerLow alpha 0.52, padding: 1.5, borderRadius: 22)`
- title uses `titleMedium`, weight `800`, height `1.04`, letter spacing `-0.3`
- meta uses `labelSmall`, weight `600`, alpha `0.60`

## Explore Current Card Surface
- explore grid source: [`lib/main.dart`](/Users/cesarcabral/grookai_vault/lib/main.dart) `_buildCatalogResultsSliver`
- explore card widget source: [`lib/main.dart`](/Users/cesarcabral/grookai_vault/lib/main.dart) `_CatalogCardGridTile`
- differences vs wall:
- outer grid padding `16` instead of `10`
- grid spacing `12` instead of `6`
- artwork corners `16` instead of `22`
- extra image shadow wrapper not used on Wall
- title is single-line and lighter than Wall
- no fixed caption rhythm blocks, so footprint feels smaller and looser
- exact fields that must be aligned:
- grid outer padding
- row/column spacing
- artwork aspect ratio and framing
- title/meta/price spacing
- overall tile footprint and visual weight
