# SCANNER_FIXED_SLOT_CAPTURE_CONTRACT_V1

## Status

Active.

This contract defines the next production scanner architecture after the dynamic-boundary live scanner work proved too fragile for reliable product behavior.

This contract is scanner-only. It does not authorize changes to OCR authority, detector thresholds, ML models, Supabase schema, pricing, vault writes, public web behavior, or unrelated backend workers.

## Decision

Grookai scanner identity must pivot from dynamic card-boundary selection to fixed slot capture.

The production scanner target is:

```text
native-like camera preview
-> fixed card slot guide selected by mode
-> card present / quality / motion advisory checks
-> background visual identity presearch from slot crops
-> user taps capture
-> high-quality still frame crop from the same slot geometry
-> final visual identity confirmation
-> visible result reveal
```

Dynamic detector boxes are no longer the production crop authority.

## Core Principle

The scanner should remove guesswork from the camera system.

If the product can tell the user where to place the card, the scanner should use that known slot as the identity crop authority instead of trying to infer a new card boundary on every moving frame.

## Scope

Allowed scanner surfaces:

- `lib/screens/scanner/`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- scanner-specific backend identity service plumbing under `backend/identity_v3/`
- scanner diagnostics, parser, audit, runbook, and contract docs

Forbidden by this contract:

- detector threshold tuning as the primary path to correctness
- OCR as identity authority
- retrieval/model/ML authority changes
- Supabase schema changes
- Supabase writes
- pricing, vault, auth, feed, public web, or marketplace changes
- backend identity worker changes unrelated to scanner identity service serving

## Relationship To Existing Contracts

This contract narrows the scanner direction.

- `SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1` remains binding.
- `SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1` remains binding for canonical ANN index coverage and rollout safety.
- `SCANNER_NATIVE_CAMERA_SURFACE_CONTRACT_V1` remains binding for native camera integration.
- `SCANNER_CAMERA_SYSTEM_V1` remains binding for still-capture quality.
- `SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1` remains binding for the under-2-second target, but future proof should measure the fixed-slot path.
- `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1` remains useful for measured state feedback, but this contract supersedes any interpretation that requires dynamic live detector boxes to be the production identity crop authority.

If an older scanner document implies that the dynamic card box must be the production crop source, this contract wins.

## Slot Modes

The scanner must support explicit slot modes:

- one card
- two cards
- four cards

Each mode defines deterministic slot rectangles in preview space and capture/still space.

The user places cards inside the visible slots. The slot geometry is the intended identity crop source.

## Slot Geometry Authority

The fixed slot guide owns:

- the expected crop rectangle
- the visible user alignment target
- the crop used for live presearch
- the crop used for still-frame final identity
- the per-card identity lane in multi-card mode

The scanner must not silently replace a slot crop with an unrelated detector-selected crop.

If a detector-derived crop is used experimentally, it must be labeled diagnostic or fallback and must not become production authority without a new contract.

## Detector Role

The detector becomes advisory.

Allowed detector responsibilities:

- card likely present
- card missing from slot
- card clipped by slot
- card too small or too large
- card rotated too far
- glare/blur/low-light advisory if available
- optional edge confidence telemetry

Forbidden detector responsibilities:

- final identity crop authority
- moving the production crop box away from the selected slot
- causing user-visible card selection jitter
- forcing users to chase a dynamic box
- becoming the reason identity works only under perfect framing

## Live Preview Role

The live preview must feel like a camera, not like a debugging tool.

Required:

- smooth native-like preview
- fixed slots visible and stable
- clear selected slot in multi-card mode
- no jittering identity box
- no debug text by default
- no visible identity suggestion before reveal

The preview can start background identity work, but it must not expose the result until the capture/reveal moment unless a future contract explicitly changes this.

## Background Identity Presearch

The scanner may begin visual identity work while a card is in a fixed slot.

Purpose:

- warm candidate search
- cache likely ANN candidates
- reduce perceived post-capture latency
- keep final reveal fast

Rules:

- presearch input must come from the selected slot crop
- presearch must remain visual/canonical-reference driven
- presearch must not show a final suggestion to the user
- presearch cache must be scoped per slot
- presearch cache must reset when the slot loses the card or the user changes selected slot
- presearch may not override final still-capture identity if the still disagrees

## Capture / Reveal Contract

User-visible identity is revealed at capture.

Capture means:

```text
user taps scanner shutter/reveal
-> haptic/sound feedback may fire
-> high-quality still capture is taken when possible
-> selected slot crop is extracted
-> identity uses cached presearch when valid
-> final still-frame identity confirms or replaces the cache
-> result card appears
```

If identity has already locked from valid slot presearch, reveal should be immediate.

If identity has not locked, the UI may show a short reading state while continuing the same fixed-slot identity path.

If the still frame is blurry, clipped, overexposed, or otherwise invalid, the scanner must fail closed with actionable feedback.

## Still Image Requirement

The final identity decision should prefer the highest-quality still frame available from the camera stack, not a low-quality preview stream frame.

Required direction:

- preview is for user guidance and presearch
- still capture is for final confirmation
- still crop must map back to the selected slot
- still output must preserve enough resolution that bottom card number and set area are inspectable

This aligns with `SCANNER_CAMERA_SYSTEM_V1`.

## Multi-Card Rules

In two-card or four-card mode:

- each slot is an independent identity lane
- each slot has independent presearch state
- tapping a slot selects it
- selected slot remains stable until the user changes it or the card leaves the slot
- identity votes/caches must not leak between slots
- capture reveals the selected slot first
- future batch capture may reveal all occupied slots only after each slot has independent evidence

## UI Rules

Required:

- stable slot guide
- mode control for one, two, four cards
- selected-slot affordance
- haptic and/or shutter feedback on capture when platform allows
- thumbnail/result tile after reveal
- scanned-card memory may persist within the scanner session

Forbidden:

- visible suggestions before capture/reveal
- dynamic boxes that force the user to chase moving geometry
- production UI that displays raw detector/debug state
- showing `Ready` when a selected slot does not satisfy card-present and quality gates
- hiding slow identity behind an indefinite spinner

## Identity Authority

The identity authority remains canonical visual matching.

Allowed:

- ANN / compact scanner index
- canonical `card_prints` identity mapping
- per-view visual shards
- slot-scoped visual crop candidates
- cached presearch candidates
- final still-frame visual confirmation

Forbidden:

- OCR authority
- UI text authority
- detector authority
- raw card-present authority
- hand-curated special-case identity files
- lowering confidence to force passes

## Performance Contract

Target:

- clean fixed-slot card capture should reveal an accepted identity in under `2 seconds`
- if presearch is already locked, reveal should feel immediate
- cold start should still target under `2 seconds` from first valid fixed-slot identity frame or capture request

Proof must report:

- selected slot mode
- selected slot id
- preview frame size
- still frame size if used
- card-present/quality gate status
- presearch elapsed time
- final identity elapsed time
- total capture-to-reveal elapsed time
- candidate id / `gv_id`
- identity confidence reason
- cache hit vs still-confirmed result

## Migration Direction

Existing dynamic scanner work may be reused only where it supports the fixed-slot architecture:

- camera preview
- still capture
- ANN identity service
- canonical index
- raw crop transport
- card-present/quality diagnostics
- result UI components
- local real-device harnesses

The following are not production direction:

- dynamic box as identity crop authority
- threshold-chasing to make boxes surround cards
- moving frame selection as the main UX
- full-art/card-specific detector patches
- accepting a card only when the physical scene is perfect

## Required Build Order

1. Freeze this contract as the target.
2. Create a small fixed-slot prototype behind scanner-only code paths.
3. Implement one-card slot mode first.
4. Map preview slot to identity crop.
5. Add slot-scoped background presearch.
6. Add shutter/reveal using cached presearch when valid.
7. Add high-quality still capture confirmation.
8. Add two-card mode.
9. Add four-card mode.
10. Add production polish only after identity works reliably.

Do not start with four-card complexity, native camera replacement, or UI polish before one-card fixed-slot identity is proven.

## Verification Requirements

Before fixed-slot scanner work is considered complete, real-device evidence must prove:

- one-card slot identifies known regular card under `2 seconds`
- one-card slot identifies known full-art or holo card under `2 seconds`
- card outside slot does not produce a final identity
- no-card slot does not start final identity
- capture/reveal shows correct result
- presearch cache resets when the card leaves the slot
- two-card slot selection does not leak identity between slots
- fixed slot crop is inspectable in saved artifacts
- OCR is not part of the authority path

Required checks:

```text
git diff --check
flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub
```

If backend scanner identity scripts are changed, run the relevant `node --check` commands for those scripts.

## Stop Rules

Stop and audit before proceeding if:

- a fix requires detector threshold tuning
- a fix makes the dynamic detector box the production crop authority again
- OCR is proposed as the way to identify the card
- the UI shows identity before capture/reveal
- the slot crop cannot be mapped to still capture coordinates
- the still capture is not sharper than the preview path
- identity exceeds `2 seconds` on clean fixed-slot evidence
- work drifts into pricing, vault, Supabase schema, auth, public web, feed, or unrelated backend workers
- multi-card mode causes identity leakage between slots

## Acceptance Statement

The fixed-slot scanner is compliant only when:

```text
the user places a card in a stable slot
-> the scanner presearches visually in the background
-> capture gives haptic/sound feedback
-> a sharp selected-slot crop confirms identity
-> the correct canonical Grookai card is revealed quickly
```

The scanner should feel simple because the product controls the capture geometry instead of chasing it.
