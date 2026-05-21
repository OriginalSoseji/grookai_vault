# LOCAL_COMMUNITY_FEED_V1 Mobile Nearby Integration Audit

Status: AUDIT_ONLY

## Objective

Audit where the Flutter app can safely integrate the existing local community feed without inventing mobile-only local discovery logic.

Mobile must consume the existing authenticated RPC:

```text
local_community_feed_v1(p_limit integer)
```

## Hard Boundaries

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No identity changes.
- No mobile-side location filtering.
- No new local discovery algorithm.
- No exact location, latitude, longitude, address, or raw UUID exposure.

## Existing Mobile Surfaces

### App Shell

File:

```text
lib/main_shell.dart
```

Relevant findings:

- The app shell already has a right-side drawer through `endDrawer`.
- The drawer already contains `Feed`, `My Wall`, `Vault`, `Grookai Dex`, `Sets`, `Compare`, `Messages`, and `Account`.
- The bottom navigation is intentionally compact and collector-first:

```text
Search / Feed / Scan / Wall / Vault
```

Safe integration point:

- Add `Nearby` as a drawer-only Network entry first.
- Do not add it to bottom navigation in V1.
- Keep the existing Feed tab behavior unchanged.

### Network Feed

Files:

```text
lib/screens/network/network_screen.dart
lib/services/network/network_stream_service.dart
lib/widgets/network/network_interaction_card.dart
```

Relevant findings:

- `NetworkScreen` already supports feed mode toggles:

```text
Collectors / Following
```

- `NetworkStreamService` builds a rich mixed network feed from app-side query logic, ranking, freshness, discovery rows, and collector rows.
- This is not the correct place to implement local discovery logic.

Safe integration point:

- Do not extend `NetworkStreamService.fetchRows()` with local proximity logic.
- Either add a third top-level mode only if it calls a separate service, or create a separate `NetworkNearbyScreen`.
- Recommended V1: separate `NetworkNearbyScreen` opened from the drawer, with clear copy and isolated service.

### Public Collector / Wall Routing

Files:

```text
lib/screens/public_collector/public_collector_screen.dart
lib/services/public/public_collector_service.dart
lib/services/navigation/grookai_web_route_service.dart
```

Relevant findings:

- The app already supports opening public collector profiles by slug.
- The app already supports canonical collector routes such as:

```text
/u/<slug>
/u/<slug>/section/<sectionId>
```

Safe integration point:

- Nearby rows should route `View wall` to `PublicCollectorScreen(slug: ownerSlug)`.
- If the RPC `route_target` points at `/u/<slug>` or `/card/<gv_id>`, parse it through existing canonical route handling where practical.

### Card Detail Routing

Files:

```text
lib/card_detail_screen.dart
lib/main_shell.dart
```

Relevant findings:

- The app can open a card detail screen from `card_prints.gv_id`.
- Existing deep-link handling treats canonical web URLs as the source of truth.
- The existing route handler does not expose child public routes.

Safe integration point:

- Nearby `View card` should open the parent card detail using `gv_id` and `card_print_id`.
- Do not add `/card/<printing_gv_id>` support.
- Do not expose raw internal IDs.

### Image Rendering

Files:

```text
lib/widgets/card_surface_artwork.dart
lib/widgets/network/network_interaction_card.dart
lib/utils/display_image_contract.dart
```

Relevant findings:

- The app already has `CardSurfaceArtwork`, which normalizes display image URLs and applies image request headers for known hosts.
- `NetworkInteractionCard` has its own artwork fallback and direct `Image.network` path.

Safe integration point:

- Nearby should prefer `CardSurfaceArtwork` or a shared image contract wrapper instead of duplicating image handling.
- The fallback should mirror web Phase 7 copy:

```text
Image not available yet
```

### Authentication

Files:

```text
lib/main.dart
lib/main_shell.dart
lib/screens/account/account_screen.dart
```

Relevant findings:

- The app shell only appears after Supabase auth bootstrap.
- Supabase current user is available as:

```dart
Supabase.instance.client.auth.currentUser
```

Safe integration point:

- `NetworkNearbyScreen` should fail closed if `currentUser == null`.
- The screen should show a sign-in/account prompt rather than attempting anonymous RPC access.

## Recommended Mobile Architecture

### New Service

Create later, not in this audit:

```text
lib/services/network/local_community_feed_service.dart
```

Responsibilities:

- Call only:

```dart
client.rpc('local_community_feed_v1', params: {'p_limit': limit})
```

- Normalize only the existing RPC fields:

```text
feed_item_id
source_type
owner_slug
owner_display_name
gv_id
card_name
set_code
set_name
card_number
intent
image_url
display_image_kind
locality_label
distance_bucket
relationship_context
created_at
route_target
```

- Drop rows missing required safe fields:

```text
feed_item_id
owner_slug
owner_display_name
gv_id
route_target
distance_bucket
```

- Clamp limit to the same safe range as web:

```text
1..80
```

### New Screen

Create later, not in this audit:

```text
lib/screens/network/network_nearby_screen.dart
```

Responsibilities:

- Require authenticated user.
- Render a header:

```text
Nearby Collectors
Fresh cards from your local collector area
Only public cards from opted-in collectors appear here. Exact location is never shown.
```

- Render local feed cards with:

```text
card image
card name
set name + number
owner display name
coarse locality label
source label
following label if present
created date
View card
View wall
```

- Collapse same collector/card duplicates like web Phase 7.
- Show multi-source labels instead of duplicate cards.
- Show only coarse labels such as:

```text
Nearby
Same region
Founder Test Area
```

### Feature Flag

Recommended flag names:

```dart
const bool kLocalCommunityFeedV1Enabled = bool.fromEnvironment(
  'LOCAL_COMMUNITY_FEED_V1_ENABLED',
  defaultValue: false,
);
```

Rules:

- Drawer entry hidden when flag is false.
- Screen unavailable when flag is false.
- No RPC call when flag is false.

### Navigation Placement

V1 recommendation:

- Add `Nearby` to the right drawer under `Feed`.
- Do not add a bottom-nav item.
- Do not replace existing `Collectors / Following` feed toggle yet.

Rationale:

- Keeps the test surface explicit.
- Avoids changing the primary app navigation.
- Makes internal/founder testing easier.

## Risks

### High Risk

Mobile-side proximity logic.

Mitigation:

- Do not implement any client-side location, radius, zip, geohash, or region matching.
- Only consume RPC rows.

### High Risk

Leaking private location or raw IDs.

Mitigation:

- Render only `locality_label` and safe card/collector fields.
- Never render `owner_user_id`, `feed_item_id`, internal UUIDs, coordinates, or exact areas.

### Medium Risk

Duplicating the Network feed ranking system.

Mitigation:

- Keep Nearby service separate from `NetworkStreamService`.
- Do not blend Nearby into `Collectors` or `Following` until after mobile V1 smoke.

### Medium Risk

Broken images feeling like data failure.

Mitigation:

- Reuse `CardSurfaceArtwork` and the display image contract.
- Use calm fallback copy.

## Proposed Verification For Implementation Phase

When implementation begins, verify:

```text
flutter analyze
flutter test
```

Manual emulator smoke:

- Flag off: drawer does not show Nearby.
- Flag on: drawer shows Nearby.
- Logged out: no nearby data rendered.
- Logged in: Nearby screen calls existing RPC.
- `pokejavi` seeded rows appear for the founder test viewer.
- Duplicate same collector/card rows collapse.
- `View card` opens existing card detail.
- `View wall` opens existing public collector screen.
- No raw UUIDs visible.
- No exact location visible.
- Existing Feed, Wall, Vault, Dex, scanner placeholder, and Search still open.

## Decision

Safe to proceed to implementation only as an isolated mobile lane:

```text
LOCAL_COMMUNITY_FEED_MOBILE_V1
```

The lane should add a thin RPC service, drawer entry, and dedicated Nearby screen. It should not modify the web RPC, DB schema, scanner, pricing, Species Dex, or canonical identity.
