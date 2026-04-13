# AUTH LOGIN FAILURE AUDIT V1

## Purpose
Find and fix the real login failure path after interaction-level keyboard/button fixes proved insufficient.

## Pipeline Audit
- login owner file: `lib/main_shell.dart`
- submit handler: `_submitSignIn()`
- auth call: `Supabase.instance.client.auth.signInWithPassword(...)`
- success path: `main.dart` auth gate listens to `supabase.auth.onAuthStateChange` and swaps `LoginPage` to `AppShell` when `currentSession` becomes non-null
- failure path: `AuthException` is now surfaced via SnackBar + inline error text; generic failures are also logged and surfaced instead of failing silently
- loading state path: `_loading = true` before request, `_loading = false` in `finally`

## Auth Client Audit
- init owner: `lib/main.dart`
- client source: `Supabase.instance.client`
- same client used by login: yes, `main_shell.dart` reads the same singleton instance
- any duplicate/stale init: none in the production app path; only temporary dev probes existed outside the real app entry
- session listener behavior: `StreamBuilder<AuthState>` in `main.dart` rebuilds on `onAuthStateChange` and chooses `LoginPage` vs `AppShell` from `currentSession`

## Runtime Repro
- submit fires: yes
- request fires: yes
- response: Supabase auth error for the submitted payload
- exception: `AuthException(message: missing email or phone, statusCode: 400, code: validation_failed)`
- UI feedback shown: yes, inline error text plus SnackBar
- session created: not verified with valid credentials in this pass
- navigation happened: yes for restored valid sessions; cold login stayed on `LoginPage` for invalid submit as expected

## Proven Failure Cause
- the auth request itself was not the broken path during repro
- the proven app-side issue was weak failure visibility: invalid sign-in attempts could return a real Supabase error while only showing an easy-to-miss transient SnackBar
- the sign-in path now logs each stage and keeps a visible inline error state on screen until the user edits/resubmits
