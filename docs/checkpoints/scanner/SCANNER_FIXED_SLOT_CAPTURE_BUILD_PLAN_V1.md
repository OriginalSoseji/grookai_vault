# Scanner Fixed Slot Capture Build Plan V1

Date: 2026-05-14
Branch: `scanner-v4-card-present-gate`
Status: Active build checkpoint

## Purpose

This checkpoint turns `SCANNER_FIXED_SLOT_CAPTURE_CONTRACT_V1` into the active scanner build target before runtime changes continue.

The scanner direction is now fixed-slot capture:

```text
stable camera preview
-> visible one-card slot
-> slot-scoped card-present / quality checks
-> hidden background visual identity presearch
-> user taps capture/reveal
-> selected slot crop confirms identity
-> result is revealed
```

This replaces dynamic detector boxes as the production identity crop authority. Existing detector output may remain useful as advisory telemetry, but it must not move the production crop away from the slot.

## Starting Reality

- The scanner already has native camera and live identity plumbing.
- The scanner already has guided-slot UI plumbing.
- The scanner already has background identity and reveal concepts.
- The scanner identity service can identify cards quickly when the right visual crop reaches the ANN identity path.
- The dynamic moving-card box approach has caused repeated regressions on full-art, holo, blur, framing, and UX stability.

## Scope Lock

Allowed scanner-only surfaces:

- `lib/screens/scanner/`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- scanner docs, diagnostics, and local scanner verification artifacts

Forbidden in this build:

- detector threshold tuning as the fix
- OCR as identity authority
- Supabase schema changes or writes
- retrieval/model/ML authority changes
- pricing, vault, auth, feed, public web, or unrelated backend workers
- production behavior that shows identity before capture/reveal

## One-Card Prototype Target

Build one-card fixed-slot mode first.

Required behavior:

- The one-card guide is stable and does not chase detector geometry.
- The guide defines the identity crop.
- The live loop can presearch from the one-card slot while hiding suggestions.
- Capture/reveal uses the most recent valid slot identity result when it is still scoped to the current slot.
- No-card and card-outside-slot states do not reveal an identity.
- A clean card in the slot can identify in under 2 seconds on real device evidence.

Out of scope for the first runtime slice:

- two-card mode
- four-card mode
- production visual polish
- native camera replacement
- large backend identity architecture changes

## Reuse Rules

Reuse only the parts of the current scanner that support fixed-slot capture:

- camera preview
- guided slot overlay
- ANN identity service calls
- card-present and quality diagnostics
- reveal button / result tile
- haptic or shutter feedback if already available

Do not reuse dynamic card boxes as production crop authority.

## Runtime Build Order

1. Audit existing guided-slot and reveal code paths.
2. Identify the smallest scanner-only switch that makes one-card slot geometry the identity target.
3. Keep detector boxes advisory or hidden from production authority.
4. Ensure background identity remains hidden until reveal.
5. Preserve existing fast visual identity path and ANN service wiring.
6. Add targeted tests if a pure Dart behavior unit is touched.
7. Run scanner-only analyzer and diff checks.
8. Test on the phone only after the runtime slice builds cleanly.

## Verification Gate

Minimum local checks:

```text
git diff --check
flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub
```

If backend scanner identity scripts are touched, run the relevant `node --check` commands.

Real-device proof required before calling this phase successful:

- one known regular card in the one-card slot identifies under 2 seconds
- one known full-art or holo card in the one-card slot identifies under 2 seconds
- card outside the slot does not reveal a final identity
- no card does not reveal a final identity
- reveal result is hidden until capture/reveal
- saved evidence names the slot mode, slot crop source, identity candidate, elapsed time, and lock reason

## Stop Rules

Stop and report before proceeding if:

- the fix requires detector threshold tuning
- dynamic detector boxes need to become crop authority again
- OCR is proposed as the identity path
- the slot crop cannot map cleanly into the frame sent to identity
- clean slot identity cannot approach the under-2-second contract
- runtime work drifts outside scanner surfaces

## Next Checkpoint

Create the next checkpoint only after one-card fixed-slot capture identifies real cards from the phone with stable UX and under-2-second evidence.
