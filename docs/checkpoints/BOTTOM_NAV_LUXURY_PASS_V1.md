# BOTTOM NAV LUXURY PASS V1

## Purpose
Redesign bottom navigation to match the new app hierarchy and make it feel premium.

## Current Nav Audit
- owner file: `lib/main_shell.dart`
- current order: Explore, Wall, Scan, Network, Vault
- current active-state owner: Material `NavigationBar` in `AppShell.build`
- current default tab: Wall
- rename owner: `_ShellDestination.network` title/nav label in `main_shell.dart`
- likely redesign surface: shell destination metadata plus `NavigationBarTheme` / `NavigationBar` styling in `main_shell.dart`
