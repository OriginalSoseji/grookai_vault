# RENDER STABILITY AND KEYBOARD PASS V1

## Purpose
Fix proven keyboard/layout traps and audit the app for screens that can become unusable when the keyboard, insets, or tall content are active.

## Proven Repro
- screen: `lib/screens/network/network_thread_screen.dart`
- symptom: reply composer stays pinned to the bottom page edge while the keyboard opens, which can trap the input/send region and shrink the thread into an awkward fixed column
- keyboard state: software keyboard open with reply field focused, especially with multi-line input
- what becomes inaccessible: lower composer space, comfortable send reachability, and clean thread scrolling while the keyboard is active
- likely layout owner file: `lib/screens/network/network_thread_screen.dart`

## Render Stability Audit
- surface: network thread reply
  - owner file: `lib/screens/network/network_thread_screen.dart`
  - risk level: proven broken
  - why: fixed `Column` with bottom composer but no keyboard-aware inset lift
  - fix now or later: fix now
- surface: sign-in form
  - owner file: `lib/main_shell.dart`
  - risk level: likely risky
  - why: centered non-scrollable form with multiple fields and bottom CTA
  - fix now or later: fix now
- surface: contact owner composer sheet
  - owner file: `lib/widgets/contact_owner_button.dart`
  - risk level: already safe
  - why: pads with `MediaQuery.viewInsetsOf(context).bottom` and `SafeArea`
  - fix now or later: later only if runtime proves otherwise
- surface: vault manage card tabs/forms
  - owner file: `lib/screens/vault/vault_manage_card_screen.dart`
  - risk level: already safe
  - why: list-based tab content with drag-dismiss keyboard behavior
  - fix now or later: later only if runtime proves otherwise
- surface: account screen profile form
  - owner file: `lib/screens/account/account_screen.dart`
  - risk level: already safe
  - why: form lives inside a `ListView`
  - fix now or later: no fix now
- surface: submit missing card form
  - owner file: `lib/screens/account/submit_missing_card_screen.dart`
  - risk level: already safe
  - why: full-page `ListView` with long-form content
  - fix now or later: no fix now
- surface: public sets search
  - owner file: `lib/screens/sets/public_sets_screen.dart`
  - risk level: already safe
  - why: search field sits inside a scrollable body
  - fix now or later: no fix now
- surface: network discover search
  - owner file: `lib/screens/network/network_discover_screen.dart`
  - risk level: already safe
  - why: search field sits inside a `ListView`
  - fix now or later: no fix now
- surface: vault catalog picker sheet
  - owner file: `lib/main_vault.dart`
  - risk level: already safe
  - why: sheet explicitly pads for `viewInsets.bottom`
  - fix now or later: no fix now
