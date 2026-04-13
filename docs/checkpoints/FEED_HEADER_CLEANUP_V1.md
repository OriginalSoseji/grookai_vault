FEED HEADER CLEANUP V1

Purpose

Remove redundant “Network” header under Feed.

Header Owner
- file: `lib/screens/network/network_screen.dart`
- widget: `SliverToBoxAdapter` with a `Row` containing the `Text('Network')`
- layout context: top sliver inside the Feed `CustomScrollView`, immediately above the filters row and alongside the `Collectors` button
