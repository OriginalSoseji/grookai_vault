# NETWORK FEED FRESHNESS V2

## Purpose
Make the Network feed feel alive each session while preserving collector-first ranking and using DB discovery as the infinite fallback once collector content is exhausted.

## Scope Lock
- service/session freshness only
- no schema
- no redesign

## Current Feed Audit
- feed owner: `lib/screens/network/network_screen.dart`
- source model: `NetworkStreamRow` with `collectorWall`, `collectorInPlay`, `dbHighEnd`, and `dbRandomExplore` in `lib/services/network/network_stream_service.dart`
- current ranking: source-type base score plus price / intent / listing / ownership signals, then `_rankRows(...)` sorts within chronological windows and `_injectDiscoveryRows(...)` inserts discovery every few collector cards
- current suppression memory: in-memory `_recentSessionCardPrintIds` and `_recentSessionSourceKeys`, both capped at 40 and only used as soft score penalties
- current pagination behavior: none; `NetworkScreen` does a single `fetchRows(...)` call and renders the returned rows with pull-to-refresh only
- collector exhaustion behavior today: none; each reload re-fetches the same top collector pool and collector rows remain eligible forever within the process
- db exhaustion behavior today: none; discovery is fetched only as a bounded companion injection to the initial mixed feed batch
- freshness gaps:
  - session ordering is mostly stable and can feel samey across launches
  - repeat suppression is too soft for session browsing
  - there is no notion of collector exhaustion for the current session
  - the feed cannot continue into an infinite DB-only discovery phase because there is no load-more/session page model

## Session Freshness State
- fields tracked:
  - session seed
  - session id / generation
  - current intent scope
  - recently shown `card_print_id`s
  - recently shown source keys
  - emitted source keys for the current session
  - emitted collector source keys for the current session
  - emitted discovery `card_print_id`s for the current session
  - collector exhaustion flag
  - db-only phase flag
  - lightweight recent interaction signals placeholder
- reset trigger:
  - initial `NetworkScreen` load
  - explicit refresh / reload
  - intent-scope change
- why session-only is sufficient for V2:
  - the goal is live session freshness and rotation, not durable personalization
  - in-memory state lets the feed vary, suppress repeats, and detect exhaustion without schema work

## Session Variation Contract
- band logic:
  - keep broad source/type score ordering intact
  - rank by score bands / near-neighbor groups rather than fully deterministic flat sort
- shuffle logic:
  - use a session seed to rotate rows inside score-neighbor groups and same-band discovery pools
- what stays deterministic:
  - collector-first source priority
  - high-end discovery preference over random discovery
  - explicit collector-only intent filters
- what varies:
  - order within closely scored candidates
  - discovery pool order per session
  - later-session continuation after exhaustion

## Collector Exhaustion Contract
- what counts as collector content:
  - `collectorWall`
  - `collectorInPlay`
- how exhaustion is detected:
  - when the service cannot emit any new collector source keys for the active session scope
- what changes after exhaustion:
  - all-session `All` feed stops requesting/injecting collector rows
  - feed continues with DB discovery only
  - high-end discovery remains preferred, then random explore fills
- how reset works next session:
  - session reset clears emitted collector/discovery memory and collector exhaustion

## Taste Hook V2
- current live inputs used:
  - recent Network feed opens / taps recorded in-session when a collector opens a card or exact copy from the feed
- placeholder inputs left for later:
  - recent feed opens
  - recent card taps
  - recent public GVVI opens
  - recent adds to vault
  - recent inquiries/messages
  - recent searches
- score contribution logic:
  - keep a dedicated score seam for later session-local affinity boosts without changing candidate shape or requiring persistence
