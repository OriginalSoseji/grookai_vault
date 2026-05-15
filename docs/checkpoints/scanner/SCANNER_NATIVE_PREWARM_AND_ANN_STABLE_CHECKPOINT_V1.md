# Scanner Native Prewarm And ANN Stable Checkpoint

Date: 2026-05-14
Branch: `scanner-v4-card-present-gate`

## Purpose

This checkpoint freezes the first stable native-camera scanner baseline that is worth preserving before live rollout.

The active scanner path is now:

```text
app shell scanner prewarm
-> Android CameraX native analysis warmup
-> cached frame handoff into scanner screen
-> native condition camera preview
-> Flutter scanner guide and controls overlay
-> fixed-slot card capture
-> Scanner V3/V4 live loop
-> batch resolve-crops request
-> compact ANN identity service
-> guarded identity reveal
```

No production rollout, detector threshold retune, OCR authority change, Supabase schema change, pricing path, vault path, auth path, public web path, or unrelated backend worker change is part of this checkpoint.

## Current Architecture

- Android scanner can use a native CameraX preview and analysis surface behind `SCANNER_NATIVE_CONDITION_CAMERA_ANDROID`.
- Scanner prewarm is scanner-owned. The app shell only triggers the scanner bridge before opening the scanner.
- Native prewarm keeps the CameraX analysis path hot and exposes one cached YUV frame plus native card detection for immediate scanner use.
- The scanner screen consumes the cached prewarm frame before waiting for the first live analysis callback.
- The CameraX preview uses `PreviewView.ImplementationMode.COMPATIBLE` so the Flutter guide, shutter, slot selector, flash, status, and close controls remain visible above the camera.
- Scanner identity uses the `/scanner-v3/resolve-crops` contract.
- The local candidate backend is the compact ANN scanner identity service with full Supabase-built Pokemon coverage.
- OCR is disabled as scanner identity authority by contract.

## What Is Proven

- The native CameraX overlay regression is fixed. The camera no longer covers the Flutter scanner guide and controls.
- The native scanner prewarm path can deliver a cached frame into the scanner screen on tap.
- The prewarm-focused run measured:
  - scan tap at `16:42:44.443`
  - cached warmed frame consumed at `16:42:44.848`
  - first scanner frame debug at `16:42:45.071`
- The local ANN scanner service health reports:
  - `reference_count=24715`
  - `reference_view_count=173005`
  - `pal_sv02_count=295`
  - `max_candidate_vectors=10000`
- Spiritomb PAL `089/193` resolves as canonical Grookai ID `GV-PK-PAL-89` in the local backend and real-device scanner path.
- The scanner guide, shutter, close button, slot selector, flash control, and bottom status are visible together over the live camera preview.
- The debug app can be installed with:
  - `SCANNER_V3_IDENTITY_BASE_ENDPOINT=http://127.0.0.1:18790`
  - `SCANNER_NATIVE_CONDITION_CAMERA_ANDROID=true`
- ADB reverse for the local test path is:
  - `tcp:18790 -> tcp:8789`

## Evidence

Local evidence is intentionally kept under `.tmp/` and is not part of the committed checkpoint:

- `.tmp/scanner_overlay_restored_screen_20260514.png`
- `.tmp/scanner_identity_timing_probe_prewarm_detect_focused_20260514_164311.log`
- `.tmp/scanner_identity_timing_probe_cleaned_service_20260514_135044.log`

The prewarm timing run did not lock identity because the physical card was outside the fixed slot. That run proves the mechanical prewarm handoff, not final identity correctness.

The cleaned-service run proves the real-device identity path for Spiritomb PAL after backend cleanup.

## Verification

Verification for this checkpoint:

```text
git diff --check
flutter analyze lib\main.dart lib\main_shell.dart lib\services\scanner lib\screens\scanner lib\services\scanner_v3 lib\services\scanner_v4 --no-pub
flutter test test\scanner\candidate_vote_state_v1_test.dart
node --check backend\identity_v3\build_scanner_v3_ann_index_v1.mjs
node --check backend\identity_v3\lib\embedding_index_v1.mjs
node --check backend\identity_v3\run_scanner_v3_ann_identity_service_v1.mjs
node --check backend\identity_v3\run_scanner_v3_identity_latency_harness_v1.mjs
```

Recent real-device build/install verification used the local ANN endpoint and native camera flag.

## Boundaries

- This is a local/device scanner checkpoint, not a production live rollout.
- Production still must be tested against `https://scanner-identity.grookaivault.com` with no ADB reverse before live release.
- The production service must keep side-by-side artifact staging and rollback.
- Do not weaken fixed-slot capture gates to make the prewarm timing look better.
- Do not reintroduce OCR as final identity authority.
- Do not replace the compact ANN identity path with full brute-force JSON search.
- Do not modify Supabase schema or write scanner identity artifacts back to Supabase.
- Do not mix unrelated app, vault, pricing, auth, public web, or backend worker changes into this scanner baseline.

## Next Work

- Promote the compact ANN scanner identity artifact through the safe side-by-side droplet rollout path.
- Build and install a production-endpoint scanner app with no ADB reverse.
- Verify production health reports the expected full ANN counts and PAL coverage.
- Verify cold start to identity remains under two seconds on the phone.
- Keep this checkpoint as the rollback point for scanner UI, native camera, prewarm, and local ANN identity behavior.
