# Top 1 Percent Launch Hardening Session

Date: 2026-07-13
Branch: `main`

## Scope

This checkpoint records the first pass after the decision to push Grookai Vault
from late launch-hardening toward a top-tier launch bar.

Scanner V5 real-device recognition proof remains explicitly deferred by the
current product instruction.

## Device And Tooling

- Device: Samsung `SM-S908U`
- ADB serial: `R5CT3291F6E`
- App package: `com.grookai.vault`
- Flutter target: `lib/main.dart`
- Supabase target observed from linked CLI project:
  `ycdxbpibncqcchqiihfz`

Android platform tools were installed but not on `PATH`; `adb.exe` was used
from the Android SDK platform-tools directory.

## Local Build Environment Fix

The first Samsung Crashlytics self-test build failed before install because
Gradle could not resolve `com.google.firebase:firebase-crashlytics:20.0.6`.

Root cause observed from the device-build machine:

- Windows HTTPS requests to Maven succeeded.
- Java/Gradle HTTPS requests failed with PKIX path building errors.
- The fetched server chain showed Norton SSL/TLS inspection certificates:
  `Norton Web/Mail Shield Root`.

Resolution used for this session:

- Created a temporary Gradle trust store under `.tmp/gradle-truststore/`.
- Imported the observed Maven/Google certificate chains into that temporary
  trust store.
- Ran Flutter with process-local `GRADLE_OPTS` pointing to the temporary trust
  store.

No repo Gradle settings or Android Studio JBR files were changed.

## Crashlytics Device Proof

Non-fatal self-test run:

```powershell
flutter run -d R5CT3291F6E --no-resident `
  --dart-define=SUPABASE_URL=$env:SUPABASE_URL `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY `
  --dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true `
  --dart-define=GROOKAI_CRASH_REPORTING_SELF_TEST=true
```

Observed:

- Debug APK built successfully.
- APK installed successfully after removing the previously installed package
  while keeping app data with `pm uninstall -k com.grookai.vault`.
- App launched on the Samsung.
- `APP_BOOT_V1` logged `crash_reporting_ready`.
- Firebase Crashlytics initialized for `com.grookai.vault`.
- Firebase Sessions notified Crashlytics of a new session.
- The self-test non-fatal exception logged as
  `GROOKAI_CRASH_REPORTING_SELF_TEST`.
- Logcat showed an outbound request to
  `https://crashlyticsreports-pa.googleapis.com/v1/firelog/legacy/batchlog`.

Fatal self-test run:

```powershell
flutter run -d R5CT3291F6E --no-resident `
  --dart-define=SUPABASE_URL=$env:SUPABASE_URL `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY `
  --dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true `
  --dart-define=GROOKAI_CRASH_REPORTING_SELF_TEST=true `
  --dart-define=GROOKAI_CRASH_REPORTING_FATAL_SELF_TEST=true
```

Observed:

- App launched and initialized Crashlytics.
- Logcat showed a fatal `FirebaseCrashlyticsTestCrash`.
- The process exited after the intentional crash.

Follow-up reopen:

```powershell
flutter run -d R5CT3291F6E --no-resident `
  --dart-define=SUPABASE_URL=$env:SUPABASE_URL `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY `
  --dart-define=GROOKAI_CRASH_REPORTING_ENABLED=true
```

Observed:

- App relaunched cleanly.
- `APP_BOOT_V1` again logged `crash_reporting_ready`.
- Firebase Sessions notified Crashlytics of a new session.
- App remained running after reopen.

## Remaining Crashlytics Gate

This is strong device-side proof, but it is not the final launch gate. Before
closing Crashlytics for launch, the Firebase console must show the
`com.grookai.vault` non-fatal self-test or fatal self-test crash from this
Samsung run.

## Supabase Migration Ledger Finding

Read-only linked migration inspection showed:

- E6 onboarding migrations are applied remotely:
  - `20260709100000`
  - `20260709110000`
- The launch-minimum trust/safety migration is still local-only:
  - `20260713190000`

Because the linked project appears to be the main Supabase project, not a
throwaway staging database, no remote schema mutation was applied in this pass.

## Current Launch Position

Progress made:

- Crashlytics moved from code-wired only to Samsung device-proven with
  non-fatal and fatal self-test evidence.
- Android local build proof is restored despite Norton SSL/TLS interception.
- E6 remote migration state is confirmed as applied on the linked project.
- Trust/safety remote migration state is confirmed as not yet applied on the
  linked project.

Still open:

- Firebase console readback for the Crashlytics event/crash.
- Apply and verify `20260713190000_trust_safety_block_report_v1.sql` in the
  intended staging/production target.
- Run the MEE live-ops verifier on the production host.
- Scanner V5 real-device recognition proof remains deferred.
