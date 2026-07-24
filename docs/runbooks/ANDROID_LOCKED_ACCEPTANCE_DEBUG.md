# Android Locked Acceptance Debug Harness

This harness exists only for unattended local acceptance on a locked Android
test device. It does not dismiss or weaken a secure keyguard. It only lets the
test activity appear over the keyguard, turns the display on when launched, and
keeps the display on while that activity is foregrounded.

Build the opt-in APK from the Flutter project root:

```powershell
flutter build apk --debug --android-project-arg=grookaiLockedAcceptance=true
```

Append the acceptance run's normal, non-secret `--dart-define` arguments to that
command when needed. The output remains
`build/app/outputs/flutter-apk/app-debug.apk`, but its identity is isolated:

- application ID: `com.grookai.vault.lockedacceptance`
- activity: `com.grookai.vault.MainActivity`
- ADB component:
  `com.grookai.vault.lockedacceptance/com.grookai.vault.MainActivity`

`GROOKAI_LOCKED_ACCEPTANCE=true` is the equivalent explicit environment flag.
If both the Gradle property and environment flag are present, they must agree.
Only the debug build type consumes the opt-in. Ordinary debug, profile, and
release builds keep their existing application identity and never enable the
lock-screen or keep-screen-on behavior.
