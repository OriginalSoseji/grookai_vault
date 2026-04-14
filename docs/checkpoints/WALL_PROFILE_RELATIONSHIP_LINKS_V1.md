# WALL PROFILE RELATIONSHIP LINKS V1

## Purpose
Make the `followers` and `following` header controls on `My Wall` open real relationship lists.

## Scope Lock
- mobile wall/profile header only
- no header redesign
- no backend changes
- navigation + list reuse only

## Audit
- wall header source file: `lib/screens/public_collector/public_collector_screen.dart`
- followers/following current implementation: static `_ProfileStatChip` widgets in the profile header with no tap handling
- existing list screen available? yes/no: `following` yes via `lib/screens/account/following_screen.dart`; `followers` no dedicated mobile screen found
- existing route helper available? yes/no: no dedicated relationship route helper found; direct `MaterialPageRoute` navigation is already used for public collector navigation
- data source for follower/following list: `PublicCollectorService.fetchFollowerCollectors` and `PublicCollectorService.fetchFollowingCollectors`
- gaps: header counts are not interactive, and mobile lacks a shared public-profile relationship list surface for both followers and following
