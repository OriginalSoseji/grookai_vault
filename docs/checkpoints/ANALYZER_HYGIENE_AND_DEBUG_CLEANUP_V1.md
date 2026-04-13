# ANALYZER HYGIENE AND DEBUG CLEANUP V1

## Purpose
Reduce analyzer noise and remove leftover debug residue from recent ownership, performance, social, and slab passes without changing product behavior.

## Scope Lock
- cleanup only
- no feature changes
- no redesign
- core Flutter files only

## Targets
- main.dart
- main_shell.dart
- network screen/service
- ownership resolver files
- ownership signal
- any directly related recent-pass files

## Analyzer Audit
- file: `lib/main.dart`
  - issue: deprecated `surfaceVariant` and `withOpacity` usage in shared catalog UI/theme helpers
  - class: true cleanup candidate
  - safe to fix now?: yes
- file: `lib/main.dart`
  - issue: unused optional constructor params in private helper widgets (`key`, `emphasize`, `padding`)
  - class: true cleanup candidate
  - safe to fix now?: yes
- file: `lib/main.dart`
  - issue: `avoid_print` on Supabase URL startup log
  - class: true cleanup candidate
  - safe to fix now?: yes
- file: `lib/main.dart`
  - issue: `unnecessary_underscores` in a local separator builder
  - class: true cleanup candidate
  - safe to fix now?: yes
- file: `lib/main.dart`
  - issue: `use_build_context_synchronously` in search action sheet flow
  - class: risky change that should be deferred unless the surrounding flow is adjusted carefully
  - safe to fix now?: no
- file: `lib/main_shell.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore for analyzer, cleanup via debug residue only
  - safe to fix now?: yes
- file: `lib/screens/network/network_screen.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore for analyzer, cleanup via debug residue only
  - safe to fix now?: yes
- file: `lib/services/network/network_stream_service.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore for analyzer, cleanup via debug residue only
  - safe to fix now?: yes
- file: `lib/services/vault/ownership_resolver_service.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore for analyzer, cleanup via debug residue only
  - safe to fix now?: yes
- file: `lib/services/vault/ownership_resolver_adapter.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore
  - safe to fix now?: no changes needed
- file: `lib/widgets/ownership/ownership_signal.dart`
  - issue: no scoped analyzer findings from current run
  - class: existing safe-to-ignore
  - safe to fix now?: no changes needed

## Debug Residue Audit
- file: `lib/main_shell.dart`
  - log/hook: `AUTH_V1` submit/start/loading/success/failure logs
  - keep/gate/remove: gate
  - reason: useful during auth diagnosis, but too noisy for normal debug/runtime after the fix
- file: `lib/main.dart`
  - log/hook: startup `print('[gv] supabase_url=...')`
  - keep/gate/remove: remove
  - reason: low-value startup residue and triggers analyzer noise
- file: `lib/main.dart`
  - log/hook: `AUTH_V1 auth_gate ...`
  - keep/gate/remove: remove
  - reason: verification-era auth spam on every auth state emission
- file: `lib/main.dart`
  - log/hook: catalog ownership prime failure debug prints
  - keep/gate/remove: gate
  - reason: useful only while diagnosing ownership sync failures
- file: `lib/screens/network/network_screen.dart`
  - log/hook: first-paint ownership prime failure debug prints
  - keep/gate/remove: gate
  - reason: useful only for diagnosing degraded ownership hydration
- file: `lib/services/network/network_stream_service.dart`
  - log/hook: `NETWORK_FRESHNESS_V2` and `NETWORK_HERO_DIVERSIFICATION_V1`
  - keep/gate/remove: gate
  - reason: valuable for targeted feed tuning, but too noisy for normal runtime
- file: `lib/services/vault/ownership_resolver_service.dart`
  - log/hook: `OWNERSHIP_RESOLVER_V1` trace logging
  - keep/gate/remove: gate
  - reason: helpful during ownership rollout verification, but not worth constant debug spam now
