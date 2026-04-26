# SCANNER_CAMERA_SYSTEM_V1

## Status

Contract only. This document defines required behavior, requirements, and interfaces for a production-grade scanner camera system. It does not prescribe implementation code.

## Core Principle

The scanner camera system MUST NOT allow capture unless the image is suitable for card identity resolution.

Bad input must be blocked upstream. Identity scan requests must only receive high-quality, identity-safe image input.

## Capture Quality Contract

A capture is VALID only if all conditions below are met.

### 1. Resolution

- Minimum: 1920px shortest edge.
- Preferred: device native maximum still image resolution.
- Capture MUST NOT use 720p still images.
- Preview resolution MAY differ from still capture resolution, but still capture MUST satisfy this contract.

### 2. Card Region Size

- Card must occupy at least 70% of the frame area.
- Card edges must be fully visible.
- Capture MUST be rejected if the card is clipped by the frame.
- Capture MUST be rejected if the card is too small for reliable identity resolution.

### 3. Focus

- Autofocus must be locked or stable on the card region before capture.
- Capture is allowed only after a focus stabilization window of at least 300ms.
- The focus region of interest must be the detected card region when available.
- Tap-to-focus MAY override the focus point, but the final focus state must still satisfy the gate.

### 4. Exposure

- Exposure must be stable before capture.
- Capture MUST reject overexposed highlights that obscure identity-critical regions.
- Capture MUST reject underexposed shadows that obscure identity-critical regions.
- Brightness must fall within defined histogram bounds.
- Exposure region of interest must prioritize the detected card region when available.

### 5. Blur And Sharpness

- System must compute a blur or sharpness score using Laplacian variance or an equivalent measurable method.
- Capture is valid only when:

```text
blur_score >= threshold
```

- Threshold must be calibrated against real trading card captures.
- Capture MUST reject blurry images.

### 6. Glare And Reflection

- System must detect high-intensity specular regions.
- Capture MUST reject glare that overlaps card text, number, set, artwork, title, or other identity-critical regions.
- Minor glare MAY be tolerated only when it does not affect identity-critical regions.

### 7. Motion Stability

- Device must be stable for at least 200ms before capture.
- Stability must be based on accelerometer and gyroscope smoothing.
- Capture MUST reject active shake, fast movement, and unstable framing.

### 8. Border Detection

- Card quadrilateral must be detected.
- Border confidence must meet a defined threshold.
- Capture MUST NOT rely on tilt alone.
- Capture MUST reject cases where the detected quadrilateral is ambiguous, partial, or inconsistent with a trading card shape.

## Capture Flow

```text
Camera Preview
-> Real-time analysis
   - focus
   - exposure
   - blur
   - glare
   - border
   - motion
-> Readiness State Engine
-> Capture Enabled ONLY when all gates pass
-> takePicture()
-> Validate captured still with the same quality gates
-> Upload original full-resolution image
```

## Readiness State Engine

The readiness state engine MUST be deterministic and explainable.

### States

```text
SEARCHING
ALIGN_CARD
FOCUSING
ADJUST_LIGHTING
HOLD_STEADY
READY
```

### Rules

- `READY` requires all quality gates to pass.
- UI must display the current blocking condition.
- State transitions must be derived from measured inputs, not decorative UI assumptions.
- If multiple gates fail, the system SHOULD surface the most actionable blocker first.
- Capture MUST remain disabled in every state except `READY`.

### State Meaning

`SEARCHING`

- No reliable card region is detected.

`ALIGN_CARD`

- A card-like region exists, but card size, borders, crop, or framing are invalid.

`FOCUSING`

- Card region is valid, but focus has not stabilized.

`ADJUST_LIGHTING`

- Focus and framing are acceptable, but exposure, brightness, or glare gates fail.

`HOLD_STEADY`

- Image quality is otherwise acceptable, but motion stability fails.

`READY`

- All quality gates pass and capture is enabled.

## Overlay Contract

- Overlay must reflect the actual capture region.
- Detected quadrilateral must map to real image pixels.
- Overlay MUST NOT be decorative-only.
- Overlay guidance must correspond to measurable state engine blockers.
- Preview framing and captured still framing must be reconciled so the user is not misled.
- If preview aspect ratio differs from captured still aspect ratio, the UI must make the effective capture region explicit.

## Camera Control Contract For iOS

The iOS scanner camera system MUST use AVFoundation or an equivalent native camera stack capable of satisfying this contract.

Required behavior:

- Use `AVCaptureSessionPresetPhoto` or highest available still-photo preset.
- Use the back camera by default.
- Use continuous autofocus with region of interest.
- Use continuous auto exposure with region of interest.
- Support tap-to-focus override.
- Support manual zoom control.
- Lock orientation during capture.
- Enable HDR when available and when it improves identity-safe output.
- Capture full-resolution still images through the photo output pipeline.
- Preview must be smooth enough to support real-time guidance.

## Image Output Contract

- Format: JPEG.
- No lossy recompression after capture.
- Preserve EXIF orientation.
- Preserve full resolution.
- No resizing before upload.
- Upload must use the original captured still bytes unless an explicit future contract allows transformation.
- If image bytes are transformed in any way, the transform must be recorded and must not reduce identity reliability.

## Telemetry Contract

Every scan attempt MUST record the following metrics:

```text
image_width
image_height
file_size_bytes
blur_score
brightness_score
glare_score
border_confidence
focus_mode
exposure_mode
zoom_level
capture_latency_ms
```

Telemetry SHOULD also record:

```text
orientation
device_model
camera_position
focus_stability_ms
exposure_stability_ms
motion_stability_ms
capture_rejection_reason
upload_byte_size
```

Telemetry must distinguish:

- blocked before capture
- captured still rejected
- uploaded
- backend scan started
- backend scan completed
- backend scan failed

## Failure Contract

If capture fails quality:

- DO NOT upload.
- DO NOT trigger identity scan.
- DO NOT write vault records.
- DO NOT ask identity services to resolve the card.
- Provide actionable UI feedback.

Failure states must be visible and explainable to the user.

Examples:

```text
Move closer
Fit the whole card in frame
Hold steady
Reduce glare
Improve lighting
Tap card to focus
```

## Backend Interface

Scanner upload input must be a high-resolution JPEG plus quality metrics.

Required shape:

```json
{
  "image": "high_resolution_jpeg",
  "quality_metrics": {
    "blur_score": 0,
    "brightness_score": 0,
    "border_confidence": 0
  }
}
```

Additional metrics MAY be included:

```json
{
  "quality_metrics": {
    "glare_score": 0,
    "focus_mode": "continuous_auto_focus",
    "exposure_mode": "continuous_auto_exposure",
    "zoom_level": 1,
    "capture_latency_ms": 0,
    "image_width": 0,
    "image_height": 0,
    "file_size_bytes": 0
  }
}
```

The backend scanner pipeline must receive original full-resolution image bytes, not a preview frame, thumbnail, recompressed image, or downscaled image.

## Identity Safety Requirements

- Bad capture quality must be treated as an upstream blocker, not a backend ranking problem.
- Identity scan candidates must not be requested from known-bad image input.
- User confirmation UI must not compensate for preventable capture ambiguity.
- Scanner quality gates must reduce wrong-card identity results caused by blur, glare, poor framing, or low resolution.

## Production Readiness Criteria

System is considered production-ready only when:

- At least 95% of scans succeed on first capture under normal lighting.
- Incorrect identity due to capture quality is near zero.
- User never has to guess whether the image is good.
- Capture blocking states are actionable.
- Captured still images are visibly sharper than preview frames.
- Telemetry can explain every rejected capture.
- Telemetry can prove every accepted capture met the contract.

## Non-Goals For This Contract

This contract does not define:

- backend identity ranking changes
- resolver changes
- schema migrations
- pricing changes
- vault write behavior
- public web behavior
- scanner result UI ranking

## Contract Boundary

The scanner camera system owns:

- camera session quality
- preview/capture alignment
- capture gating
- still-image quality validation
- image output integrity
- quality telemetry

The existing scanner pipeline owns:

- upload transport
- identity scan event creation
- backend polling
- candidate result handling
- user confirmation flow

## Acceptance Statement

No scanner implementation should be treated as production-grade unless it satisfies `SCANNER_CAMERA_SYSTEM_V1`.

Any implementation that allows blurry, low-resolution, poorly framed, glare-obscured, unstable, or unverifiable image input to trigger identity resolution is non-compliant.
