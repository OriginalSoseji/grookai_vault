# CHECKPOINT — Battle Academy Phase 8 Identity Subsystem Migrations V1

Date: 2026-04-02

Status: LOCKED
Scope: Implements the approved identity subsystem migration chain, local replay verification, and BA storage enablement preflight without promoting BA canon rows
Phase: BA_PHASE8_IDENTITY_SUBSYSTEM_MIGRATIONS_V1

---

## 1. Context

Phase 7 locked the migration-ready Option B design.

Phase 8 implemented that design in repo migrations and verified the resulting local schema by replay.

Battle Academy remained out of scope for promotion.
This phase existed to:

- create `public.card_print_identity`
- move printed-identity authority into the subsystem
- preserve `gv_id` on `card_prints`
- preserve `external_mappings` on `card_prints`
- remove the BA storage-shape blocker at the schema level

---

## 2. Why Implementation Followed Migration Design Exactly

The implementation matched the locked Phase 7 design:

- exact `card_print_identity` column set
- partial-unique active-row enforcement
- deterministic `identity_key_hash` support functions
- reference-table RLS posture
- backfill-before-final-verification ordering
- BA set registration as storage enablement only

No legacy migrations were edited.
Only additive Phase 8 migrations were created.

---

## 3. Migrations Created

- `20260402100000__card_print_identity_table.sql`
- `20260402100001__card_print_identity_indexes.sql`
- `20260402100002__card_print_identity_support_functions.sql`
- `20260402100003__card_print_identity_rls_and_grants.sql`
- `20260402100004__card_print_identity_backfill.sql`
- `20260402100005__card_print_identity_post_backfill_constraints.sql`
- `20260402100006__ba_set_registration_if_required.sql`

Result:

- local replay via `supabase db reset --local` succeeded
- `public.card_print_identity` now exists in the local replayed schema
- BA release containers `ba-2020`, `ba-2022`, and `ba-2024` are now registered locally

---

## 4. Table, Constraint, and Index Summary

Implemented table shape:

- `id`
- `card_print_id`
- `identity_domain`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`
- `identity_payload`
- `identity_key_version`
- `identity_key_hash`
- `is_active`
- `created_at`
- `updated_at`

Implemented constraints and indexes:

- PK on `id`
- FK `card_print_id -> card_prints(id)`
- domain guard on approved identity domains
- payload-object guard
- partial unique active-parent index
- partial unique active domain/version/hash index
- support indexes for `card_print_id`, `identity_domain`, `set_code_identity + printed_number`, and normalized-name lookup
- post-backfill domain/version pairing check
- post-backfill active-row required-fields check

---

## 5. Helper and Hash Function Summary

Phase 8 implemented deterministic support functions for:

- optional text normalization
- normalized printed-name derivation
- set-code and printed-number selection
- `variant_key_current` compatibility projection
- approved payload-key selection per domain/version
- ordered domain-dimension serialization
- sha256 identity-hash generation
- fail-closed backfill projection for existing canon

No heuristic, fuzzy, or similarity-based logic was introduced.

---

## 6. Backfill Summary

Local replay state after `supabase db reset --local`:

- `card_prints` inspected locally: `0`
- `card_print_identity` inserted locally: `0`
- active identity rows locally: `0`
- missing active identity rows locally: `0`
- active duplicate-parent groups locally: `0`
- active hash-collision groups locally: `0`

This local replay passed because the local reset surface is schema-only.

Read-only current-canon audit against the configured remote DB showed:

- total remote `card_prints`: `33,998`
- rows ready under current Phase 8 backfill classifier: `31,051`
- blocked/unclassified rows: `2,947`
- blocker reason: `UNSUPPORTED_SET_SOURCE_DOMAIN:tcg_pocket`

This is the current hard stop.
Phase 8 cannot claim deterministic backfill coverage for the full live canon surface while `tcg_pocket` remains outside the approved Phase 7 domain set.

---

## 7. GV ID Continuity Confirmation

Confirmed:

- `gv_id` still lives on `card_prints`
- `card_print_identity` does not own `gv_id`
- no BA `gv_id` values were generated in this phase
- no existing public `gv_id` route was moved or rewritten

---

## 8. External Mappings Continuity Confirmation

Confirmed:

- `external_mappings.card_print_id` still references `card_prints(id)`
- no migration re-anchored mappings to `card_print_identity`
- compatibility remains object-first, not identity-row-first

---

## 9. BA Storage Readiness Result

Schema-level BA storage readiness is now true:

- `pokemon_ba` is an approved identity domain
- the subsystem has explicit fields for:
  - `set_code_identity`
  - `printed_number`
  - `normalized_printed_name`
  - `source_name_raw`
- all `328` BA promotion candidates remain representable losslessly in subsystem shape
- local BA release sets are registered
- no local BA `card_prints` were inserted

The Phase 6 schema blocker is therefore removed at the storage-shape level.

BA promotion remains deferred.

---

## 10. Replayability Result

Replay proof:

- `supabase db reset --local` passed with the new Phase 8 migrations included

Verifier result:

- local schema and replay checks passed
- local BA storage-alignment checks passed
- local continuity checks for `gv_id`, `external_mappings`, and `variant_key` boundaries passed
- overall verification did **not** pass cleanly because live canon includes `2,947` `tcg_pocket` rows outside the approved Phase 7 identity domains

Phase 8 therefore stopped lawfully after implementation and replay verification, before any BA promotion.

---

## 11. Boundary

This phase implements the identity subsystem and backfills existing canon. It does not promote BA canon rows.

Additional locked boundaries:

- no BA `card_prints` were created
- no BA `external_mappings` were written
- `gv_id` stayed on `card_prints`
- `external_mappings` stayed on `card_prints`
- `variant_key` was not repurposed as an identity shortcut
- unsupported live domains were blocked explicitly instead of being coerced into approved domains

---

## 12. Next Phase Status

`BA_PHASE9_BA_CANON_PROMOTION_V2` is **not** unlocked yet.

Reason:

- Phase 8 implementation is replayable and BA storage-ready
- but Phase 8 verification did not pass cleanly on the full current canon surface because `tcg_pocket` remains outside the approved identity-domain set

That blocker must be handled explicitly before claiming full existing-canon subsystem readiness.
