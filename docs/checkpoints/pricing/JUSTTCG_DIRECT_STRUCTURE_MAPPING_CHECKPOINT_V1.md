# JUSTTCG_DIRECT_STRUCTURE_MAPPING_CHECKPOINT_V1

Status: ACTIVE  
Type: Checkpoint / Mapping Pattern  
Scope: Reusable direct JustTCG structure mapping pattern for future backlog reduction.

---

## Purpose

Freeze the first proven non-tcgplayer-centered JustTCG mapping lane so future work does not reopen the same structural question.

---

## New Reusable Invariant

Grookai may map JustTCG directly by:

1. aligning a Grookai set to one JustTCG set
2. retrieving candidates only inside that aligned set
3. matching only on exact printed identity
4. using explicit helper storage where JustTCG models a family differently

This lane is:

- integration-only
- fail-closed
- independent of tcgplayer bridging

---

## What Was Proven

Direct structure baseline across the remaining backlog:

- `exact-aligned` rows: `4,419`
- `probable-helper-override` rows: `1,653`
- `absent-upstream` rows: `1,993`
- `ambiguous-upstream` rows: `32`

Card-level proof inside aligned sets:

- `aligned_set_ready: 6,072`
- `exact_match: 4,674`
- `ambiguous: 928`
- `no_candidate_rows: 446`
- `conflicting_existing: 24`

Bounded worker proof:

- `node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --limit=500`
- `would_upsert: 354`
- `ambiguous: 127`
- `no_candidate_rows: 19`
- `errors: 0`

Bounded apply proof:

- `node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --apply --limit=100`
- `upserted: 68`
- `ambiguous: 27`
- `no_candidate_rows: 5`
- `errors: 0`

Post-pilot state:

- active JustTCG coverage: `14,210 / 22,239`
- coverage: `63.90%`
- remaining without JustTCG: `8,029`
- conflicting active external IDs: `0`
- multiple active JustTCG rows on one `card_print_id`: `0`

---

## Helper Storage Pattern

Reusable helper tables introduced:

- `public.justtcg_set_mappings`
- `public.justtcg_identity_overrides`

Why they exist:

- store integration-specific JustTCG alignment truth
- do not mutate canonical Grookai identity
- make repeatable promo / trainer-kit / suffix-model differences explicit and reviewable

---

## Hard Boundaries To Preserve

- Do not use global search results as automatic write authority.
- Do not use substring-only set alignment as automatic write authority.
- Do not auto-create override rows from guesses.
- Do not overwrite active conflicting JustTCG mappings.
- Do not let helper storage redefine canonical Grookai identity.

---

## Resumption Point

If this work resumes later, start from:

- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`
- `backend/pricing/test_justtcg_set_number_probe_v1.mjs`
- `docs/audits/JUSTTCG_DIRECT_STRUCTURE_MAPPING_AUDIT_V1.md`
- `docs/contracts/JUSTTCG_DIRECT_STRUCTURE_MAPPING_CONTRACT_V1.md`
- `supabase/migrations/20260322193000_add_justtcg_direct_structure_helpers_v1.sql`

Next valid expansion:

- add more helper set rows only for families proven by audit
- add more identity overrides only for repeatable exact-name suffix families
- keep all writes bounded and verified

Do not reopen a generic tcgplayer-first strategy for this lane.
