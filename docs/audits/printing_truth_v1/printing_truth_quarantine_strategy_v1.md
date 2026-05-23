# Printing Truth Quarantine Strategy V1

Date: 2026-05-23

## Status

Phase 2 design and schema guardrail only. No canonical `card_printings` rows are deleted, updated, hidden, or retargeted by this pass.

## Strategy

Printing truth review uses a sidecar table:

```text
public.card_printing_truth_reviews
```

The sidecar stores the current review classification for an existing `card_printings.id` without mutating the canonical row. This gives Grookai a safe review lane for unsupported, conflicting, unverifiable, and quarantine-candidate printings before any public visibility or deletion behavior is approved.

## Review Statuses

- `verified`: exact parent card and finish are externally backed.
- `unsupported`: audited sources do not support the existing finish/printing.
- `conflicting`: authoritative sources disagree and no deterministic rule has resolved the row.
- `unverifiable`: insufficient source evidence exists to prove or disprove the row.
- `quarantined_candidate`: high-risk row that should be isolated for manual proof review before public reliance.

## Visibility Field

`public_visibility` is a recommendation only in V1:

- `visible`
- `hidden_pending_review`
- `hidden_unsupported`

No production catalog surface consumes this field in this pass. Public hiding requires a separate approved migration and application wiring after audit approval.

## Access Model

- `anon`: no direct access.
- `authenticated`: no direct access.
- `service_role`: select, insert, update.

The current-view helper `public.v_card_printing_truth_current_v1` is also service-role only. This prevents review decisions from leaking into public clients before the normalization plan is approved.

## Audit-To-Sidecar Mapping

The Phase 1 artifacts are the input source of truth:

- `printing_truth_global_audit_v1.json`
- `unsupported_printings_v1.json`
- `reverse_holo_integrity_v1.json`

Candidate mapping:

- `verified` rows may be inserted when at least one exact finish evidence source exists.
- `unsupported` rows map from unsupported report records where checked sources omit the current finish.
- `unverifiable` rows map from report records lacking source payloads or exact external mappings.
- `quarantined_candidate` rows map from unsupported, unverifiable, and reverse-holo-risk rows until reviewed.
- `conflicting` rows require explicit source disagreement evidence.

## Rollback Plan

This phase is reversible without touching canonical catalog data:

1. Stop any internal worker that writes `card_printing_truth_reviews`.
2. Drop `public.v_card_printing_truth_current_v1`.
3. Drop `public.card_printing_truth_reviews`.
4. Drop `public.set_card_printing_truth_reviews_updated_at_v1`.

No `card_printings`, vault, ownership, provenance, pricing, or identity rows need rollback because this phase does not mutate them.

## Stop Rules

Do not proceed to public hiding or deletion if any of these are true:

- a candidate row is referenced by vault ownership/provenance and no retarget plan exists
- a source disagreement cannot be resolved deterministically
- the row affects canonical identity laws rather than only finish truth
- review evidence cannot name exact sources checked
- public surfaces would hide rows without a user-facing recovery path
