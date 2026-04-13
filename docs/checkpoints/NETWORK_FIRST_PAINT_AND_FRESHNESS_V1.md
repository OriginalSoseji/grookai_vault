# NETWORK FIRST PAINT AND FRESHNESS V1

## Purpose
Make Network first open feel faster, remove redundant messaging CTA, and make the first screen feel fresh every session.

## First Paint Audit
- initial load owner: `NetworkScreenState.initState -> _loadRows(resetSession: true)` in `lib/screens/network/network_screen.dart`
- first page size: 24 rows
- ownership work on first page: `_loadRows(...)` waits for `OwnershipResolverAdapter.primeBatch(...)` across every card on the page before the feed can leave the loading state
- discovery/collector assembly path: `NetworkStreamService.fetchRows(...) -> _fetchMixedPage(...) -> _fetchCollectorCandidates(...) -> _fetchDiscoveryPage(...) -> _injectDiscoveryRows(...)`
- CTA duplication owner: `_NetworkActionBar` in `lib/screens/network/network_screen.dart`; sell rows render a primary contact CTA plus a second `Ask about this card` link even though both route into the same conversation flow
- top-of-feed repeat owner: `lib/services/network/network_stream_service.dart`; session seeding exists, but the first viewport still tends to stabilize around the same top-ranked collector rows unless the first mixed page is explicitly diversified
