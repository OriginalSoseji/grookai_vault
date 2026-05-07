# SCANNER_LIVE_BEHAVIOR_CONTRACT_V1

## Status

Active.

This is the controlling contract for the next scanner build goal: a reference-like live scan experience where behavior, readiness, and identity feedback are driven by measured scanner state instead of decorative UI assumptions.

This contract does not assert that the current implementation is fully compliant. It defines the target behavior and the stop rules for future scanner work.

## Purpose

Prevent drift while evolving the scanner toward the supplied reference behavior:

```text
camera opens
-> live card region is guided
-> scanner reacts while the card moves
-> card-present evidence becomes stable
-> identity work starts only after the gate allows it
-> user-visible feedback tracks the actual scanner state
-> recognized/unknown/error states are explainable
```

## Reference Behavior Source

Founder-supplied visual reference:

```text
C:\Users\ccabr\Downloads\ScreenRecording_03-20-2026 20-15-35_1.MP4
```

The video is a behavior/design reference, not a source of authority for broadening product scope. This contract is the authority. If the video implies behavior outside this contract, this contract wins until amended.

Observed reference behavior to preserve in spirit:

- camera-first experience, not a landing page
- full live preview as the primary surface
- card guide/corners visibly react to card position
- detected card can be recognized without a manual shutter moment
- recognition feedback appears quickly and spatially near the card
- scanning remains continuous across repeated cards
- game/category controls are secondary to live scan behavior

## Scope

Applies to scanner-only work in:

- `lib/screens/scanner/`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- scanner-specific debug/runbook/parser files under `scripts/scanner/`, `backend/scanner_v4/`, and `docs/`

Any work outside these surfaces must be explicitly justified as scanner plumbing. Do not use this contract to change pricing, Supabase schema, backend identity workers, OCR authority, retrieval, ML models, vault writes, or public web behavior.

## Relationship To Existing Contracts

This contract reuses and narrows existing scanner rules; it does not delete them.

- `SCANNER_CAMERA_SYSTEM_V1` remains the quality and camera-system contract.
- `SCANNER_SHUTTER_GATE_CONTRACT_V1` remains binding for legacy/manual shutter readiness where that path is active.
- `scanner_v3_instant_scan_contract` remains binding for instant-match authority and proof-harness requirements.
- `IDENTITY_SCANNER_V1_CONTRACT` remains binding for backend identity authority and fail-closed identity rules.
- `scanner_v4_card_present_flow_audit.md` records the current card-present gate evidence and must be treated as the baseline proof for this behavior layer.

This contract adds the missing live-behavior layer: state machine, feedback timing, readiness truth, and reference-like scanner interaction.

## Core Principle

The scanner UI must never look more certain than the scanner state is.

Visual readiness, card guide lock, identity progress, and recognition feedback must be derived from measured scanner state. They must not be driven by cosmetic animation, raw quad presence alone, or optimistic identity assumptions.

## Required State Model

Future scanner behavior must be modeled as an explicit live behavior state machine. Names may differ in code, but the behavior must map to these states:

```text
searching
aligning
card_present_pending
ready
scanning_identity
recognized
unknown
blocked
```

### searching

No trustworthy card region is available.

Required behavior:

- show live preview
- show neutral guide
- do not show `Ready`
- do not start identity
- do not show candidate identity

### aligning

A card-like region or quad may exist, but card-present evidence is not accepted.

Required behavior:

- guide may react to measured geometry
- UI may show edge/framing guidance
- UI must not claim identity readiness
- identity must remain blocked

### card_present_pending

Card-present evidence is present but has not satisfied persistence/stability.

Required behavior:

- show hold/steady feedback
- avoid flicker between absent and ready states
- keep identity blocked until persistence is satisfied
- expose the pending reason in debug diagnostics

### ready

Card-present persistence is satisfied and the scanner is allowed to start identity work.

Required behavior:

- `Ready` or equivalent readiness may be shown only in this state or later
- identity may start automatically if the current scanner mode is live recognition
- readiness must clear if card-present fails on later frames

### scanning_identity

Identity work has started but no final result is accepted.

Required behavior:

- show an active reading/scanning state
- keep the user oriented to hold the card in frame
- do not show a final match unless identity rules accept it
- do not silently retry or hide identity errors

### recognized

A final or explicitly labeled probable result is available.

Required behavior:

- final recognized state requires the existing identity confidence/lock rules
- probable results must be visually labeled as probable unless backend-confirmed
- background confirmation disagreement must visibly replace or downgrade the result

### unknown

The scanner could not confidently identify the card.

Required behavior:

- show a clear unknown/not-sure state
- provide retry and manual search paths
- do not write a vault record or final identity selection implicitly

### blocked

Scanner input is unsuitable or a required service is unavailable.

Required behavior:

- show the most actionable blocker first
- fail closed
- keep debug evidence available

## Readiness Truth Rules

1. `Ready` must be downstream of card-present persistence, not raw quad detection.
2. `Edges locked` may describe geometry only; it must not imply identity readiness.
3. `Image clear` may describe quality only; it must not imply card-present or identity eligibility.
4. Identity may start only when `identityAllowed == true` or the behavior layer's equivalent derives from the same gate.
5. Candidate display must be downstream of identity evidence, not background/card-present evidence alone.
6. Card-present loss must clear or downgrade any in-progress readiness state before the user can be misled.
7. Debug UI may expose raw detector success, but production UI must not present raw detector success as readiness.

## Feedback Behavior

The reference-like scanner must feel continuous, but it must remain fail-closed.

Required:

- live preview is the first screen of scanner mode
- guide/corners react smoothly to measured state
- guide lock must be debounced enough to avoid flicker
- state copy must prefer short action labels:
  - `Align card`
  - `Hold steady`
  - `Reading`
  - `Ready`
  - `Card found`
  - `Try again`
- bottom controls must support repeated scanning without leaving the camera
- diagnostics must stay hidden by default and available in debug builds

Forbidden:

- showing `Ready` for empty/background scenes
- showing `Ready` when `identityAllowed` is false
- treating `center_fallback`, fallback guide geometry, or visual guide alignment as card-present proof
- hiding service failure behind a perpetual loading state
- making the user press a manual shutter to compensate for missing live-state modeling, unless explicitly in legacy capture mode

## Identity Authority Rules

This contract does not create new identity authority.

Allowed:

- show live reading progress once card-present persistence allows identity
- show backend-confirmed identity results
- show probable/local results only when clearly labeled and replaceable
- use diagnostics to explain why identity did or did not start

Forbidden:

- OCR as final fast-path authority
- embeddings as final identity authority
- raw camera frame hash as final identity authority
- card-present as identity authority
- UI state as identity authority

## Verification Requirements

Before future scanner live-behavior work is treated as done, verification must include:

```text
git diff --check
flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub
node --check backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs
```

Real-device evidence must include:

- valid no-card empty/background run:
  - `card_present=0`
  - `identity_allowed=0`
  - `identity_started=0`
- valid card-present run:
  - `card_present>0`
  - `identity_allowed>0`
  - `identity_started>0`
  - ordering check passes
- screenshots or report artifacts proving the physical scene was valid for each phase

Behavioral verification must also prove:

- `Ready` is not visible during no-card/background validation
- `Ready` appears only after card-present persistence, or an equivalent state proof exists
- card-present loss downgrades the UI
- debug/diagnostic controls do not dominate production scanner UI

## Stop Rules

Stop scanner behavior work and audit before continuing if:

- a change requires detector threshold tuning to make UI behavior look correct
- a change touches OCR, retrieval, identity model, ML, pricing, Supabase schema, vault writes, or backend identity workers
- UI readiness diverges from card-present/identity eligibility
- no-card/background scenes can show `Ready` or start identity
- the reference video is used to justify multi-game scope expansion before Pokemon scanner behavior is stable
- a behavior cannot be verified with real-device evidence or a deterministic scanner harness

## Non-Goals

This contract does not define:

- pricing behavior
- marketplace behavior
- non-Pokemon game support
- new backend identity architecture
- OCR/retrieval/model tuning
- vault write or ownership behavior
- public web scanner behavior
- monetization

## Acceptance Statement

The scanner live-behavior build is compliant only when the camera feels continuous and reference-like while remaining truth-bound:

```text
no card -> no Ready, no identity
unstable card -> hold/align feedback, no identity
stable real card -> Ready/Reading, identity may start
accepted identity -> recognized or explicitly probable result
uncertain identity -> unknown/retry/manual search
```

Any implementation that makes the scanner look ready without card-present persistence and identity eligibility is non-compliant.
