# SCANNER_CAMERA_REBUILD_BLUEPRINT_V1

## Status

Planning only. This branch must not contain scanner implementation code.

## Authority

The rebuild is governed by:

```text
docs/contracts/SCANNER_CAMERA_SYSTEM_V1.md
```

`SCANNER_CAMERA_SYSTEM_V1` is the source of truth for capture quality, image output, telemetry, readiness gating, and backend interface requirements.

## Branch Rule

This blueprint branch explicitly forbids:

- Flutter scanner implementation changes.
- Native iOS scanner implementation changes.
- Camera plugin replacement work.
- AVFoundation source files.
- Platform channel code.
- Backend, schema, resolver, worker, pricing, vault, or public web changes.
- Recovery of deleted branch code.

The purpose of this branch is to define the rebuild sequence only.

## Rebuild Principles

- Build from the contract, not from the compromised branch.
- Each phase must have one objective and one proof.
- No phase may depend on unverified tooling state.
- Real-device validation is required before calling camera work complete.
- Simulator validation may support UI flow checks, but it cannot prove real camera quality.
- Production scanner behavior must not accept bad capture input.

## Phase 0: Native Camera Proof Only

Goal:

- Prove a minimal native iOS camera surface can be launched from the Flutter app.

Allowed scope:

- Native preview only.
- Minimal bridge proof only.
- No identity scan submission.
- No quality engine.
- No gating.
- No blur, glare, border, or readiness logic.

Required proof:

- Real iPhone opens native camera preview.
- Preview is visible and stable.
- Flutter can navigate to and from the proof surface.

Exit criteria:

- The proof is validated on a physical iPhone.
- No production scanner path is changed.

## Phase 1: Full-Resolution Capture

Goal:

- Capture original full-resolution JPEG still images using the native camera path.

Allowed scope:

- Full-resolution still capture.
- Temporary file output.
- Return image path and basic dimensions to Flutter.

Required proof:

- Captured image file exists.
- Width and height are nonzero.
- File size is nonzero.
- Shortest image edge meets the minimum in `SCANNER_CAMERA_SYSTEM_V1`.
- Captured file is renderable in Flutter.

Exit criteria:

- Real iPhone capture proof passes.
- Still image is not a preview frame, thumbnail, or downscaled output.

## Phase 2: Focus And Exposure Stabilization

Goal:

- Add camera control required for stable, identity-safe capture.

Allowed scope:

- Continuous autofocus.
- Continuous auto exposure.
- Region of interest behavior.
- Tap-to-focus override.
- Stabilization timing.

Required proof:

- Focus state can be observed.
- Exposure state can be observed.
- Capture can wait for stabilization windows.

Exit criteria:

- Focus and exposure stabilization are measurable on a real iPhone.
- Capture timing is deterministic enough to support future gates.

## Phase 3: Quality Telemetry

Goal:

- Record the required quality metrics from `SCANNER_CAMERA_SYSTEM_V1`.

Required metrics:

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

Required proof:

- Metrics are visible in debug validation output.
- Metrics are attached to scan attempts.
- Metrics distinguish blocked, captured, uploaded, and failed states.

Exit criteria:

- Every real-device capture attempt can be explained by telemetry.

## Phase 4: Readiness Gating

Goal:

- Prevent capture unless all quality gates pass.

Readiness states:

```text
SEARCHING
ALIGN_CARD
FOCUSING
ADJUST_LIGHTING
HOLD_STEADY
READY
```

Allowed scope:

- Real-time quality analysis.
- Deterministic readiness state transitions.
- Capture button disabled outside `READY`.
- Actionable blocking feedback.

Required proof:

- Bad framing blocks capture.
- Blur blocks capture.
- Bad lighting blocks capture.
- Motion blocks capture.
- Valid card capture reaches `READY`.

Exit criteria:

- The system does not upload known-bad images.
- Capture cannot be forced through the UI when gates fail.

## Phase 5: Identity Pipeline Integration

Goal:

- Connect accepted high-quality captured images to the existing identity scan upload and polling path.

Allowed scope:

- Use existing scanner service path.
- Upload original full-resolution JPEG.
- Pass required quality metrics.
- Poll existing backend result handling.

Forbidden scope:

- Backend scanner worker changes.
- Resolver changes.
- Schema changes.
- Ranking changes.
- Result UI redesign.

Required proof:

- A gated capture starts a real identity scan.
- Backend polling reaches candidates.
- Confirm button behavior remains governed by existing result handling.
- No mocked backend result is used.

Exit criteria:

- Identity flow works with real captures on physical iPhone.

## Phase 6: Real-Device Validation Matrix

Goal:

- Prove scanner behavior across real conditions before release.

Minimum matrix:

- iPhone 17 Pro.
- Older supported iPhone if available.
- Normal indoor lighting.
- Low indoor lighting.
- Bright directional glare.
- Matte card.
- Holo or reflective card.
- White border card.
- Dark border card.
- Near-mint flat card.
- Slightly curved card.

Required proof:

- Capture pass/fail state is explainable.
- Accepted captures are sharp and full resolution.
- Rejected captures are rejected for the right reason.
- Identity errors caused by capture quality are near zero.

Exit criteria:

- Real-device validation satisfies the production readiness criteria in `SCANNER_CAMERA_SYSTEM_V1`.

## Release Gate

The rebuild is not releasable until:

- Contract requirements are met.
- Real-device validation passes.
- Telemetry explains capture quality.
- Existing scanner backend flow remains intact.
- No compromised branch code has been reintroduced.

## Next Action

Open a separate implementation branch for Phase 0 only after this blueprint is reviewed.
