# OWNERSHIP ROLLOUT P1 PUBLIC SURFACES V1

## Purpose
Add viewer-owned awareness to public card surfaces while preserving public-owner truth as the primary context.

## Scope Lock
- public GVVI
- public collector wall
- viewer-owned bridge only
- no resolver changes
- no backend/schema changes

## Surface Audit
- public GVVI owner file: `lib/screens/gvvi/public_gvvi_screen.dart`
- public collector wall owner file: `lib/screens/public_collector/public_collector_screen.dart`
- current owner-first elements:
  - Public GVVI hero artwork, intent chip row, owner identity row, canonical card row, inquiry CTA, price row, public note/media
  - Public collector wall header/profile, segmented collection vs in-play view, owner-first wall card presentation, wall card tap into `PublicGvviScreen`
- current viewer-awareness present/absent:
  - Public GVVI: absent
  - Public collector wall tiles: absent
  - Existing ownership resolver adapter exists and is not yet used on either public surface
- safe insertion points:
  - Public GVVI: below owner/card path rows and around the inquiry/action region
  - Public collector wall cards: inside the compact metadata/supporting area on each card tile, staying badge-level only
