# LOCAL_COMMUNITY_FEED_MOBILE_V1 Implementation

## Summary

Implemented the isolated mobile Nearby surface for local community discovery.

## Files

- `lib/services/network/local_community_feed_service.dart`
- `lib/screens/network/network_nearby_screen.dart`
- `lib/main.dart`
- `lib/main_shell.dart`
- `test/local_community_feed_mobile_test.dart`

## Boundary

- Data source: `local_community_feed_v1(p_limit)` only.
- Entry point: top-right app drawer only.
- Feature gate: `LOCAL_COMMUNITY_FEED_V1_ENABLED`, default `false`.
- Navigation: existing card detail and public collector wall flows.

## Safety Confirmation

- No client-side location filtering.
- No exact location, coordinates, geohash, raw user IDs, or internal UUIDs rendered.
- No `NetworkStreamService` modification.
- No bottom navigation change.
- No scanner, pricing, Species Dex, identity, or DB changes.

## UX States

- Feature flag off: hidden from drawer and fail-closed if opened directly.
- Unauthenticated: sign-in required state.
- Empty: no nearby activity state.
- Error: retry state.
- Loading: bounded spinner state.

## Verification

- `dart format lib/services/network/local_community_feed_service.dart lib/screens/network/network_nearby_screen.dart lib/main.dart lib/main_shell.dart test/local_community_feed_mobile_test.dart` - PASS
- `flutter analyze` - PASS
- `flutter test test/local_community_feed_mobile_test.dart` - PASS
- `flutter test` - PASS
- `npm run preflight` - PASS_WITH_DEFERRED_DEBT, no critical failures
- `git diff --check` - PASS
