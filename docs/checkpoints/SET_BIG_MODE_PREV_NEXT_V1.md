SET BIG MODE PREV NEXT V1

Purpose

Make fullscreen card viewing in set-mode browsing support previous/next cards using the exact current visible ordering.

Flow Audit
- set-mode screen owner: `lib/screens/sets/public_set_detail_screen.dart`
- card tap owner: `_SetCardTile` / `_SetCardGridTile` plus `CardSurfaceArtwork`
- fullscreen viewer owner: `lib/widgets/card_zoom_viewer.dart` via `showCardImageZoom(...)`
- current limitation: fullscreen viewer only receives one `label` + `imageUrl`, so it has no ordered-list context and cannot move to adjacent cards
- likely implementation path: preserve `detail.cards` as the ordered source of truth, pass the tapped index into an upgraded gallery-capable fullscreen viewer, and keep the viewer query-free

Ordered Source of Truth
- list owner: `PublicSetDetailScreen._detail.cards`
- index owner: set/grid item builder index in `PublicSetDetailScreen`
- same ordering preserved?: yes, if the screen passes `detail.cards` and tapped `index` directly into the fullscreen viewer without rebuilding or resorting the list
