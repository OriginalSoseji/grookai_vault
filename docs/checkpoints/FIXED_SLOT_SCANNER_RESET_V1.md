# FIXED_SLOT_SCANNER_RESET_V1

## Status

Status: ACTIVE

Severity: L3 invariant checkpoint

Scope: Scanner-only architecture reset toward `FIXED_SLOT_CAPTURE_SCANNER_V1`.

## Summary

The scanner is being reset because the previous phone-side architecture mixed too many authorities in one live loop.

The backend identity path is not the unstable layer. The unstable layer is the phone scanner path that let detector geometry, crop generation, tilt checks, readiness gates, live identity voting, and UI state all compete to decide when a card is real and which crop should identify it.

The new production direction is fixed-slot still capture.

## Why The Old Architecture Failed

The old scanner tried to infer the card, crop it, judge readiness, rank identity, lock a candidate, move UI boxes, and reveal a result while the phone and card were still moving.

That made every miss look like a threshold problem. Fixing one failure usually moved the problem somewhere else:

- full-art cards needed different visual evidence
- holo glare changed crop confidence
- moving boxes created jitter
- title-band crops were noisy
- card-present gates fought with identity gates
- final lock state sometimes depended on live preview timing

This produced repeated patching instead of a stable scanner model.

## Overlapping Authority Problem

The legacy loop mixed these authorities:

- detector authority
- crop authority
- tilt authority
- readiness authority
- live identity authority
- UI authority

The result was not one scanner decision. It was several independent decisions racing each other.

## Detector-Boundary Fragility

Dynamic detector boundaries are useful diagnostics, but they are fragile as production crop authority.

Observed failure modes:

- the detected box surrounded background plus card
- the box shifted while the card was still
- user tap selection did not fully freeze crop authority
- identity changed when the detector box changed
- the user had to chase the box instead of placing the card into a stable target

The detector must become advisory.

## Why ANN Backend Is Still Valid

The ANN identity backend remains foundational.

Current scanner work proved:

- compact full DB index can load and serve
- PAL coverage exists in the full index
- local warm latency is fast enough
- the backend can return correct candidates when the crop is good
- OCR is not required for identity authority

The reset keeps ANN identity and changes the phone-side crop authority.

## Why OCR Was Removed

OCR repeatedly failed as an identity authority path because card text is small, stylized, reflective, curved by camera perspective, and inconsistent across languages, finishes, and eras.

OCR may describe text-like regions for diagnostics only if a future contract allows it. It is not the scanner identity authority.

## New Production Direction

`FIXED_SLOT_CAPTURE_SCANNER_V1` is the production direction:

```text
fixed visible slot
-> advisory card-present and quality state
-> hidden slot-scoped ANN prewarm
-> user shutter
-> high-quality still-frame slot crop
-> final ANN identity
-> result reveal
```

The fixed guide slot owns crop authority.

## What Is Preserved

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
- native camera research that can support still capture

## What Is Deprecated

Deprecated for production final identity:

- dynamic detector-boundary identity
- tap-selected live identity
- live vote-state lock authority
- detector-owned final crop boxes
- threshold/gate patching as the path to correctness

These can remain for diagnostics and rollback until fixed-slot capture replaces them.

## What Is Now True

- The fixed slot is the intended canonical crop authority.
- Detector rectangles are advisory, not final crop boundaries.
- Still capture is the intended final identity frame.
- Live preview identity is prewarm only unless future work explicitly changes the contract.
- Wrong identification remains worse than no identification.

## Remaining Risks

- The fixed-slot still-capture path is not fully implemented yet.
- Existing legacy scanner code still compiles and remains reachable unless the fixed-slot feature flag is enabled.
- The final crop mapping from preview slot to still image must be proved on real devices.
- Multi-slot identity lanes need independent cache and result state.

## Next Likely Step

Implement one-card fixed-slot still capture end to end:

1. map fixed slot from preview to still frame
2. send still crop through existing ANN crop transport
3. reveal only after shutter
4. prove no-card, outside-slot, regular-card, and full-art-card behavior on device

## Related Artifacts

- `docs/contracts/FIXED_SLOT_CAPTURE_SCANNER_V1.md`
- `docs/contracts/SCANNER_FIXED_SLOT_CAPTURE_CONTRACT_V1.md`
- `docs/audits/scanner_authority_conflict_audit_v1.md`
- `lib/screens/scanner/fixed_slot_capture_screen.dart`
