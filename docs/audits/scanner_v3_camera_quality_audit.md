# Scanner V3 Camera Quality Audit

Date: 2026-05-04

## Scope

Audited the active Scanner V3 camera path used by the Scan tab:

- `lib/screens/scanner/condition_camera_screen.dart`
- `lib/screens/scanner/widgets/scanner_debug_panel.dart`
- `lib/screens/scanner/widgets/scanner_state_label.dart`
- `lib/services/scanner_v3/scanner_v3_live_loop_controller.dart`
- Android native scanner bridge files were checked only for whether they own camera capture.

## Active Camera Path

On Android, the Scan tab opens `ConditionCameraScreen(title: 'Scan Card')`.

`ConditionCameraScreen` uses the Flutter `camera` package:

```text
CameraController
  -> ImageFormatGroup.yuv420
  -> startImageStream(CameraImage)
  -> NativeQuadDetector bridge for quad points
  -> ScannerV3LiveLoopController normalization
  -> V8/V9 identity pipeline
```

The Android native scanner files are not the active camera capture path for Scanner V3 on Android. They provide the native quad detector bridge and older Phase0 platform-view scaffolding. The actual Scanner V3 frames come from Flutter `CameraImage` YUV420 stream frames.

## Camera Quality Finding

Before this patch, Scanner V3 initialized the Flutter camera with:

```dart
ResolutionPreset.high
```

That preset is device/plugin dependent and does not guarantee 1080p input frames. If the plugin selected a lower stream size, Scanner V3 normalization and identity crops received lower-detail YUV frames.

The preview and input stream dimensions were also not visible in Diagnostics, so production testing could not confirm whether the scanner was receiving 1080p-class frames.

## Change

Scanner V3 now initializes camera capture with this ordered preference:

1. `ResolutionPreset.veryHigh`
2. `ResolutionPreset.high`
3. `ResolutionPreset.medium` only if higher presets fail

The scanner does not silently drop to a low-resolution mode unless initialization fails at higher presets. If fallback is used, Diagnostics records the fallback reason.

Diagnostics now expose:

- selected camera preset
- preview dimensions
- YUV image stream input dimensions
- camera initialization fallback reason, if any

## Candidate Safety Finding

Before this patch, production UI could show the primary candidate tile during `candidate_unstable` and `candidate_ambiguous`. That made weak or wrong suggestions feel like real results before V9 confidence guard acceptance.

## Candidate Safety Change

Production UI now suppresses card identity tiles unless the state is:

```text
identity_locked
```

State behavior:

- `scanning`: no candidate title
- `candidate_unstable`: “Reading card”, no card title
- `candidate_ambiguous`: “Need a clearer angle”, no card title
- `candidate_unknown`: “No confident match”, no card title
- `identity_locked`: card identity tile is shown
- `identityServiceUnavailable`: service unavailable copy, no guessed card

Debug Diagnostics may still show Top-5 raw candidates in debug builds.

## Expected Device Validation

With the patched APK:

- Diagnostics should show `preset veryHigh` if the Samsung accepts it.
- Input frame dimensions should be at least 1080p-class when supported.
- If `veryHigh` fails, Diagnostics should show fallback to `high`.
- Wrong low-confidence candidates should not be visible in production UI.
- Unknown/out-of-index cards should not display a wrong card suggestion.

## Remaining Validation Item

Record the Samsung Diagnostics values after install:

```text
camera: preset <value> preview <width>x<height> input <width>x<height>
```

These values are runtime/device-specific and must be captured from the device after opening Scanner V3.
