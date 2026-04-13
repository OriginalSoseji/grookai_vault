# EXPLORE DRAWER SHARE AND GVID V1

## Purpose
Finish the Explore drawer by exposing canonical identity (GVID), enabling immediate canonical-card sharing, and preserving image-first inspection.

## Scope Lock
- Explore drawer only
- no ownership-link redesign
- no header/search/filter changes
- no tile overlay changes

## Canonical Link Audit
- explore result identity field: `CardPrint.gvId` in [lib/models/card_print.dart](/Users/cesarcabral/grookai_vault/lib/models/card_print.dart)
- gvid availability: present on Explore card results as `gv_id` -> `gvId`
- canonical public route used: `/card/<gvId>` via [lib/services/navigation/grookai_web_route_service.dart](/Users/cesarcabral/grookai_vault/lib/services/navigation/grookai_web_route_service.dart)
- existing share helper available? no
- notes:
  - the web app treats `/card/${gv_id}` as the canonical public card route
  - the mobile app already has `GrookaiWebRouteService.buildUri(...)` for canonical URL generation
  - the Explore drawer artwork already uses `CardSurfaceArtwork`, which preserves tap-to-zoom through the shared card zoom viewer
