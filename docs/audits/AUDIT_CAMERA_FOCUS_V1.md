# AUDIT_CAMERA_FOCUS_V1

Date: 2026-02-14  
Scope: camera focus/exposure capabilities and current scanner/identity camera configuration.  
Behavior changes: none (audit only).

## 1) Camera package + version in use

- Declared dependency: `camera: ^0.10.5+9` in `pubspec.yaml:41`.
- Resolved lock version: `camera 0.10.6` in `pubspec.lock:52` and `pubspec.lock:59`.
- Resolved platform implementations:
  - `camera_android 0.10.10+14` in `pubspec.lock:60` and `pubspec.lock:67`
  - `camera_avfoundation 0.9.23` in `pubspec.lock:68` and `pubspec.lock:75`
  - `camera_platform_interface 2.12.0` in `pubspec.lock:76` and `pubspec.lock:83`
  - `camera_web 0.3.5+3` in `pubspec.lock:84` and `pubspec.lock:91`

Conclusion: scanner camera uses Flutter `camera` plugin (not `camerawesome`).

## 2) Current CameraController initialization/config (scanner)

`ConditionCameraScreen` is the only direct `CameraController` usage in app code.

- Camera discovery and back-camera selection: `lib/screens/scanner/condition_camera_screen.dart:48`.
- Controller initialization:
  - `CameraController(...)`: `lib/screens/scanner/condition_camera_screen.dart:58`
  - `ResolutionPreset.high`: `lib/screens/scanner/condition_camera_screen.dart:60`
  - `enableAudio: false`: `lib/screens/scanner/condition_camera_screen.dart:61`
  - `imageFormatGroup`: not provided in constructor (defaults to plugin/platform default).
- Streaming enabled for quad detection: `lib/screens/scanner/condition_camera_screen.dart:75`.
- Preview widget: `CameraPreview(_controller!)` at `lib/screens/scanner/condition_camera_screen.dart:236`.

Related processing constraint:

- `NativeQuadDetector` hard-requires YUV420 images:
  - `if (image.format.group != ImageFormatGroup.yuv420) return null;`
  - `lib/services/scanner/native_quad_detector.dart:17`

Implication: current scanner relies on platform-default stream format being YUV420 (not explicitly requested at controller construction).

## 3) Focus/exposure API surface available in this plugin version

Source audited from installed package:  
`C:/Users/ccabr/AppData/Local/Pub/Cache/hosted/pub.dev/camera-0.10.6/lib/src/camera_controller.dart`

Available controller methods:

- `setFlashMode(...)`: `camera_controller.dart:693`
- `setExposureMode(...)`: `camera_controller.dart:703`
- `setExposurePoint(...)`: `camera_controller.dart:716`
- `getMinExposureOffset(...)`: `camera_controller.dart:739`
- `getMaxExposureOffset(...)`: `camera_controller.dart:749`
- `getExposureOffsetStepSize(...)`: `camera_controller.dart:761`
- `setExposureOffset(...)`: `camera_controller.dart:781`
- `lockCaptureOrientation(...)`: `camera_controller.dart:816`
- `unlockCaptureOrientation(...)`: `camera_controller.dart:839`
- `setFocusMode(...)`: `camera_controller.dart:829`
- `setFocusPoint(...)`: `camera_controller.dart:853`

Additional capability flags on `CameraValue`:

- `exposurePointSupported`: `camera_controller.dart:130`
- `focusPointSupported`: `camera_controller.dart:133`
- Populated from initialize event:
  - `camera_controller.dart:373`
  - `camera_controller.dart:375`

Enum support:

- `FlashMode { off, auto, always, torch }`  
  `.../camera_platform_interface-2.12.0/lib/src/types/flash_mode.dart:6`
- `FocusMode { auto, locked }`  
  `.../camera_platform_interface-2.12.0/lib/src/types/focus_mode.dart:6`
- `ExposureMode { auto, locked }`  
  `.../camera_platform_interface-2.12.0/lib/src/types/exposure_mode.dart:6`

Input constraints:

- Focus/exposure points must be normalized `[0..1]` else `ArgumentError`:
  - `camera_controller.dart:717`
  - `camera_controller.dart:854`

## 4) Current app usage of focus/exposure APIs

No app code currently calls any focus/exposure/orientation/flash APIs:

- Search returned no references in `lib/` for:
  - `setFocusPoint`, `setExposurePoint`, `setExposureMode`, `setFocusMode`,
    `setFlashMode`, `setExposureOffset`, `lockCaptureOrientation`, `unlockCaptureOrientation`.

Current autofocus behavior:

- No explicit focus mode is set by app.
- Plugin initializes and stores device-reported focus mode on init:
  - `camera_controller.dart:371`
- App therefore uses default platform camera behavior (typically AF auto) unless changed later.

## 5) Scanner/identity camera entrypoints and helpers

Scanner/identity integration points:

- Main scan nav opens `ConditionCameraScreen`: `lib/main.dart:839`
- Then hands image to identity flow: `lib/main.dart:850`
- Identity screen also opens `ConditionCameraScreen`: `lib/screens/identity_scan/identity_scan_screen.dart:75`
- Condition scan flow opens `ConditionCameraScreen`: `lib/screens/scanner/scan_capture_screen.dart:65`

Other capture paths:

- `ScanIdentifyScreen` uses `image_picker` direct camera capture (`ImageSource.camera`):
  - `lib/screens/scanner/scan_identify_screen.dart:26`
  - `lib/screens/scanner/scan_identify_screen.dart:27`
- These `image_picker` paths do not expose tap-to-focus/exposure controls in current app code.

## 6) Tap-to-focus feasibility in current UI

Condition scanner live preview is rendered in a `Stack`:

- `Stack` container: `lib/screens/scanner/condition_camera_screen.dart:231`
- `CameraPreview` child: `lib/screens/scanner/condition_camera_screen.dart:236`
- Overlay is inside `IgnorePointer(ignoring: true)`: `lib/screens/scanner/condition_camera_screen.dart:238`

Current gesture handling:

- Only shutter button has `GestureDetector` tap:
  - `lib/screens/scanner/condition_camera_screen.dart:257`
- No `onTapDown` handler on preview region currently.

Conclusion: there is a suitable stack layer to add a preview `GestureDetector`/`Listener` for tap coordinates without reworking layout.

## 7) Platform/device limitations (relevant to focus/exposure)

- Capability is device-dependent:
  - runtime support must be checked via `controller.value.focusPointSupported` and `exposurePointSupported` (`camera_controller.dart:130`, `camera_controller.dart:133`).
- `startImageStream` is documented as Android/iOS-only:
  - `camera_controller.dart:483`.
- Resolution availability is not guaranteed; plugin may downgrade:
  - `camera_controller.dart:265`.
- If `imageFormatGroup` is null, platform default format is used:
  - `camera_controller.dart:285`.
- Exposure offset step size can indicate no support in platform interface (`-1`):
  - `.../camera_platform_interface-2.12.0/lib/src/platform_interface/camera_platform.dart:231`
  - `.../camera_platform_interface-2.12.0/lib/src/platform_interface/camera_platform.dart:232`
- Web implementation leaves focus/exposure APIs unimplemented:
  - `.../camera_web-0.3.5+3/lib/src/camera_web.dart:555`
  - `.../camera_web-0.3.5+3/lib/src/camera_web.dart:560`
  - `.../camera_web-0.3.5+3/lib/src/camera_web.dart:585`
  - `.../camera_web-0.3.5+3/lib/src/camera_web.dart:590`

## 8) Recommended minimal change (not applied in this audit)

1. Add preview-level `GestureDetector` with `onTapDown` around `CameraPreview` stack area in `ConditionCameraScreen`.
2. Convert tap coordinates to normalized `[0..1]` based on preview render box.
3. Guard with runtime capabilities:
   - if `controller.value.focusPointSupported`, call `setFocusPoint(normalizedPoint)`.
   - if `controller.value.exposurePointSupported`, call `setExposurePoint(normalizedPoint)`.
4. Optionally set `setFocusMode(FocusMode.auto)` and `setExposureMode(ExposureMode.auto)` once after init (or before setting points), with exception handling.
5. For deterministic scanner stream compatibility, explicitly pass `imageFormatGroup: ImageFormatGroup.yuv420` in `CameraController(...)` since quad detector currently rejects non-YUV420 frames (`lib/services/scanner/native_quad_detector.dart:17`).

This is the smallest change set that adds tap-to-focus/exposure and reduces format ambiguity without changing scan pipeline architecture.
