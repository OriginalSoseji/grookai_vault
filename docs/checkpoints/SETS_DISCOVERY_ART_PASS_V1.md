SETS DISCOVERY ART PASS V1

Purpose

Apply a quiet set-art treatment to the Start here rail using hero_image_url without making the screen feel loud.

Current Rail Audit
- owner file: `lib/screens/sets/public_sets_screen.dart`
- tile widget owner: `_SetDiscoveryTile`
- current tile visual structure: compact premium tile with gradient base, icon, code, set name, metadata, and card count
- hero image availability path: not yet mapped into `PublicSetSummary`; needs to come from `sets.hero_image_url`
- likely quiet-art insertion point: background layer inside `_SetDiscoveryTile`, beneath the existing text hierarchy

Data Path
- model field: `PublicSetSummary.heroImageUrl`
- tile access path: `setInfo.heroImageUrl`
- null behavior today: gradient-only tile already works as a clean no-image fallback
- safe to render art now?: yes, once `hero_image_url` is included in the existing public sets fetch path
