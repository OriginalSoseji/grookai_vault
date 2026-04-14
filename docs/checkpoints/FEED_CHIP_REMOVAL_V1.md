FEED CHIP REMOVAL V1

Purpose

Remove the lower-row Feed and Compact chips so the Feed screen keeps only real content filters.

View-Mode Audit
- owner file: `lib/screens/network/network_screen.dart`
- current default mode: `AppCardViewMode.comfortableList`, rendered as `NetworkInteractionCardLayout.feed`
- compact-only dependency: local to `network_screen.dart`; it only switches spacing/layout and does not affect service queries
- safe removal path: remove `_viewMode` state plus `_NetworkViewModeToggle` / `_NetworkViewModeChip`, then always render the current default feed layout
- layout cleanup points: remove the trailing view-control slot from the lower row and tighten spacing so the remaining intent chips read as one clean filter row
