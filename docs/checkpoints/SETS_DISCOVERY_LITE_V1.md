SETS DISCOVERY LITE V1

Purpose

Make the sets browse screen feel like a real discovery entry point instead of a plain search utility.

Current Screen Audit
- owner file:
  - `lib/screens/sets/public_sets_screen.dart`
- current default state:
  - intro card
  - search field
  - filter chip row
  - generic results header
  - full results grid
  - no stronger browse-first section
- current search path:
  - `PublicSetsService.fetchSets(...)` loads the canonical public set list once
  - `PublicSetsService.filterAndSortSets(...)` applies local query/filter sorting in screen state
- current filters:
  - `All`
  - `Modern`
  - `Special`
  - `A-Z`
  - `Newest`
  - `Oldest`
- likely best lightweight discovery section:
  - a compact browse rail using the first few real sets from the existing filtered catalog order

Discovery Source Choice
- chosen source:
  - first 6 sets from the already-loaded filtered set list
- why:
  - it is real existing data, already available on-screen, and under the default `All` state it naturally resolves to the newest collector-ready sets because `fetchSets(...)` returns sets newest-first
- data owner:
  - `lib/services/public/public_sets_service.dart`
- whether it is live or derived:
  - derived from real live set data already fetched by the screen
- why it is safe for this pass:
  - no new backend call
  - no fake ranking
  - no new schema/system
  - automatically stays in sync with existing search/filter ordering
