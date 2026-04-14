FEED MODE ROW V1

Purpose

Add a real Collectors | Following mode row to Feed and make Following a functional filter.

Audit
- mode row owner: `lib/screens/network/network_screen.dart`
- current feed source path: `NetworkScreenState._loadRows(...) -> NetworkStreamService.fetchRows(...)`
- existing follow data path: `lib/services/public/following_service.dart` via real `collector_follows` reads + public profile hydration
- whether Following can be derived without schema work: yes
- likely implementation path: top-level screen mode state + service-level followed-owner filter on collector fetches, with mode-aware empty states
