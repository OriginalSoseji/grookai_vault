# Scanner Authority Conflict Audit V1

## Summary

The current scanner drifted because too many systems were allowed to influence final identity at the same time.

The backend ANN identity system is fast enough and remains useful. The phone-side scanner became unstable because detector boxes, crop construction, motion/tilt readiness, live vote state, reveal timing, and UI overlays all acted like partial authorities.

## Scope

Scanner-only audit of the current architecture around:

- `lib/screens/scanner/condition_camera_screen.dart`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- scanner identity backend contract boundaries

This audit does not authorize changes to Supabase schema, OCR authority, pricing, vault, marketplace, ingestion, or unrelated backend workers.

## Current State

`ConditionCameraScreen` currently owns too many responsibilities:

- camera surface selection
- native camera lifecycle
- fallback Flutter camera lifecycle
- detector callbacks
- overlay geometry
- tap-selected card tracking
- autofocus and exposure behavior
- card-present status
- scanner V3 live loop startup
- hidden identity prewarm
- shutter reveal state
- memory of scanned cards
- diagnostics and ADB auto-test hooks

That made the screen a scanner R&D container rather than a stable production scanner foundation.

## Overlay Authority Conflicts

The overlay presents guide slots, detector rectangles, selected-card state, readiness color, and result state.

Conflict:

- users see stable guide slots
- detector output can still influence visible boundaries
- selected-card state can persist after detector movement
- identity state can change while UI appears locked

Production direction:

- fixed slots are visible authority
- detector rectangles are hidden or diagnostic
- result appears only after capture/reveal

## Detector vs UI Authority Conflicts

The detector was useful for card-present evidence, but it became too close to identity authority.

Conflict:

- detector says where the card is
- UI lets the user tap/select a card
- live loop consumes moving crop geometry
- vote state may accumulate evidence from changing boundaries

This creates jitter and false certainty.

Production direction:

- detector advises whether the selected fixed slot likely contains a card
- detector never moves the production identity crop
- UI selection chooses a slot, not a detector rectangle

## Readiness Conflicts

Readiness mixed:

- card present
- card centered
- card still enough
- tilt low enough
- identity work started
- identity candidate available
- reveal requested

Conflict:

- `Ready` can become a visual state, a detector state, or an identity state depending on timing
- rejecting a frame can block identity even when the slot crop is good
- accepting a frame can surface identity from a weak live crop

Production direction:

- readiness is advisory quality state
- capture is user controlled
- final identity uses still-frame slot crop
- no final ID is shown when quality fails

## Crop Authority Conflicts

The largest conflict is crop authority.

Legacy live scanner paths could derive identity crops from:

- dynamic detector quadrilateral
- selected detector track
- guided slot
- full preview
- title/artwork/core derived crops
- remembered live-loop candidate state

When identity is wrong, it is unclear whether the failure came from the backend, the crop, the detector, the selected track, or the vote gate.

Production direction:

- one selected fixed slot produces the crop
- still-frame slot crop is final identity input
- crop generation is deterministic and slot-scoped

## Live-Loop Instability

The live loop tried to make final decisions from a moving preview stream.

Conflict:

- preview frames can be low resolution
- motion blur changes candidate ranking
- detector boxes move between frames
- votes accumulate while the crop authority shifts
- final reveal can depend on timing rather than a single captured frame

Production direction:

- live loop may prewarm candidates only
- live loop is not final lock authority
- shutter capture creates the identity frame

## Why Threshold Patching Became Endless

Threshold patching kept happening because each patch treated one symptom:

- distance guard too strict
- distance guard too loose
- title-band noisy
- full-art support missing
- detector too jittery
- card-present gate too hard
- reveal gate too soft

The deeper issue was authority conflict. Without a single crop authority and a single final identity frame, every threshold carried too much responsibility.

## What Belongs In ConditionCameraScreen

Until decommission, this screen may keep:

- legacy scanner route
- camera preview fallback
- diagnostic capture
- ADB auto-test plumbing
- scanner telemetry hooks
- historical R&D behavior for comparison

It should not gain new production identity authority.

## What Should Move To Fixed Slot Scanner

The fixed-slot scanner should own:

- slot geometry
- selected slot state
- capture button
- advisory slot quality
- slot-scoped prewarm state
- still-capture crop mapping
- final reveal state

## Reusable Services

Keep and reuse:

- native camera bridge where it supports still capture
- scanner identity crop transport
- ANN identity client/service
- scanner telemetry
- diagnostic artifact export
- haptic/shutter feedback utilities if factored later

## Findings

1. Dynamic detector boxes are not production-safe crop authority.
2. Live vote-state lock authority is too sensitive to preview timing.
3. Tap-selected live identity does not fully remove crop drift.
4. Readiness and identity state are currently coupled too tightly.
5. ANN backend speed is not the main blocker.
6. The next stable scanner should be simpler, not smarter.

## Recommended Next Step

Build one-card fixed-slot still capture end to end, using existing ANN identity infrastructure and treating detector output as advisory quality telemetry only.
