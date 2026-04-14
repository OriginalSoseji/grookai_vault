# NETWORK HERO DIVERSIFICATION V1

## Purpose
Make the first 2–3 Network feed cards rotate more visibly across sessions while preserving collector-first quality.

## Hero Ordering Audit
- top-slot owner: `NetworkStreamService._fetchMixedPage(...)` and `NetworkStreamService._fetchCollectorOnlyPage(...)` in `lib/services/network/network_stream_service.dart`
- current diversification owner: `NetworkStreamService._diversifyFirstViewportRows(...)` and `_freshenFirstViewportRun(...)`
- why hero remains too stable:
  - top collector rows are chosen first with `eligibleCollectors.take(...)`
  - first-viewport diversification runs after that selection, so it cannot widen the top collector candidate pool
  - the first collector run is usually only 2–3 cards long, so score-band shuffling often has nothing meaningful to rotate
  - when the first 2–3 collector rows land in separate score bands, the current logic preserves their order
- candidate pool size for first collector slots:
  - effectively the already-selected leading collector run, not the broader near-neighbor collector set
- likely narrow fix:
  - widen only the first 2–3 collector hero slots to rotate among near-equal high-quality collector candidates before the rest of the feed ordering continues unchanged

## Top Slot Truth
- session 1 first 3:
  - `collectorInPlay:0008`, `collectorInPlay:409b`, `collectorInPlay:cdd4`
- session 2 first 3:
  - `collectorInPlay:cdd4`, `collectorInPlay:0008`, `collectorInPlay:409b`
- session 3 first 3:
  - `collectorInPlay:cdd4`, `collectorInPlay:0008`, `collectorInPlay:409b`
- session 4 first 3:
  - `collectorInPlay:0008`, `collectorInPlay:409b`, `collectorInPlay:cdd4`
- session 5 first 3:
  - `collectorInPlay:0008`, `collectorInPlay:409b`, `collectorInPlay:cdd4`
- session 6 first 3:
  - `collectorInPlay:cdd4`, `collectorInPlay:0008`, `collectorInPlay:409b`
- score spread:
  - top collector band remained tight at `204`, `193`, and `192`, which is narrow enough for bounded rotation without weakening the quality floor
- repeat owner:
  - the hero stayed repetitive before because the diversification step only shuffled the already-selected first collector run
  - after widening the top collector candidate window, the first 3 rows now rotate between premium near-neighbors instead of only changing below the hero area
