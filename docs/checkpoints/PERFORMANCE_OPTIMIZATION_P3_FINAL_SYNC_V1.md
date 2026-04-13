# PERFORMANCE OPTIMIZATION P3 FINAL SYNC V1

## Purpose
Remove the last async ownership hot paths from UI rendering and memoize Vault derived-data work.

## Async UI Audit
- file: `lib/main.dart`
  widget: `_CatalogOwnershipSummaryLine` via `_CatalogCardTile` / `_CatalogCardGridTile`
  async pattern still present: `FutureBuilder<OwnershipState>` fed by `ownershipFuture`
  hot path severity: high
  target for this pass: yes

- file: `lib/main_vault.dart`
  widget: `_CatalogPickerState` search result list
  async pattern still present: parent stores `Map<String, Future<OwnershipState>>` and passes futures into `_CatalogCardTile`
  hot path severity: medium
  target for this pass: yes

- file: `lib/main.dart`
  widget: Explore/Search result builders (`_buildCatalogCard`, `_loadTrending`, `_runSearch`)
  async pattern still present: ownership futures are created per card and rendered in tiles
  hot path severity: high
  target for this pass: yes

- file: `lib/main_vault.dart`
  widget: `VaultPageState.build`
  async pattern still present: none in tile build, but derived lists/groups are recomputed each rebuild
  hot path severity: high
  target for this pass: yes

- file: `lib/card_detail_screen.dart`
  widget: related-version ownership path
  async pattern still present: ownership future passed into related cards
  hot path severity: medium
  target for this pass: no

- file: `lib/screens/sets/public_set_detail_screen.dart`
  widget: set card grid/list ownership path
  async pattern still present: ownership futures cached per card and rendered in shared signal widgets
  hot path severity: medium
  target for this pass: no

- file: `lib/screens/scanner/scan_identify_screen.dart`
  widget: scanner result ownership path
  async pattern still present: ownership futures cached per candidate
  hot path severity: medium
  target for this pass: no

- file: `lib/screens/public_collector/public_collector_screen.dart`
  widget: public wall viewer-owned hint
  async pattern still present: `FutureBuilder<OwnershipState>` in viewer hint
  hot path severity: low-to-medium
  target for this pass: no

- file: `lib/screens/network/network_inbox_screen.dart`
  widget: inbox ownership hints
  async pattern still present: ownership futures cached per group
  hot path severity: medium
  target for this pass: no

- file: `lib/screens/network/network_thread_screen.dart`
  widget: thread header ownership hint
  async pattern still present: single ownership future in thread header
  hot path severity: low
  target for this pass: no
