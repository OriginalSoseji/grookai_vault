# NETWORK HERO POOL DEDUPE V1

## Purpose
Reduce top-of-feed repetition by deduplicating the bounded hero collector pool before rotation.

## Hero Pool Audit
- current hero pool owner:
  - `NetworkStreamService._heroCollectorPoolForSlot(...)` in `lib/services/network/network_stream_service.dart`
- hero pool size:
  - bounded by `_heroCollectorPoolLimit = 6`
  - trimmed further by `_heroCollectorScoreDelta = 18`
- duplicate pattern observed:
  - the current hero pool can contain repeated `cardPrintId` values from different collector rows
  - recent live logs showed `top_pool=[0008,409b,cdd4,0008,409b,cdd4]`, so rotation was sometimes working over repeated visible card identities instead of a broader premium set
- likely dedupe key:
  - `cardPrintId`
- likely safe fix:
  - dedupe only the bounded hero collector pool by first-seen `cardPrintId`, keep the highest-ranked row for each visible card identity, and leave the rest of the feed ordering unchanged

## Dedupe Rule
- key used:
  - `cardPrintId`
- why it is safe:
  - the repetition problem is caused by the same visible card identity reappearing in the bounded hero pool from multiple collector rows
  - keeping the first-seen row preserves the highest-ranked collector candidate for that card because the pool is already sorted by ranking
- what it removes:
  - duplicate hero candidates that would look identical to the viewer in the first 2–3 slots
- what it preserves:
  - distinct premium cards
  - collector-first ordering
  - the rest of the feed outside the bounded hero pool

## Verification Notes
- before dedupe duplicate density:
  - raw top hero pool repeatedly logged as `0008,409b,cdd4,0008,409b,cdd4`
  - slot 2 and slot 3 candidate pools could still carry repeated visible card identities, which made the first 3 cards feel narrower than they should
- after dedupe duplicate density:
  - slot 1 deduped to `0008,409b,cdd4`
  - slot 2 commonly deduped to two unique premium options, for example `409b,cdd4` or `0008,cdd4`
  - slot 3 now falls back to the remaining unique hero candidate when one exists, for example `0008` or `409b`
- repeated session results after final fix:
  - session 1 first 3:
    - `0008`, `409b`, `cdd4`
  - session 2 first 3:
    - `409b`, `cdd4`, `0008`
  - session 3 first 3:
    - `409b`, `0008`, `cdd4`
  - session 4 first 3:
    - `0008`, `cdd4`, `409b`
  - session 5 first 3:
    - `0008`, `cdd4`, `409b`
  - session 6 first 3:
    - `cdd4`, `409b`, `0008`
- visible runtime proof:
  - first-open hero showed `Roaring Moon ex`
  - later reloads showed `Charizard ex` as the lead hero
  - grid-mode first viewport showed distinct premium first-row combinations instead of repeating the same visible card identity in multiple hero slots
