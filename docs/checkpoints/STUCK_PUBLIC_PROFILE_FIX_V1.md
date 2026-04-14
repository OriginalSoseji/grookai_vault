# STUCK PUBLIC PROFILE FIX V1

## Purpose
Fix the app getting stuck on a public collector profile instead of running through the normal shell flow.

## Entry Path Audit
- app entry owner: `lib/main.dart` via `MaterialApp(home: StreamBuilder<AuthState>(...))`
- shell entry owner: `lib/main_shell.dart` via `AppShell`
- public collector launch paths found:
  - explicit pushes from shell prompt, card detail, network, GVVI, following/relationship screens
  - signed-in `My Wall` tab intentionally renders `PublicCollectorScreen(showAppBar: false)` for the current user's own wall
- any debug/verification hook found: none in `lib/`; no `wobis` string, no `lib/dev` harness file, no startup auto-push hook
- likely stuck-path owner:
  - not current app code
  - most likely previous runtime launched with a temporary verification target, leaving the simulator on a profile screen until the normal `lib/main.dart` target is run again
