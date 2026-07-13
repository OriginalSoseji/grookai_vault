# Mobile Crash Reporting Wiring

Date: 2026-07-13
Branch: `main`

## Scope

This closes the code-side wiring for the launch-readiness mobile crash reporting
gap. Firebase was already configured for push notifications through
`firebase_core`, `firebase_messaging`, and `lib/firebase_options.dart`; this
pass adds Crashlytics and registers app-level error capture during startup.

## Implementation

- Added `firebase_crashlytics`.
- Added `GrookaiCrashReportingService`.
- Initializes Firebase before `runApp` when mobile Firebase config is available.
- Registers `FlutterError.onError` with Crashlytics fatal recording.
- Extends the existing `PlatformDispatcher.instance.onError` path:
  - invalid refresh-token recovery remains handled locally;
  - all other unhandled platform errors are recorded as fatal Crashlytics events.
- Crashlytics collection is enabled automatically in release builds.
- Non-release collection is disabled by default and can be explicitly enabled
  with `--dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true`.

## Non-Public Self-Test

Use a debug/profile device build only:

```powershell
flutter run `
  --dart-define=SUPABASE_URL=$env:SUPABASE_URL `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY `
  --dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true `
  --dart-define=GROOKAI_CRASH_REPORTING_SELF_TEST=true
```

That sends a non-fatal Crashlytics self-test event after startup.

For a real captured test crash in a non-public build:

```powershell
flutter run `
  --dart-define=SUPABASE_URL=$env:SUPABASE_URL `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY `
  --dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true `
  --dart-define=GROOKAI_CRASH_REPORTING_SELF_TEST=true `
  --dart-define=GROOKAI_CRASH_REPORTING_FATAL_SELF_TEST=true
```

After the app crashes, reopen it once so Crashlytics can upload the pending
event, then confirm the event in Firebase Crashlytics for the `grookai-vault`
project.

## Remaining Verification

This checkpoint proves repo wiring only. Launch readiness still needs a
Firebase-console readback from a non-public Android or iOS build showing the
self-test crash/event was received.
