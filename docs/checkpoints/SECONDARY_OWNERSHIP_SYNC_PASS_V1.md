# SECONDARY OWNERSHIP SYNC PASS V1

## Purpose
Remove remaining async ownership render paths from secondary surfaces and replace them with precomputed synchronous ownership snapshots.

## Surface Audit
- file: `lib/screens/sets/public_set_detail_screen.dart`
  widget: set detail list/grid tiles
  current async pattern: parent primes ownership but still passes per-card `Future<OwnershipState>` into tiles and `OwnershipSignal`
  severity: medium
  target for this pass: yes
- file: `lib/screens/scanner/scan_identify_screen.dart`
  widget: scanner identify candidate rows
  current async pattern: candidate rows receive per-result ownership futures
  severity: medium
  target for this pass: yes
- file: `lib/screens/compare/compare_screen.dart`
  widget: compare workspace preview grid
  current async pattern: preview cards resolve ownership via future provider during render
  severity: medium
  target for this pass: yes
- file: `lib/screens/network/network_inbox_screen.dart`
  widget: inbox thread tiles
  current async pattern: per-thread ownership futures passed into hint rendering
  severity: medium
  target for this pass: yes
- file: `lib/card_detail_screen.dart`
  widget: related versions bottom sheet
  current async pattern: per-version ownership futures passed into related version rows
  severity: medium
  target for this pass: yes
- file: `lib/screens/network/network_thread_screen.dart`
  widget: thread header ownership badge
  current async pattern: single async ownership future rendered in header badge
  severity: low
  target for this pass: yes, narrow region only
