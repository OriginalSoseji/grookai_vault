# SCANNER_NATIVE_CAMERA_SURFACE_CONTRACT_V1

## Status

Active.

This contract narrows `SCANNER_CAMERA_SYSTEM_V1` and `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1` for future Android CameraX/native camera work.

## Purpose

Prevent another native-camera attempt from bypassing the accepted production scanner surface.

Archived bad attempt:

```text
docs/audits/scanner_native_camerax_phase0_bad_attempt.md
```

That attempt proved the wrong route: CameraX was surfaced through the legacy Phase0 capture/review screen instead of the live scanner.

## Scope

Allowed scanner-only surfaces:

- `lib/screens/scanner/condition_camera_screen.dart`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- scanner docs, diagnostics, parsers, and local test harnesses

Do not use this contract to change detector thresholds, OCR, retrieval, identity model, ML, Supabase schema, pricing, vault writes, public web behavior, or backend identity workers.

## Native Surface Rule

Android native camera work must be integrated as an internal camera engine behind:

```text
ConditionCameraScreen
```

It must preserve:

- the existing immersive scanner UI
- card lock boxes
- tap-to-select card retention
- scan memory
- hidden-until-shutter identity reveal
- scanner V3/V4 live behavior
- debug auto-test and diagnostics
- no-card/background identity blocking
- real-card identity proof flow

## Forbidden Route

Android Scan Card must not route through:

```text
NativeScannerPhase0Screen
```

The old Phase0 route may remain only as archived or legacy scaffolding. It is not an acceptable Android path for production scanner work.

## Required Build Order

1. Keep the current Flutter camera scanner as the stable default.
2. Measure current camera health on device: stream FPS, analysis FPS, preview size, and input frame size.
3. Build any native camera engine behind an off-by-default scanner-only feature flag.
4. Prove native preview/capture inside `ConditionCameraScreen` before replacing the stable engine.
5. Prove identity parity after native frames feed the existing scanner loop.
6. Only then consider making native camera the default.

## Acceptance

A native camera attempt is acceptable only when real-device evidence proves:

- Scan Card opens the production scanner surface.
- Android status/navigation bars remain hidden in scanner mode.
- The scanner overlay is present and interactive.
- Two visible cards can be framed and independently selected.
- The selected card remains stable.
- Identity remains correct for known real cards.
- No-card/background identity blocking still passes.
- Camera preview smoothness or quality improves without identity regression.

Any native-camera work that breaks these requirements must be archived as a bad attempt before further work continues.
