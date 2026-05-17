# Missing Cards Backfill Dry-Run Implementation Plan 2026-05-17

Status: no-write implementation planning artifact. No Supabase writes, migrations, inserts, updates, deletes, card movement, set creation, mapping movement, identity rewrites, metadata merges, or variant changes are authorized by this document.

## Purpose

Define the future dry-run shape for missing-card backfill after set ownership and number normalization blockers are handled.

This is not a card import plan. It is the gate design that a future candidate list must pass before any insert plan can be reviewed.

## Source Evidence

- `missing_cards_backfill_evidence_20260517.md`
- `missing_cards_backfill_evidence_matrix_20260517.json`
- `missing_set_universe_decision_20260517.md`
- `number_normalization_evidence_20260517.md`
- `number_normalization_dry_run_implementation_plan_20260517.md`

## Non-Goals

- No card inserts.
- No set creation.
- No alias merges.
- No card movement.
- No external mapping movement.
- No raw import mutation.
- No identity table mutation.
- No variant/finish creation.
- No pricing work.
- No scanner or vault work.

## Future Candidate Input Contract

A future dry-run candidate file must be row-level and immutable for review.

Required fields:

- `master_set_name`
- `master_set_url`
- `source_card_url`
- `source_set_label`
- `source_name`
- `source_number`
- `normalized_number_key`
- `is_secret_range`
- `target_set_code`
- `target_set_id`
- `target_set_basis`
- `source_authority`
- `corroborating_sources`
- `blocker_lane`
- `review_status`

Candidates with missing target set, missing number, missing URL, or unresolved blocker lane must be excluded from the approved insert lane.

## Dry-Run Gates

The dry-run must prove:

- target set exists and is canonical for the source checklist;
- target set is not a canonicalization hard stop;
- candidate number does not already exist in `card_prints.number`;
- candidate number does not already exist as a recoverable TCGdex null-number row;
- candidate name does not match an existing same-number or source-derived row under a different spelling;
- source external mappings do not already point to another card print;
- active identity rows do not conflict;
- secret-range candidates have explicit printed-total and ownership proof;
- no candidate requires variants or finishes;
- all candidates are split into approved, review, or blocked lanes.

## Future Write Shape

If a future write is separately approved, it should be a guarded transaction using a temporary approved-candidate table.

The write should insert only canonical card identity rows after all guards pass. External mappings, variants, finishes, pricing, images, and identity rows should be handled in separate plans unless explicitly approved together.

## Rollback Strategy

Any future insert must record enough data to delete only the exact rows inserted by that transaction, but rollback should not be destructive by default. Preferred rollback is:

- insert batch with a unique operation note or provenance key;
- verify inserted IDs;
- if rollback is needed, mark/revert only those exact rows through an approved rollback transaction;
- never delete or mutate unrelated existing cards, mappings, raw imports, identity rows, or set rows.

## Post-Write Verification

If a future write is approved and executed, post-write checks must prove:

- inserted row count equals approved count;
- no unapproved target set received rows;
- no secret-range row was inserted without approval;
- no duplicate number/name identity was created in target sets;
- no external mapping drift occurred;
- no set rows changed;
- no variant rows were created;
- master audit missing-card count decreased only in the approved groups.

## Recommended Immediate Next Step

Do not insert cards.

The next concrete step is a no-write row-level dry-run for the `established_set_backfill_candidate_after_preflight` lane only, after number normalization is either completed or intentionally deferred. That lane currently contains 16 groups and 66 missing rows, but the count must be refreshed before use.

## No-Write Confirmation

This plan authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set creation, mapping movement, identity rewrites, metadata merges, missing-card backfill, or variant changes.
