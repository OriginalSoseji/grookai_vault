# Scanner Native Condition Camera Phase 1 Audit

Date: 2026-05-09

Branch: `scanner-v4-card-present-gate`

## Scope

Scanner-only CameraX Phase 1 work.

Goal:

```text
Render native Android CameraX preview behind the existing production scanner surface.
```

## Baseline Commit

Native-camera work started after committing the baseline guardrails:

```text
0ba3b11 Add scanner native camera baseline guardrails
```

## Implementation

The native camera path is off by default and enabled only with:

```text
--dart-define=SCANNER_NATIVE_CONDITION_CAMERA_ANDROID=true
```

The new native surface uses:

```text
grookai/scanner_condition_camera_preview
grookai/scanner_condition_camera
```

It is wired inside:

```text
ConditionCameraScreen
```

It does not route through:

```text
NativeScannerPhase0Screen
```

## Evidence

Real-device screenshot:

```text
.tmp/scanner_v4_real_device_reports/screenshots/native_condition_camera_phase1_overlay.png
```

Frame bridge report:

```text
.tmp/scanner_v4_real_device_reports/scanner_v4_native_condition_camera_frame_bridge_resolution_selector_report_v1.json
.tmp/scanner_v4_real_device_reports/scanner_v4_native_condition_camera_native_quad_bridge_report_v1.json
.tmp/scanner_v4_real_device_reports/scanner_v4_native_condition_camera_light_detection_bridge_report_v1.json
.tmp/scanner_v4_real_device_reports/scanner_v4_native_camera_identity_online_resolve_endpoint_report_v1.json
```

Observed result:

- CameraX preview renders.
- Existing scanner overlay renders above the native preview.
- Android Scan Card does not show the archived Phase0 review UI.
- The scanner remains immersive.
- CameraX `ImageAnalysis` frames reach the existing scanner V3/V4 live loop.
- Native scanner diagnostics report `engine=camerax`, `status=running`, `preview_size=1280x720`, and `input_size=1280x720`.
- Native CameraX now runs the existing quad detector before Dart receives the frame.
- Dart receives lightweight native detection events for card-box overlay updates and slower full-frame events for the existing card-present/identity loop.
- Scanner identity is online when the app is built with `SCANNER_V3_IDENTITY_BASE_ENDPOINT` or `SCANNER_V3_RESOLVE_ENDPOINT`.

## Issue Found And Fixed

First native preview attempt used:

```text
PreviewView.ImplementationMode.PERFORMANCE
```

That mode surfaced the CameraX `SurfaceView` above Flutter, hiding scanner controls and overlay.

Fixed by using:

```text
PreviewView.ImplementationMode.COMPATIBLE
```

This allows Flutter scanner controls and guide UI to render above the native preview.

## Current Limitation

This phase is wired but not production-ready.

The native frame bridge currently sends throttled YUV frames over a Flutter method channel. Real-device evidence proves the path works, but the live-loop throughput is still below the native-camera product target:

```text
stream_fps avg=10.14 min=4.82 max=16.55 n=18
frame_bridge_fps avg=2.34 min=1.90 max=3.06 n=18
analysis_fps avg=0.60 min=0.47 max=1.67 n=18
live_loop_fps avg=0.62 min=0.48 max=1.96 n=18
```

The first bridge run exposed a CameraX issue where analysis frames were `2736x2736`. The controller now uses a CameraX `ResolutionSelector` that prefers capture rate and targets `1280x720`; the follow-up device report confirms `input_size=1280x720`.

The native quad bridge removed the duplicate full-frame round trip where CameraX sent YUV bytes to Dart and Dart sent the same YUV bytes back to `gv/quad_detector_v1`. Latest real-device metrics:

```text
stream_fps avg=11.52 min=6.95 max=15.00 n=21
native_detection_fps avg=6.26 min=4.58 max=7.87 n=21
frame_bridge_fps avg=1.90 min=1.78 max=1.99 n=21
analysis_fps avg=0.63 min=0.58 max=0.66 n=21
live_loop_fps avg=0.63 min=0.58 max=0.66 n=21
native_elapsed_ms avg=83.7 min=78 max=91 n=21
```

This proves the split-rate bridge works:

- Native preview stays independent of Dart frame throughput.
- Card-box overlay can update from lightweight native detections.
- Existing Dart identity/card-present logic remains intact.

The identity-offline follow-up exposed an app configuration gap, not a detector regression. The native-camera debug install had been built without an identity endpoint, which produced `ScannerV3EmbeddingException(embedding_endpoint_not_configured)`. The scanner now supports a production-shaped base endpoint:

```text
SCANNER_V3_IDENTITY_BASE_ENDPOINT=http://127.0.0.1:8787
```

The batch resolve endpoint is derived as:

```text
http://127.0.0.1:8787/scanner-v3/resolve-crops
```

Final real-device identity-online evidence with the ME-sets local index:

```text
identity_started=59
locked=59
last_state=identity_locked
top_candidate=Darumaka me02 015 GV-PK-PFL-015
stream_fps avg=11.12 n=59
native_detection_fps avg=5.61 n=59
frame_bridge_fps avg=1.90 n=59
analysis_fps avg=1.88 n=59
live_loop_fps avg=1.88 n=59
```

The latest auto-test scene was not a valid empty/background gate run because a card-like object was visible in all phases. Use the report as frame-bridge and resolution evidence only, not as a no-card card-present acceptance result.

## Next Required Phase

Improve native-camera throughput without changing detector thresholds, OCR, retrieval, identity model, ML, Supabase, pricing, vault writes, or backend identity workers.
