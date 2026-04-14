FEED CHIP AUDIT V1

Purpose

Determine whether the lower-row Feed chip does meaningful work or is redundant and removable.

Owner Audit
- file: `lib/screens/network/network_screen.dart`
- widget: `_NetworkViewModeToggle` / `_NetworkViewModeChip`
- state owner: `NetworkScreenState._viewMode`
- service owner: none; `lib/services/network/network_stream_service.dart` does not branch on the Feed chip
- likely control type: client-side view mode toggle, not a feed-content filter

Exact Behavior
- selecting Feed changes: `NetworkScreenState._viewMode` to `AppCardViewMode.comfortableList`; no feed reload, no query change, no service change
- selecting All changes: `NetworkScreenState._intent` to `null` and calls `_loadRows(resetSession: true)`, which changes `NetworkStreamService.fetchRows(...)` intent handling
- selecting Compact changes: `NetworkScreenState._viewMode` to `AppCardViewMode.compactList`; no query change, same rows, tighter list spacing and compact card layout
- Feed vs All: different axes entirely; `All` is a content filter, `Feed` is the default list presentation
- Feed vs Compact: same data, different presentation only

Semantic Judgment
- category: mislabeled view mode
- why: the chip maps to `AppCardViewMode.comfortableList`, which is called `Comfortable list` in shared presentation code
- user-facing clarity: weak; it sits beside content filters and reads like a filter even though it only changes layout
- keep / rename / remove: remove from the lower filter row and keep only a truly necessary view control for Compact

Removal Safety
- dependencies: `_NetworkViewModeToggle`, `_NetworkViewModeChip`, `_viewMode`, and the `comfortableList` / `compactList` branch in `_NetworkStreamResultsSliver`
- risk level: medium
- follow-up implementation scope: UI-only; service/data path untouched, but the remaining Compact control needs a clean one-control toggle path back to default comfortable view
