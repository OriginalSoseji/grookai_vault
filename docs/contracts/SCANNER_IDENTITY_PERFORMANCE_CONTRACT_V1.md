# SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1

## Status

Active.

This contract defines the production performance target for the live scanner identity path. It narrows `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1` for identity speed and evidence without changing detector, OCR, retrieval, ML, Supabase, pricing, vault writes, or backend identity-worker authority.

## Scope

Applies only to scanner identity performance work in:

- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `lib/screens/scanner/`
- `lib/screens/scanner/widgets/`
- scanner parser/runbook/audit files under `backend/scanner_v4/`, `scripts/scanner/`, and `docs/`
- local scanner identity index/dev service plumbing under `backend/identity_v3/`

Any broader identity, OCR, retrieval, ML, Supabase, pricing, or vault-write change is out of scope.

## Performance Target

For a clean selected Pokemon card with the local scanner identity service reachable:

- identity must lock in less than `2000 ms` from accepted identity frame work
- identity must lock in less than `2000 ms` from first top-candidate timing evidence
- normal clean-frame identity must use the fast 2-crop path
- normal clean-frame lock evidence must show `identity_crop_count <= 2`
- normal clean-frame lock evidence must show `identity_successful_crop_count >= 2`
- normal clean-frame lock evidence must show `identity_vote_updates >= 2`
- one-frame identity locks are forbidden
- the accepted identity distance guard remains binding
- full multicrop fallback is allowed only as a recovery path when the fast path cannot produce accepted evidence

## Required Evidence Fields

Lock artifacts used as performance proof must include:

- `candidate_id`
- `identity_decision_state`
- `identity_decision_reason`
- `identity_signal_source`
- `identity_crop_count`
- `identity_successful_crop_count`
- `identity_pipeline_elapsed_ms`
- `identity_to_lock_elapsed_ms`
- `embedding_elapsed_ms`
- `vector_search_elapsed_ms`
- `identity_vote_updates`
- `identity_top_distance`
- `identity_crop_support_count`
- `frames_seen`
- `frames_accepted`

The parser may treat missing required fields as failure unless the artifact is explicitly excluded as incomplete.

## Multi-Card Target

When two cards are in view:

- each visible card must remain selectable by tap
- the selected card must stay the primary identity target while retained
- identity evidence must be attributable to the selected card crop
- selecting the other card must reset or separate identity voting so the first card cannot leak into the second card's result
- each card must be capable of meeting the same `<2000 ms` clean-frame target

## UI Timing Target

The UI must not hide performance failures behind long loading states.

- identity may begin as soon as a card is in scope so the scanner can cache a result before capture
- candidate name, set code, number, and identity suggestion UI must remain hidden until the user requests capture/reveal
- if identity has already locked when capture/reveal is requested, the cached match should reveal immediately
- if identity has not locked when capture/reveal is requested, the scanner may show a reading state while continuing the same guarded identity path
- `Reading` should appear only when identity is actually allowed or running
- `Card found` must correspond to an accepted identity result
- `Align` must remain visible when the card is not sufficiently visible for a clean proof
- overflow, clipped controls, or blocked retry actions are contract failures for scanner production readiness

## Parser Requirement

Scanner lock-artifact parsing must report:

- per-artifact PASS/FAIL
- candidate id and optional display name when known
- identity signal source
- identity crop count and successful crop count
- identity pipeline, embedding, and vector timings
- identity-to-lock timing
- vote update count
- top distance and crop support
- explicit failure reasons

The parser must exit non-zero when any included artifact violates this contract.

## Stop Rules

Stop and audit before continuing if meeting the speed target appears to require:

- detector threshold tuning
- OCR authority changes
- retrieval changes
- identity model or ML model changes
- Supabase schema or canonical identity writes
- pricing, marketplace, or vault-write changes
- accepting one-frame locks
- weakening the accepted-distance or crop-support guards

## Acceptance

This contract is satisfied only when real-device evidence shows clean selected-card identity locks in less than `2000 ms`, normally through the fast 2-crop path, while preserving no-card blocking and guarded identity authority.
