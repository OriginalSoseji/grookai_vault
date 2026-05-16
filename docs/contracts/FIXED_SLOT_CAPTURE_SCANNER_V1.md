# FIXED_SLOT_CAPTURE_SCANNER_V1

## Status

Status: ACTIVE

Type: Scanner architecture contract

Scope: Production scanner authority model, fixed-slot capture foundation, and deprecation boundary for legacy live-boundary scanner behavior.

## Purpose

This contract resets scanner architecture toward a simpler production model:

```text
fixed guide slot
-> hidden visual prewarm
-> user capture
-> still-frame slot crop
-> ANN identity candidates
-> UI result confirmation
```

The scanner must stop treating dynamic detector rectangles as production identity crop authority.

## Goals

- Make the fixed guide slot the canonical crop authority.
- Make still capture the authoritative identity frame.
- Keep ANN identity, full DB index coverage, crop transport, telemetry, and latency tooling intact.
- Remove user-visible dynamic boundary jitter from the production path.
- Keep background identity prewarm hidden until capture.
- Fail closed when the selected slot is empty, clipped, blurry, or ambiguous.

## Non-Goals

- No Supabase schema changes.
- No OCR authority.
- No detector threshold tuning as the fix.
- No new ML model.
- No ANN ranking redesign.
- No production endpoint change.
- No vault, marketplace, pricing, auth, or feed change.

## Authority Order

1. Fixed guide slot defines crop authority.
2. Still capture defines the identity frame.
3. Detector output is advisory only.
4. ANN identity ranks canonical candidates.
5. UI reveals and confirms the result.

This authority order is invariant for `FIXED_SLOT_CAPTURE_SCANNER_V1`.

## Authority Boundaries

### Fixed Slot Authority

The fixed slot owns:

- visible alignment target
- crop rectangle for prewarm
- crop rectangle for final still identity
- selected lane in two-card and four-card modes
- slot-scoped identity cache

### Still Capture Authority

The still image owns final identity input.

The preview stream may prewarm candidates, but final identity must use the selected slot crop from the highest-quality still frame available in the current camera stack.

### Detector Authority

Detector output is advisory only.

Allowed detector roles:

- card likely present
- card missing
- card clipped by slot
- rotation advisory
- blur, glare, low-light, or edge-confidence advisory if available
- diagnostics and telemetry

Forbidden detector roles:

- final crop boundary authority
- live identity authority
- final lock authority
- moving the production crop away from the selected slot
- drawing production boxes that users must chase

### ANN Identity Authority

ANN identity ranks canonical visual candidates from Grookai-generated reference artifacts. It remains the identity backend path.

ANN does not own camera geometry. It receives crops from the selected slot.

### UI Authority

The UI reveals the result after capture and lets the user accept, retry, or continue. The UI must not present hidden prewarm candidates as final identity before capture.

## OCR Rule

OCR is not identity authority.

`SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1` remains binding. OCR must not be reintroduced as the way to solve scanner identity.

## Prewarm Rule

Background identity prewarm is allowed only when scoped to the selected fixed slot.

Prewarm may:

- warm the scanner identity endpoint
- cache likely candidates per slot
- reduce reveal latency
- provide non-visible readiness state

Prewarm may not:

- show a final suggestion before capture
- override final still-capture identity
- mix evidence between slots
- use detector-selected crops as canonical production input

## Multi-Card Rule

Two-card and four-card support must use fixed slots only.

Each slot is an independent identity lane:

- independent crop
- independent card-present advisory
- independent prewarm cache
- independent final still-capture crop

Detector rectangles are not canonical crop boundaries in multi-card mode.

## UX Rules

- Show stable fixed slots.
- Show one-card, two-card, and four-card modes.
- Show selected-slot state.
- Keep detector/debug data out of production UI.
- Provide haptic or shutter feedback on capture when platform support exists.
- Show a thumbnail/result only after capture/reveal.
- Avoid indefinite reading states; fail closed with actionable status.
- Do not show identity guesses before capture.

## Performance Targets

- Warm ANN backend response target: under 200 ms local service proof.
- User-visible capture-to-result target: under 2 seconds.
- Cold scanner entry should prewarm identity without blocking preview.
- Still capture must preserve enough detail for set/number inspection.

## Failure Behavior

The scanner must show no final identity when:

- no card is in the selected slot
- card is outside the slot
- card is clipped by the slot
- still frame is blurry or too low-quality
- ANN candidates are ambiguous
- identity endpoint is offline
- slot cache is stale or from another slot

Wrong identification is worse than no identification.

## Legacy Boundary

The following are legacy, experimental, and non-production for final identity:

- dynamic detector-boundary identity
- tap-selected live identity
- live vote-state lock authority
- detector-owned final crop boxes
- threshold patching as the route to correctness

These systems may remain for diagnostics and rollback while fixed-slot capture is built, but they must not be expanded as the production direction.

## Rollback Rules

Rollback means returning to the last compile-safe scanner route without altering scanner backend infrastructure.

Do not roll back by:

- reintroducing OCR authority
- changing ANN index coverage
- tuning detector thresholds as the main fix
- changing Supabase schema
- changing production endpoints

Rollback may:

- disable fixed-slot scanner with a feature flag
- keep legacy scanner available as a temporary route
- preserve all ANN service and artifact tooling

## Preserved Systems

- ANN identity service
- full DB scanner index builder
- embedding index format
- latency harness
- no-OCR contract
- scanner identity endpoint
- crop transport
- reference view generation
- scanner telemetry
- droplet identity service

## Related Artifacts

- `docs/contracts/SCANNER_FIXED_SLOT_CAPTURE_CONTRACT_V1.md`
- `docs/contracts/SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1.md`
- `docs/contracts/SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1.md`
- `docs/contracts/SCANNER_NATIVE_CAMERA_SURFACE_CONTRACT_V1.md`
- `docs/contracts/SCANNER_CAMERA_SYSTEM_V1.md`
- `docs/checkpoints/FIXED_SLOT_SCANNER_RESET_V1.md`
- `docs/audits/scanner_authority_conflict_audit_v1.md`
