# Scanner Flutter Camera Preset Probe V1

Date: 2026-05-09

Branch: `scanner-v4-card-present-gate`

## Scope

Scanner-only camera health probe on Samsung device `R5CT3291F6E`.

This audit compares the stable Flutter camera preset order against an off-by-default higher-quality Flutter preset probe. It does not change detector thresholds, identity authority, OCR, retrieval, ML, Supabase, pricing, vault writes, or backend identity workers.

## Important Evidence Limitation

The ADB auto-test phases were not valid no-card/background evidence in these runs because a card was visible during the empty/partial phases.

Use these reports only for camera health metrics:

- `.tmp/scanner_v4_real_device_reports/scanner_v4_camera_stable_medium_baseline_report_v1.json`
- `.tmp/scanner_v4_real_device_reports/scanner_v4_camera_quality_probe_report_v1.json`

Do not use them as card-present gate acceptance evidence.

## Stable Default Build

Default scanner build:

```text
SCANNER_V3_CAMERA_QUALITY_PROBE=false
```

Observed camera metrics:

```text
preset=medium
preview=720x480
input=720x480
stream_fps avg=20.9 min=10.8 max=29.3 n=37
analysis_fps avg=1.4 min=1.0 max=2.7 n=37
live_loop_fps avg=1.3 min=1.1 max=2.6 n=37
```

This explains the user's real-device report that the preview looks SD and around 20 FPS.

## Higher Flutter Preset Probe

Probe build:

```text
SCANNER_V3_CAMERA_QUALITY_PROBE=true
```

Probe preset order:

```text
veryHigh -> high -> medium
```

Observed camera metrics:

```text
preset=veryHigh
preview=1280x720
input=1280x720
stream_fps avg=18.2 min=14.0 max=25.3 n=33
analysis_fps avg=1.1 min=0.8 max=2.6 n=33
live_loop_fps avg=1.1 min=0.8 max=2.7 n=33
```

The higher preset improves frame dimensions but lowers stream and scanner-loop throughput.

## Conclusion

Do not make the higher Flutter preset the production default as the camera smoothness fix.

The higher Flutter preset is useful as a diagnostic A/B flag, but it does not solve the production requirement:

- preview still does not reach native-camera smoothness
- scanner-loop FPS decreases
- identity throughput risk increases
- this repeats the same class of regression previously observed when camera quality was raised directly

The next production path remains the contracted native camera surface behind `ConditionCameraScreen`, not a direct Flutter preset default change.

## Guardrail

Keep the stable default preset order unless explicitly running the probe:

```text
medium -> high -> veryHigh
```

Run the probe only with:

```text
--dart-define=SCANNER_V3_CAMERA_QUALITY_PROBE=true
```

Any native camera work must still follow:

```text
docs/contracts/SCANNER_NATIVE_CAMERA_SURFACE_CONTRACT_V1.md
docs/audits/scanner_native_camerax_phase0_bad_attempt.md
```
