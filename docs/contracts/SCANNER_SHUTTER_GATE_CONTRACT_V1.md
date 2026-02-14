# SCANNER_SHUTTER_GATE_CONTRACT_V1

Status: Active  
Lane: Scanner / Condition  
Version: V1  
Date: 2026-02-14

## Purpose

Prevent readiness divergence where UI shows `Ready` but shutter is disabled.

## Binding Rules

1. UI readiness source is `(_overlayMode == OverlayMode.ready)`.
2. Shutter enable gate is derived only from:
   - `(_overlayMode == OverlayMode.ready && !_takingPicture)`
3. The implementation must expose a derived getter:
   - `bool get _canShoot => !_takingPicture && _overlayMode == OverlayMode.ready;`
4. `_canShoot` is required for both:
   - shutter `onTap` enablement
   - shutter visual enabled/disabled state

## Forbidden

1. Any independent readiness boolean that can drift from `OverlayMode` (example: `_shutterReady`).
2. Any second gate for shutter enablement outside the `_canShoot` derivation.

## Required Debug Invariant

The shutter render path must assert:

```dart
assert(
  _overlayMode != OverlayMode.ready || (_canShoot || _takingPicture),
  'Invariant violated: overlayMode=ready but shutter cannot shoot. Do not reintroduce split readiness.',
);
```

## Evolution Rule

If additional readiness nuance is needed, evolve `OverlayMode` and derive `_canShoot` from it.  
Do not add a second readiness boolean.
