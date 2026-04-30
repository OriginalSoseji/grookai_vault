# Android Native Scanner Failure Audit

## 1. Executive Summary

Android Native Scanner Phase 0 is failing identity recognition most likely because the current Android CameraX implementation is still a compile-safe skeleton, not an image-quality-equivalent scanner path.

The strongest root cause is capture quality/framing instability before upload:

- Android marks readiness true immediately after CameraX binding, without real focus, exposure, motion, or settle gating.
- Android preview uses `PreviewView.ScaleType.FILL_CENTER` inside a Flutter `AspectRatio(3 / 4)` slot, while the CameraX preview and still capture use cases do not share an explicit target aspect ratio, resolution, crop, or rotation contract.
- Android uses `ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY`, does not enable a quality/high-resolution capture mode, and does not set JPEG quality.
- Android does not perform center focus/metering before capture.
- Android default exposure is `0.0`, while iOS defaults to `0.25`.

The evidence points away from a backend, resolver, or file-handoff issue: Flutter receives a valid `imagePath`, dimensions, and file size, then uploads `XFile(capture.imagePath)` through the existing identity service. When the backend returns zero candidates, it means the pipeline received an image but AI/resolution could not extract a usable identity.

Root cause classification: **Android CameraX capture/parity gap: preview/capture framing mismatch plus premature capture before focus/exposure settle.**

## 2. Android Capture Flow

Files inspected:

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0Controller.kt`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0PlatformView.kt`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0Bridge.kt`
- `lib/screens/scanner/native_scanner_phase0_screen.dart`
- `lib/services/scanner/native_scanner_phase0_bridge.dart`

Current Android native flow:

1. `MainActivity` registers `ScannerCameraPhase0Bridge`.
2. The Flutter screen renders `AndroidView` with view type `grookai/scanner_camera_phase0_preview`.
3. `ScannerCameraPhase0PlatformView` creates a CameraX `PreviewView`.
4. Platform view init calls `controller.attachPreviewView(previewView)` and `controller.startSession()`.
5. Flutter `onPlatformViewCreated` also calls `NativeScannerPhase0Bridge.startSession()`.
6. `ScannerCameraPhase0Controller.bindCamera()` builds:
   - `Preview.Builder().build()`
   - `ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build()`
7. The controller binds both use cases to `CameraSelector.DEFAULT_BACK_CAMERA`.
8. It immediately sets:
   - `previewStarted = true`
   - `focusStable = true`
   - `exposureStable = true`
9. Flutter polls `getReadiness()` and auto-captures when `ready` is true.
10. `capture()` writes a JPEG to `activity.cacheDir`.
11. Flutter uploads `XFile(capture.imagePath)` through `IdentityScanService.startScan`.

Evidence:

- `ScannerCameraPhase0PlatformView.kt:13-14` uses `PreviewView.ImplementationMode.COMPATIBLE` and `PreviewView.ScaleType.FILL_CENTER`.
- `ScannerCameraPhase0Controller.kt:222-227` creates preview and image capture with no target aspect ratio, resolution, rotation, or quality settings beyond latency mode.
- `ScannerCameraPhase0Controller.kt:239-241` marks preview/focus/exposure stable immediately after binding.
- `ScannerCameraPhase0Controller.kt:303-304` defines ready as only `previewStarted && !capturing && configurationError == null`.
- `ScannerCameraPhase0Controller.kt:158-184` writes a JPEG to cache and returns `imagePath`, dimensions, file size, zoom, exposure bias, and ready.
- `native_scanner_phase0_screen.dart:275-287` captures, then starts identity handoff.
- `native_scanner_phase0_screen.dart:485` uploads `XFile(capture.imagePath)`.

## 3. iOS vs Android Parity Gaps

Preview aspect ratio:

- iOS uses `AVCaptureVideoPreviewLayer.videoGravity = .resizeAspectFill` in `ScannerCameraPhase0.swift:185`.
- Android uses `PreviewView.ScaleType.FILL_CENTER` in `ScannerCameraPhase0PlatformView.kt:14`.
- Flutter places both in `AspectRatio(aspectRatio: 3 / 4)` at `native_scanner_phase0_screen.dart:690`.
- Android does not force CameraX preview and capture use cases to the same target aspect ratio. This can make the user frame the card in one crop while the saved JPEG uses a different field of view.

Captured image orientation:

- iOS photo output writes JPEG data from `AVCapturePhoto.fileDataRepresentation()` and reads image dimensions from image metadata.
- Android uses CameraX defaults and `BitmapFactory.decodeFile(..., inJustDecodeBounds = true)` for dimensions.
- Android does not set `targetRotation` on `Preview` or `ImageCapture`. On Samsung, the saved JPEG may rely on EXIF orientation while backend/image tooling may see unrotated pixels depending on decoder behavior.

Capture resolution and JPEG quality:

- iOS uses `session.sessionPreset = .photo` at `ScannerCameraPhase0.swift:408`.
- iOS enables high-resolution photo capture at `ScannerCameraPhase0.swift:604` and `ScannerCameraPhase0.swift:609`.
- Android uses `ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY` at `ScannerCameraPhase0Controller.kt:226`.
- Android does not set capture resolution, target aspect ratio, target rotation, or JPEG quality.

Focus behavior:

- iOS sets focus point to the center and uses continuous autofocus at `ScannerCameraPhase0.swift:305-323`.
- Android never calls CameraX `FocusMeteringAction` or center metering.
- Android marks `focusStable = true` immediately after binding at `ScannerCameraPhase0Controller.kt:240`.

Exposure behavior:

- iOS sets exposure point to the center and continuous auto exposure at `ScannerCameraPhase0.swift:325-329`.
- iOS applies exposure target bias at `ScannerCameraPhase0.swift:489`.
- Android maps exposure compensation index if supported, but default is `0.0` at `ScannerCameraPhase0Controller.kt:32`, while Flutter/iOS expectations show `0.25`.
- Android marks `exposureStable = true` immediately after binding at `ScannerCameraPhase0Controller.kt:241`.

Zoom behavior:

- iOS default zoom is `1.3` at `ScannerCameraPhase0.swift:19`.
- Android default zoom is also `1.3` at `ScannerCameraPhase0Controller.kt:31`.
- Android applies zoom through CameraX zoom ratio at `ScannerCameraPhase0Controller.kt:259-266`.
- The zoom itself is likely not the main blocker, but a 1.3x zoom combined with mismatched preview/capture crop can make framing errors more likely.

Readiness behavior:

- iOS uses motion updates, center focus/exposure, a `0.3s` capture settle delay, and a `0.10s` stable readiness duration.
- Android skeleton has no motion check, no settle delay, no debounce, and no focus/exposure completion signal.
- Flutter auto-capture can therefore fire as soon as CameraX binds.

File handoff:

- Android writes to `activity.cacheDir` and returns a readable absolute path.
- Flutter checks only `imagePath`, width, height, and file size through `NativeScannerPhase0Capture.isPass`.
- Flutter displays the captured file with `Image.file` and uploads the same path with `XFile`.
- This makes a file-path issue less likely than bad content inside a valid JPEG.

## 4. Evidence From Failed Scans

User-observed evidence:

- Android native preview appears narrow/cropped at the top.
- Captures may not frame the full card correctly.
- AI often returns zero candidates on failed scans.

Local evidence search:

- No current Android-native failure screenshots were found under `.tmp`.
- Existing repo evidence confirms the captured image is displayed and uploaded from the native payload path, not a separate path.

Interpretation:

- A narrow or top-cropped preview is consistent with `PreviewView.ScaleType.FILL_CENTER` inside a tall `3 / 4` Flutter container and no explicit CameraX use-case aspect ratio.
- Zero AI candidates after a successful upload is consistent with a valid but low-quality or wrongly framed image.
- If `imagePath` were invalid, the app would fail at capture validation or upload/start-scan, not return an AI result with zero candidates.

## 5. Likely Root Cause

Primary likely root cause:

**Android captures are being taken before the camera is optically ready, and the preview crop the user sees is not guaranteed to match the still image uploaded to identity.**

Specific failure sources, ranked:

1. **Premature auto-capture before focus/exposure settle.**
   - Android reports ready immediately after binding.
   - No center focus/metering action runs.
   - No settle delay exists before capture.
   - This can produce blur, glare, underexposure, or overexposure that AI cannot read.

2. **Preview/capture framing mismatch.**
   - Flutter container is `3 / 4`.
   - PreviewView uses `FILL_CENTER`.
   - CameraX preview and image capture do not share explicit aspect ratio, rotation, or resolution.
   - User frames against a cropped preview while `ImageCapture` saves a different sensor crop.

3. **Orientation/metadata ambiguity.**
   - Android does not set target rotation.
   - Dimensions are decoded from pixels without considering EXIF orientation.
   - If backend code does not honor EXIF consistently, AI/border stages may see rotated or oddly dimensioned content.

4. **Capture quality mode too weak for identity.**
   - `CAPTURE_MODE_MINIMIZE_LATENCY` favors speed over quality.
   - No explicit JPEG quality or high-resolution target exists.

5. **Exposure default mismatch.**
   - iOS defaults to `+0.25`; Android defaults to `0.0`.
   - Flutter UI displays `+0.25` when no capture is present, but Android reports actual capture bias from the controller.

Less likely root causes:

- Backend resolver or AI logic: explicitly out of scope, and zero candidates are explainable by input image quality.
- File handoff: Android returns path/width/height/file size and Flutter uploads that exact path.
- Zoom alone: 1.3x matches iOS, but it worsens framing if preview/capture crops differ.

## 6. Safe Fix Plan

Patch scope should remain Android native scanner only.

Recommended next patch:

1. Match Android preview/capture geometry.
   - Set a consistent target aspect ratio for both `Preview` and `ImageCapture`.
   - Set `targetRotation` from display rotation for both use cases.
   - Prefer a capture shape that preserves full card frame for backend border detection.
   - Re-evaluate whether `FILL_CENTER` should remain or whether `FIT_CENTER` is safer for full-card framing during calibration.

2. Add center focus/exposure metering.
   - Use CameraX `MeteringPointFactory` from `PreviewView`.
   - Start a center `FocusMeteringAction` after binding.
   - Do not mark focus/exposure stable until the metering action succeeds, times out, or a conservative settle timer elapses.

3. Add readiness debounce and capture settle delay.
   - Mirror iOS behavior: require focus/exposure stable and a short stable-ready window.
   - Delay capture by about `300ms` after readiness, especially for auto-capture.

4. Use quality-oriented capture settings.
   - Replace latency capture mode with `CAPTURE_MODE_MAXIMIZE_QUALITY` for scanner Phase 0.
   - Add explicit JPEG quality if supported by the selected CameraX version.
   - Confirm output dimensions on Samsung.

5. Align exposure default with iOS.
   - Set Android default exposure bias to `0.25` if the device supports a nonzero compensation step.
   - Return the actual applied bias.

6. Add debug-only capture telemetry.
   - Log preview view size, capture dimensions, target rotation, applied zoom, applied exposure index, and file size.
   - Do not alter backend or resolver behavior.

Validation sequence after patch:

1. Build APK.
2. Run on Samsung.
3. Capture one card and inspect the image displayed by `Image.file`.
4. Confirm the full card border is visible and upright.
5. Confirm dimensions/file size are reasonable.
6. Run three scan cases:
   - flat common card,
   - holo/rare card,
   - edge lighting/glare case.
7. Confirm failures correlate with image quality rather than backend behavior.

## 7. Do Not Touch List

Do not change:

- Backend identity worker.
- AI resolver.
- Border detector.
- Supabase schema.
- Scanner database tables.
- Phase 7 fingerprint code.
- Remote lookup fast paths.
- Identity contracts.
- Pricing or ingestion pipelines.

Do not reintroduce:

- Hash/fingerprint scanner fast path.
- Synthetic scanner lane behavior.
- Any identity shortcut before upload/AI/resolver.

Keep scanner behavior:

- `capture -> upload -> AI -> resolver`
- Patch only Android native preview/capture readiness and output quality.
