# BOTTOM NAV CORRECTION V1

## Purpose
Correct the oversized/crowded bottom nav implementation while preserving the new order and Feed-first structure.

## Current Problem Audit
- owner file: `lib/main_shell.dart`
- current height owner: shell-local `NavigationBarTheme.height`, plus outer `Padding` and rounded dock container in `AppShell.build`
- content overlap owner: `Scaffold(extendBody: true)` combined with floating dock geometry
- safe-area owner: `SafeArea(maintainBottomViewPadding: true)` wrapping the dock plus shell bottom-padding metrics
- active-state owner: shell-local `indicatorColor`, shadow, radius, and always-show-label rhythm in `NavigationBarTheme`
- likely correction points: dock container padding/radius/shadow, local nav height/icon sizing, and shell body/nav integration in `AppShell.build`
