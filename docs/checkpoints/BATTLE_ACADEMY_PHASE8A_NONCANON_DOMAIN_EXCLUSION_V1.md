# CHECKPOINT — Battle Academy Phase 8A Non-Canon Domain Exclusion V1

Date: 2026-04-02

Status: LOCKED
Scope: Excludes `tcg_pocket` from CanonDB identity rollout, preserves supported-domain backfill alignment, and keeps BA promotion deferred
Phase: BA_PHASE8A_NONCANON_DOMAIN_EXCLUSION_V1

---

## 1. Why Phase 8 Stopped on `tcg_pocket`

Phase 8 implemented the identity subsystem and passed local replay.

It stopped lawfully on the live current-canon audit because `2,947` remote `card_prints` rows belonged to `set.source.domain = 'tcg_pocket'`, while the approved canonical identity domains were:

- `pokemon_eng_standard`
- `pokemon_ba`
- `pokemon_eng_special_print`
- `pokemon_jpn`

`tcg_pocket` was outside that approved set, so the Phase 8 verifier fail-closed.

---

## 2. Founder Decision

The founder decision is now locked:

- `tcg_pocket` does not belong in CanonDB
- `tcg_pocket` must not block canonical identity rollout
- unsupported non-canonical domains must be excluded explicitly, not silently coerced

The identity subsystem contract was amended in place to state that `tcg_pocket` is currently `NON_CANON_DOMAIN` and requires a separate future contract if support is ever reconsidered.

---

## 3. Exclusion Taxonomy

Rows encountered during identity backfill now land in exactly one taxonomy:

- `SUPPORTED_CANON_DOMAIN`
  - row participates in canonical identity backfill
- `EXCLUDED_NONCANON_DOMAIN`
  - row belongs to an explicitly excluded non-canonical domain and receives zero identity rows
- `BLOCKED_UNKNOWN_DOMAIN`
  - row belongs to a domain that is neither approved nor explicitly excluded and must still fail closed

Locked rule:

- `tcg_pocket` -> `EXCLUDED_NONCANON_DOMAIN`

---

## 4. Backfill Behavior After Exclusion

Phase 8A changed the backfill path so that:

- supported canonical rows remain backfillable
- explicitly excluded non-canonical rows are skipped deterministically
- skipped rows are counted and surfaced in artifacts
- post-backfill invariants no longer demand active identity rows for explicitly excluded non-canonical rows
- unknown domains still block rollout

This change did not add `tcg_pocket` as a canonical identity domain.

---

## 5. Supported vs Excluded Counts

Read-only current-canon audit after Phase 8A:

- total `card_prints` inspected: `33,998`
- supported canonical domain rows: `31,051`
- excluded non-canonical domain rows: `2,947`
- blocked unknown domain rows: `0`

Breakdown:

- supported: `pokemon_eng_standard = 31,051`
- excluded: `tcg_pocket = 2,947`

`tcg_pocket` inventory:

- total rows: `2,947`
- distinct sets affected: `10`
- affected set codes:
  - `A4`
  - `A3`
  - `A2`
  - `B1`
  - `A1`
  - `A2b`
  - `A3b`
  - `A4a`
  - `A2a`
  - `A1a`
- rows with non-null `gv_id`: `0`
- cleanup remains deferred

---

## 6. Verification Result

Phase 8A verification passed cleanly.

Confirmed:

- local `supabase db reset --local` still succeeds
- `public.card_print_identity` still has the approved Phase 8 shape
- supported canonical domains still backfill cleanly
- `tcg_pocket` rows are excluded and receive zero identity rows
- excluded non-canonical domains no longer fail verification when explicitly classified
- unknown domains still fail closed
- `gv_id` remains on `card_prints`
- `external_mappings` remains anchored to `card_prints`
- `variant_key` was not repurposed
- BA storage representation remains possible
- no BA canon rows were promoted

Runtime result:

- `runtime_blockers = []`

`tcg_pocket` therefore no longer blocks supported-domain canonical identity rollout.

---

## 7. Boundary

This phase excludes `tcg_pocket` from CanonDB identity rollout. It does not canonize `tcg_pocket`, does not promote BA canon rows, and does not reinterpret unsupported non-canonical data as canonical.

Additional locked boundaries:

- no identity rows are created for `tcg_pocket`
- `tcg_pocket` is not remapped into any approved canonical domain
- unknown domains remain fail-closed
- `external_mappings` anchoring does not change
- `gv_id` storage does not change

---

## 8. Next Phase Status

The next lawful artifact is:

`BA_PHASE9_BA_CANON_PROMOTION_V2`

That phase may proceed only if:

- supported canon domains backfill successfully
- `tcg_pocket` remains excluded cleanly
- no blocked unknown domains remain
- BA storage readiness remains green
