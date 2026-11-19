# Mobile Binder Build 555 Checkpoint

## Finding

The Samsung SM-S908U (`R5CT3291F6E`) is running `com.grookai.vault` build 554.
Binder refinement code is already in merged source: custom checklist editing,
artwork and details modes, drag arrangement, persistent grid sizing, Binder
library search and sorting, and web parity. Build 554 installed in place and
preserved app data, but startup was blocked because the local build omitted the
required Supabase Dart defines.

Build 555 uses the production Supabase URL and public publishable key through
the same `--dart-define` values as the Android release workflow. No credentials
are printed or checked into source. The local debug certificate matches the
phone's existing signing certificate.

## Paired baseline

- `pubspec.yaml` and App Store Connect metadata are synchronized at
  `1.0.0+555`.
- Both platforms must be built from the same merged source commit.
- The local Android APK is a device-verification build; it is not a paired
  release until iOS 555 is archived, uploaded, and read back from App Store
  Connect.
- Tailscale ping to `cesars-macbook-pro-2` timed out during this checkpoint.

## Android device readback

- Android 555 was built with the production Supabase URL and public publishable
  key passed as Dart defines. The key was not printed or checked into source.
- `scripts/android_update_preflight.ps1` passed: package
  `com.grookai.vault`, version `1.0.0`, build 555, and signer
  `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2`.
- `adb install -r` succeeded in place over 554. Package-manager readback reports
  build 555 and the app process is running. No uninstall, clear-data, or account
  reset was performed.
- Visual readback on Samsung showed the signed-in Vault, Binder library search,
  All/Mine/Shared filters, sort control, Binder progress card, and the Pikachu
  Binder checklist with hosted artwork, variant labels, checklist filters, and
  contribution actions. The phone was left on that Binder detail screen.
- The first 554 build showed the guarded startup error because the required Dart
  defines were omitted. Configured build 555 replaced it successfully.

## Remaining paired-release work

- Local pre-commit shipcheck passed the secret guard, preflight, and more than
  8,000 contract checks, then stopped at the strict web production build:
  Next.js could not statically generate `/` after three 60-second retries. No
  commit or PR was created from this worktree.
- The configured read-only preview backend is `http://127.0.0.1:54321`; its TCP
  listener accepts connections but its HTTP request times out. Docker Desktop's
  Windows service is stopped and could not be opened by the current session, so
  the local Supabase preview stack is unavailable for that build gate.
- Tailscale ping to `cesars-macbook-pro-2` timed out. The Android build is a
  device-verification build, not a paired release; produce iOS 555 from the same
  merged source commit and record App Store Connect processing readback when the
  Mac is reachable.
