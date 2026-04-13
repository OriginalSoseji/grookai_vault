# NETWORK FEED DISCOVERY V1

## Purpose
Extend the Network feed from collector-only content into a collector-first discovery feed that can surface high-end canonical DB cards.

## Current Feed Audit
- feed screen owner: `lib/screens/network/network_screen.dart`
- feed data source: `NetworkStreamService.fetchRows()` in `lib/services/network/network_stream_service.dart`
- feed item model: `NetworkStreamRow` with nested `NetworkStreamCopy`
- current ranking logic:
  - base query from `v_card_stream_v1`
  - optional intent filter
  - enrich with discoverable copies, pricing, and listing counts
  - rank by `_signalScore`
  - diversify with `_diversifyWindow`
- current card surface reused: `NetworkInteractionCard` in `lib/widgets/network/network_interaction_card.dart`
- current gaps:
  - only collector-owned/public cards are supported as candidates
  - no canonical DB discovery source exists
  - no source type on the feed row model
  - no explicit session-level suppression for discovery repeats
  - no clean taste hook yet, only hardcoded ranking heuristics

## Future Taste Function Hook
- candidate inputs:
  - recent card opens
  - recent vault adds
  - recent inquiries/messages
  - recent searches
  - recently shown feed cards
- proposed similarity dimensions:
  - same Pokemon / character
  - same set / era / release window
  - same rarity / illustration tier
  - same price band
  - same interaction intent
- where score hook will live:
  - inside `NetworkStreamService` as an additive score stage applied after source-base weighting and before cadence/diversification
