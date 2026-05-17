# Android Native Scanner Phase 0 Audit

## 1. Executive Summary

The existing `NativeScannerPhase0Screen` is implemented as an iOS-only native camera proof surface. Flutter expects a native platform view named `grookai/scanner_camera_phase0_preview` and a method channel named `grookai/scanner_camera_phase0`, but only iOS registers those native surfaces today.

Android currently has no equivalent native scanner implementation. The Android app has a minimal `MainActivity : FlutterActivity`, no platform-view registration for `grookai/scanner_camera_phase0_preview`, no method-channel handler for `grookai/scanner_camera_phase0`, and no `android.permission.CAMERA` entry in the main manifest.

Android should continue using the existing supported route until the native implementation exists:

`ConditionCameraScreen -> IdentityScanScreen(initialFrontFile: file)`

To build Android parity, implement a native Android scanner plugin using CameraX, register it from `MainActivity`, add camera permission, and return the same payload contract that iOS returns to Flutter.

## 2. Current iOS Behavior

Flutter screen:

- `lib/screens/scanner/native_scanner_phase0_screen.dart`
- Uses `_isIos => defaultTargetPlatform == TargetPlatform.iOS`.
- Uses `UiKitView` with `NativeScannerPhase0Bridge.previewViewType`.
- Calls `NativeScannerPhase0Bridge.startSession()` when the platform view is created.
- Polls `NativeScannerPhase0Bridge.getReadiness()` every 250 ms.
- Auto-captures when preview is ready, capture is not already done, and readiness is true.
- Calls `NativeScannerPhase0Bridge.capture()`.
- Converts returned `imagePath` into an `XFile` and sends it to `IdentityScanService.startScan`.
- Computes local recent-scan cache fingerprint from the captured file, but does not call any remote fingerprint fast path.

Flutter bridge contract:

- File: `lib/services/scanner/native_scanner_phase0_bridge.dart`
- Platform view id: `grookai/scanner_camera_phase0_preview`
- Method channel: `grookai/scanner_camera_phase0`
- Methods:
  - `startSession`
  - `stopSession`
  - `setZoom`
  - `setExposureBias`
  - `getReadiness`
  - `capture`

Capture payload expected by Flutter:

- `imagePath`: string
- `width`: int
- `height`: int
- `fileSize`: int
- `zoom`: double
- `exposureBias`: double
- `ready`: bool

Readiness payload expected by Flutter:

- `ready`: bool
- `deviceStable`: bool
- `focusStable`: bool
- `exposureStable`: bool

iOS native implementation:

- File: `ios/Runner/ScannerCameraPhase0.swift`
- Uses `AVCaptureSession`, `AVCapturePhotoOutput`, `AVCaptureVideoPreviewLayer`, and `CoreMotion`.
- Registers method channel `grookai/scanner_camera_phase0`.
- Registers platform view `grookai/scanner_camera_phase0_preview`.
- Opens the back wide camera.
- Uses photo preset and high-resolution photo capture.
- Applies default zoom `1.3`.
- Applies exposure bias `0.25`.
- Sets focus and exposure to center.
- Tracks focus stability, exposure stability, and motion stability.
- Requires stable readiness for `0.10s`.
- Waits for controls to settle for `0.3s` before capture.
- Writes JPEG data to `NSTemporaryDirectory()` using a UUID filename.
- Returns image path, dimensions, file size, zoom, exposure bias, and readiness.

iOS registration:

- File: `ios/Runner/AppDelegate.swift`
- `didInitializeImplicitFlutterEngine` registers generated plugins and then registers `ScannerCameraPhase0Bridge`.

## 3. Android Current State

Android files inspected:

- `android/app/src/main/kotlin/com/example/grookai_vault/MainActivity.kt`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle.kts`
- `android/build.gradle.kts`
- `android/settings.gradle.kts`
- `android/app/src/main/`

Findings:

- `MainActivity.kt` is only:
  - `class MainActivity : FlutterActivity()`
- No `configureFlutterEngine` override exists.
- No Android method channel exists for `grookai/scanner_camera_phase0`.
- No Android platform view factory exists for `grookai/scanner_camera_phase0_preview`.
- No Android native camera controller exists.
- No CameraX dependency exists in `android/app/build.gradle.kts`.
- Main manifest has `INTERNET`, `READ_MEDIA_IMAGES`, and legacy `READ_EXTERNAL_STORAGE`.
- Main manifest does not declare `android.permission.CAMERA`.
- The repo already has Flutter camera plugin dependencies:
  - `camera`
  - `camera_android`
  - `image_picker`
  - `sensors_plus`
- The legacy Android-supported scan route is Flutter-level camera:
  - `lib/screens/scanner/condition_camera_screen.dart`
  - then `lib/screens/identity_scan/identity_scan_screen.dart`

Existing Android-supported scanner route:

- `_startScanFlow()` in `lib/main_shell.dart`
- If native flag is false, opens `ConditionCameraScreen`.
- `ConditionCameraScreen` uses the Flutter `camera` package and `CameraPreview`.
- It captures an `XFile` and returns it.
- `_startScanFlow()` then opens `IdentityScanScreen(initialFrontFile: file)`.

## 4. Platform View And Channel Names

Android must implement the exact same identifiers used by Flutter:

- Platform view id:
  - `grookai/scanner_camera_phase0_preview`
- Method channel:
  - `grookai/scanner_camera_phase0`

Android must support the same method names:

- `startSession`
- `stopSession`
- `setZoom`
- `setExposureBias`
- `getReadiness`
- `capture`

Android must return the same map keys:

- `imagePath`
- `width`
- `height`
- `fileSize`
- `zoom`
- `exposureBias`
- `ready`

Readiness map keys:

- `ready`
- `deviceStable`
- `focusStable`
- `exposureStable`

## 5. Missing Android Pieces

Required Android code that does not exist today:

1. Native plugin registration.
   - `MainActivity` must override `configureFlutterEngine`.
   - It must register a method channel and platform view factory.

2. Platform view implementation.
   - A native Android view that renders camera preview into Flutter.
   - Prefer CameraX `PreviewView`.

3. Camera session/controller.
   - Shared or lifecycle-aware controller equivalent to iOS `ScannerCameraPhase0CameraController`.
   - Owns CameraX provider, camera selector, preview use case, image capture use case, zoom, exposure, readiness state, and output files.

4. Permission handling.
   - Add `android.permission.CAMERA`.
   - Ensure runtime permission path is handled before starting CameraX.
   - Decide whether permission is handled in Flutter route before native screen or inside native plugin.

5. Readiness implementation.
   - Device stability from Android sensors.
   - Focus stability from CameraX camera state / metering action lifecycle or conservative time-based settle window.
   - Exposure stability from exposure compensation state or conservative time-based settle window.
   - Stable-ready debounce matching iOS behavior.

6. Capture implementation.
   - CameraX `ImageCapture.takePicture`.
   - Save JPEG to app cache/temp storage.
   - Return absolute local file path.
   - Return dimensions and file size.
   - Return applied zoom/exposure values.

7. Error mapping.
   - Android should match iOS error codes where practical:
     - `camera_unavailable`
     - `configuration_failed`
     - `permission_denied`
     - `preview_unavailable`
     - `capture_in_progress`
     - `not_ready`
     - `capture_failed`

## 6. Exact Android Files To Create Or Modify

Modify:

- `android/app/src/main/kotlin/com/example/grookai_vault/MainActivity.kt`
  - Override `configureFlutterEngine`.
  - Register the Android scanner bridge.

- `android/app/src/main/AndroidManifest.xml`
  - Add `android.permission.CAMERA`.
  - Consider `<uses-feature android:name="android.hardware.camera" android:required="false" />` or `required="true"` depending distribution intent.

- `android/app/build.gradle.kts`
  - Add CameraX dependencies if implementing native CameraX directly:
    - `androidx.camera:camera-core`
    - `androidx.camera:camera-camera2`
    - `androidx.camera:camera-lifecycle`
    - `androidx.camera:camera-view`
  - Confirm min SDK is compatible with selected CameraX versions.

Create:

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0Bridge.kt`
  - Registers method channel and platform view factory.

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0ViewFactory.kt`
  - Implements `PlatformViewFactory`.

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0PlatformView.kt`
  - Owns and returns the preview view.

- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/ScannerCameraPhase0Controller.kt`
  - CameraX session/controller equivalent to iOS controller.

- Optional helper files:
  - `ScannerCameraPhase0Errors.kt`
  - `ScannerCameraPhase0Readiness.kt`
  - `ScannerCameraPhase0FileOutput.kt`

Flutter changes likely needed later, but not part of this audit:

- `lib/screens/scanner/native_scanner_phase0_screen.dart`
  - Replace `UiKitView` with platform-specific view creation:
    - iOS: `UiKitView`
    - Android: `AndroidView` or hybrid composition platform view.
  - Expand `_isIos` gate into a supported-platform gate.

- `lib/main.dart`
  - Make `kNativeScannerPhase0Enabled` true only for platforms with registered native scanner support.
  - After Android native implementation exists, allow Android too.

## 7. Camera API Choice

Recommended Android camera API: CameraX.

Rationale:

- CameraX is the best fit for a Flutter app that needs preview plus still capture with lifecycle management.
- It wraps Camera2 complexity while still exposing zoom ratio, exposure compensation, tap/metering controls, and image capture.
- `PreviewView` maps cleanly into a Flutter platform view.
- CameraX supports back camera selection and JPEG file capture through `ImageCapture`.

Camera2 should not be the first choice for Phase 0 parity unless CameraX fails a specific requirement. Camera2 would add more lifecycle, surface, orientation, and device-compatibility burden.

## 8. Auto-Capture Requirements

To match iOS behavior, Android needs:

- Back camera preview.
- Default zoom around `1.3`.
- Exposure compensation equivalent to iOS `0.25` bias, mapped into Android exposure compensation steps.
- Center focus/metering action on session start.
- Motion stability tracking from sensors.
- Focus/exposure settle gating.
- Stable-ready debounce of about `100ms`.
- Capture-settle delay of about `300ms`.
- `getReadiness()` returns all readiness booleans.
- `capture()` refuses if already capturing or not ready.
- Capture output must be a local JPEG file that `XFile(capture.imagePath)` can read.

Android implementation can start with conservative readiness:

- `deviceStable` from accelerometer/gyroscope threshold.
- `focusStable` true after a center focus/metering action completes or times out.
- `exposureStable` true after exposure compensation is applied and a short settle window passes.
- `ready` true only when all three are true for the debounce window.

## 9. File Output Contract Back To Flutter

Capture should write to app cache, not external public storage:

- Use `context.cacheDir` or `context.externalCacheDir`.
- Filename: UUID plus `.jpg`.
- JPEG output from CameraX `ImageCapture.OutputFileOptions`.
- Return absolute path.
- Return file length from the written file.
- Return dimensions from image metadata or decode bounds.

Required payload shape:

```text
{
  imagePath: String,
  width: Int,
  height: Int,
  fileSize: Int,
  zoom: Double,
  exposureBias: Double,
  ready: Boolean
}
```

The existing Flutter handoff depends on `imagePath` being readable by Dart `File` and usable as `XFile(capture.imagePath)`.

## 10. Parity Gaps Vs iOS

Current gaps:

- No Android native method channel.
- No Android platform view.
- No Android native camera controller.
- No Android `CAMERA` permission in main manifest.
- No CameraX dependencies.
- No Android readiness implementation.
- No Android native auto-capture support.
- Flutter native scanner screen uses `UiKitView`, not Android platform view creation.
- Flutter screen currently labels non-iOS as unsupported.
- No Android native error mapping.
- No Android temp-file output contract.

Possible parity differences to calibrate:

- Android exposure compensation is indexed steps/ranges, not iOS floating bias.
- CameraX focus/exposure callbacks differ from AVFoundation.
- Motion sensor axes and thresholds differ by device orientation.
- Preview aspect ratio and captured photo orientation need explicit handling.
- Platform view composition may affect performance.

## 11. Risks

- Camera permission regression if manifest/runtime flow is incomplete.
- Platform view rendering differences on Android, especially with hybrid composition and camera preview surfaces.
- Orientation mismatch between preview and saved JPEG.
- Device-specific CameraX behavior on Samsung devices.
- Exposure compensation range may not support a direct `0.25` mapping.
- Readiness thresholds copied from iOS may be too strict or too loose on Android.
- Capture may produce large files; upload and hash path should be checked for memory and latency.
- Lifecycle bugs if session is not stopped/released when the Flutter view is disposed.
- Conflict with existing Flutter `camera` plugin if both native and plugin camera sessions are active at the same time.
- Flutter tool/device authorization problems can block verification unrelated to scanner code.

## 12. Implementation Plan

1. Keep routing unchanged until Android native scanner compiles and launches.
   - Android remains on `ConditionCameraScreen -> IdentityScanScreen`.
   - iOS remains on `NativeScannerPhase0Screen`.

2. Add Android native skeleton.
   - Create bridge, platform view factory, platform view, and controller classes.
   - Register them from `MainActivity.configureFlutterEngine`.
   - Add camera permission and CameraX dependencies.

3. Implement preview only.
   - Render CameraX `PreviewView` in Flutter platform view.
   - Verify a black/blank preview is not shown.
   - Verify lifecycle start/stop.

4. Implement method channel controls.
   - `startSession`
   - `stopSession`
   - `setZoom`
   - `setExposureBias`
   - `getReadiness`

5. Implement readiness.
   - Start with conservative focus/exposure settle windows.
   - Add motion stability.
   - Log readiness state transitions in debug builds.

6. Implement capture.
   - Save JPEG to cache.
   - Return payload with path, dimensions, file size, zoom, exposure bias, ready.

7. Update Flutter native screen for Android platform view.
   - Use `AndroidView` for Android and `UiKitView` for iOS.
   - Remove unsupported Android panel only after Android native plugin exists.

8. Expand platform gate.
   - `kNativeScannerPhase0Enabled` can include Android only after native Android registration exists and is verified.

9. Verify on connected Samsung.
   - `flutter clean`
   - `flutter pub get`
   - `flutter analyze lib/main.dart lib/main_shell.dart lib/screens/scanner/native_scanner_phase0_screen.dart`
   - `flutter run -d <authorized Samsung id>`
   - Open scanner, confirm native Android preview renders.
   - Capture one card, confirm payload and identity upload.

## 13. Recommended Build Sequence

Recommended sequence for the future implementation patch:

1. Fix device authorization first.
   - `adb devices` must show `<device_id> device`, not `unauthorized`.

2. Add Android native classes and manifest/Gradle entries.

3. Build compile-only:
   - `flutter analyze lib/screens/scanner/native_scanner_phase0_screen.dart lib/main.dart lib/main_shell.dart`
   - `flutter build apk --debug`

4. Run preview smoke test:
   - `flutter run -d <device_id> --no-resident`
   - Open scanner.
   - Confirm Android native preview appears.

5. Run capture contract test:
   - Capture manually.
   - Log returned `imagePath`, `width`, `height`, `fileSize`, `zoom`, `exposureBias`, `ready`.
   - Confirm Dart can read the file.

6. Run identity handoff test:
   - Confirm `IdentityScanService.startScan(frontFile: XFile(imagePath))` still creates an event.
   - Confirm no scanner fast path or lookup route is re-enabled.

7. Only then change routing to enable native scanner on Android.

## 14. Recommendation

Proceed with a small Android-native Phase 0 implementation plan before coding. The first implementation should target CameraX preview/capture parity only, not a new scanner architecture.

Do not route Android to `NativeScannerPhase0Screen` until:

- Android registers `grookai/scanner_camera_phase0_preview`.
- Android handles `grookai/scanner_camera_phase0`.
- Android manifest includes camera permission.
- Capture returns the exact Flutter payload contract.
- Samsung device verification passes.
