# PRINTING_MODEL_V2_IMPLEMENTATION_CHECKPOINT

Status: COMPLETE (phase locked)  
Date: 2026-03-27  

## 1. Context

This checkpoint closes the first lawful implementation phase of Printing Model V2.

This phase was governed by:

- `docs/contracts/CHILD_PRINTING_CONTRACT_V1.md`
- `docs/contracts/PRINTING_MODEL_V2.md`

This phase did not reopen canon. `card_prints` remained the current canonical authority throughout the entire phase.

This phase converted the child-printing layer from an under-governed finish surface into a controlled, bounded, provenance-aware layer with deterministic stable ingestion and explicit UI-safe fallback behavior.

## 2. Problem

Before this phase, the printing layer had multiple correctness risks:

- `card_printings` lacked a fully locked boundary against canon drift
- stable child-printing creation was not yet clearly owned by controlled ingestion
- provenance for child rows was incomplete
- finish handling and child-row creation were vulnerable to manual or ad hoc drift
- the public card surface could disappear or degrade when a canonical card had zero child printings
- image failures were being misread as mapping failure when the actual problem was incomplete TCGdex asset URL shape at read/render time

The system needed a lawful implementation phase that improved correctness without mutating canon.

## 3. Why This Phase Mattered

This phase mattered because `card_printings` sits directly between canonical identity and downstream product behavior.

If this layer drifted, Grookai would risk:

- finish distinctions redefining canon by accident
- child rows being created outside controlled ingestion
- pricing, UI, or source mappings treating unstable distinctions as settled truth
- missing or malformed representation for valid zero-print canonical cards

The purpose of this phase was to stabilize the foundation before any premium, provisional, or broader redesign work continued.

## 4. Scope Completed

The following work was completed in this phase:

- `CHILD_PRINTING_CONTRACT_V1` was authored and amended to lock child-layer governance
- `PRINTING_MODEL_V2` was defined to lock the bounded V2 schema and ingestion model
- `public.card_printings` was extended with V2 metadata columns:
  - `is_provisional`
  - `provenance_source`
  - `provenance_ref`
  - `created_by`
- bounded child-printing ingestion was implemented for stable finish keys only:
  - `normal`
  - `holo`
  - `reverse`
- TCGdex normalization became the primary stable child-printing creation lane
- PokemonAPI normalization was wired and validated as a reinforcement and validation lane
- the upsert path became deterministic and replayable on `(card_print_id, finish_key)`
- TCGdex trait fetch logic was corrected to target the dedicated TCGdex stats row instead of assuming one generic trait row per `card_print_id`
- TCGdex image rendering was fixed at the read/render layer by normalizing incomplete stored asset URLs and using deterministic derived fallback URLs when needed
- the public card surface was updated to remain usable for:
  - cards with many child printings
  - cards with one child printing
  - cards with zero child printings

Primary implementation commits that closed this phase:

- `d39f2bd` — `printing v2: child printing model + metadata columns, image normalization pipeline, public card surface updates`
- `6412fbb` — `card UI: introduce printing selector + gv card surface updates`

## 5. What Was Explicitly Not Done

This phase did not do the following:

- did not change `card_prints` canon
- did not redesign child classification rules beyond the locked contracts
- did not add new finish keys
- did not implement premium parallel ingestion
- did not implement provisional child-row creation
- did not treat JustTCG as a lawful printing identity lane
- did not treat user-upload or scan discovery as a child-printing lane
- did not redesign pricing
- did not create synthetic database child rows for zero-print cards
- did not solve canon-sensitive distinctions by assumption

## 6. Architecture Decisions Locked

The following architecture decisions are now locked for this completed phase:

- `card_prints` remains canonical identity
- `card_printings` remains child-only
- stable child-printing scope for implemented ingestion is limited to:
  - `normal`
  - `holo`
  - `reverse`
- `finish_keys` remains bounded vocabulary
- child rows must be created only through controlled ingestion or audited transformation paths
- TCGdex is the primary stable finish ingestion lane
- PokemonAPI is the reinforcement and validation lane for the same stable finish scope
- JustTCG is not a lawful printing identity lane
- user-upload and scan discovery are not child-printing lanes
- zero-print canonical cards are valid and must be handled by representation fallback, not by inventing stored DB rows
- premium parallels remain deferred to a later bounded phase
- provisional child handling remains deferred to a later bounded phase
- image normalization belongs to the read/render layer, not to DB mutation or ingestion replay
- the `card_print_traits` multi-row issue is a separate trait-surface concern and is not evidence of printing-layer failure

## 7. Implementation Summary

Contract and design artifacts created or locked:

- `docs/contracts/CHILD_PRINTING_CONTRACT_V1.md`
- `docs/contracts/PRINTING_MODEL_V2.md`

Schema change completed:

- `supabase/migrations/20260326100000_card_printings_v2_metadata_columns.sql`

Printing-layer implementation surfaces completed:

- `backend/printing/finish_normalizer_v1.mjs`
- `backend/printing/printing_upsert_v1.mjs`
- `backend/pokemon/tcgdex_normalize_worker.mjs`
- `backend/pokemon/pokemonapi_normalize_worker.mjs`

Read/render-layer representation and image stability work completed:

- `apps/web/src/lib/cards/buildTcgDexImageUrl.ts`
- `apps/web/src/lib/cards/normalizeCardImageUrl.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/components/cards/PrintingSelector.tsx`
- `apps/web/src/types/cards.ts`

## 8. Verification / Proof

The following facts were established during this phase:

- stable child-printing ingestion writes only bounded finish keys
- child-printing upserts preserve uniqueness on `(card_print_id, finish_key)`
- TCGdex completed a large real remote run and wrote stable child rows with provenance
- no duplicate `(card_print_id, finish_key)` rows were created
- no canon mutation occurred during child-printing ingestion
- PokemonAPI was run after TCGdex and added no new stable child rows for the processed catalog
- the PokemonAPI pending queue cleared cleanly after the bounded run
- PokemonAPI therefore proved its role as reinforcement and validation lane, not primary stable finish source
- phase-close coverage snapshot recorded during this phase was:
  - `card_prints`: `33,997`
  - cards with at least one printing: `33,745`
  - cards with zero printings: `252`
- the remaining zero-print cards were concentrated in promo, POP, and special-case families and did not justify synthetic DB row creation
- public card representation now remains usable when a canonical card has many, one, or zero child printings
- image failures were resolved through read/render normalization of TCGdex URLs rather than DB mutation

## 9. Key Findings

The key findings from this phase are:

- TCGdex already covers the stable finish space for the processed catalog strongly enough to serve as the primary stable child-printing lane
- PokemonAPI is still valuable, but its lawful role in this phase is reinforcement and validation of the stable finish space
- zero-print cards are a legitimate catalog state and must be represented safely rather than “repaired” by invented storage rows
- the printing-layer correctness question is separate from the trait-table shape question
- broken TCGdex image rendering was primarily a read-path URL normalization problem, not a destroyed mapping problem
- bounded provenance on child rows is necessary for future auditability, even when only stable rows are currently written

## 10. What Remains

The following work remains outside this completed phase:

- premium parallel eligibility and ingestion for `pokeball` and `masterball`
- provisional bucket C child handling
- canon-sensitive promotion workflow from child handling into canonical rows
- any lawful future expansion beyond the current stable finish scope
- any future source-role expansion beyond:
  - TCGdex
  - PokemonAPI
- any broader child-mapping or UI behavior tied to premium or provisional distinctions
- any future cleanup of the remaining zero-print promo and special-case catalog slice
- any deeper trait-surface redesign beyond the targeted TCGdex stats-row fix

## 11. Invariants That Must Not Drift

The following invariants are phase-locked and must not drift later:

1. `card_prints` canon was not changed in this phase and must not be retroactively treated as changed by child-layer work.
2. `card_printings` remains a child-only layer.
3. Stable child ingestion implemented in this phase is limited to `normal`, `holo`, and `reverse`.
4. TCGdex is the primary stable finish ingestion lane for this phase.
5. PokemonAPI is reinforcement and validation lane, not primary stable finish authority.
6. JustTCG must not be used as a printing identity lane.
7. User-upload and scan discovery must not be used as child-printing identity lanes.
8. Child-printing creation must remain controlled and provenance-aware.
9. Zero-print cards are valid and must be handled through read/representation fallback, not by inventing stored child rows.
10. Premium parallels remain deferred and must not be implemented by assumption.
11. Provisional child handling remains deferred and must not appear implicitly.
12. Image rendering fixes belong to the read/render layer unless a future explicit data repair phase is separately authorized.
13. Trait-surface bugs must not be used as evidence that the printing model itself is invalid.

## 12. Next Recommended Step

The next recommended step is a separate premium-parallel phase.

That phase must:

- remain subordinate to `CHILD_PRINTING_CONTRACT_V1`
- preserve the current stable child scope unchanged
- audit and normalize premium eligibility for `pokeball` and `masterball`
- define deterministic premium enforcement before any premium child rows are widened

That next phase must not reopen:

- canon
- stable finish source roles
- JustTCG source authority
- user-upload source authority
