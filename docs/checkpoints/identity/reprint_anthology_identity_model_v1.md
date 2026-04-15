# REPRINT_ANTHOLOGY_IDENTITY_MODEL_V1

## Context

- `cel25c` proved that some sets lawfully reuse visible printed numbers across different cards.
- Hidden set-specific uniqueness carve-outs are fragile.
- Identity behavior needs to be declared explicitly at the set level rather than inferred from one-off index predicates.

## Problem

- Current uniqueness enforcement still depends on a `cel25c` exception.
- That exception is not reusable and is not self-describing in schema.
- Future anthology / reprint sets would otherwise accumulate more hard-coded exceptions.

## Decision

- Add explicit `identity_model` to `public.sets`.
- Drive uniqueness policy from declared set behavior.
- Mark `cel25c` as `reprint_anthology`.
- Keep all other existing sets on `standard` unless explicitly audited.

## Invariants

- No card identity truth changes in this task.
- No row deletions.
- No set membership changes.
- `cel25c` remains valid.
- Standard-set uniqueness protection remains active.
- Anthology-set uniqueness is enforced through print-identity semantics.

## REPRINT_ANTHOLOGY_SET_CONTRACT_V1

- `R1.` Some sets lawfully reuse visible printed numbers across different cards.
- `R2.` Such sets must be explicitly declared with `identity_model = 'reprint_anthology'`.
- `R3.` `standard` sets continue to use number / variant-based uniqueness rules.
- `R4.` `reprint_anthology` sets must not rely on `(set_id, number_plain)` uniqueness.
- `R5.` `reprint_anthology` sets must enforce uniqueness through `print_identity_key`-driven semantics.
- `R6.` Set behavior must be explicit in schema, not hidden inside ad hoc set-code exceptions.
- `R7.` New anthology sets must be opted in deliberately after audit.
- `R8.` This task does not widen anthology classification beyond proven sets.

## Pre-Apply Snapshot

- Artifact: `docs/checkpoints/identity/artifacts/reprint_anthology_identity_model_pre_apply.json`
- `public.sets` had no `identity_model` column.
- `public.card_prints` had no helper identity-model column.
- Live identity enforcement before this task was:
  - `uq_card_prints_identity_v2_non_cel25c`
    - `unique (set_id, number_plain, coalesce(printed_identity_modifier, ''), coalesce(variant_key, ''))`
    - predicate included a raw `set_id <> '3be64773-d30e-48af-af8c-3563b57e5e4a'`
  - `uq_card_prints_identity_v3_print_identity`
    - `unique (set_id, number_plain, print_identity_key, coalesce(variant_key, ''))`
    - applied to every row with non-null `print_identity_key`
- Snapshot counts:
  - `sets.identity_model_exists = false`
  - `card_prints.set_identity_model_exists = false`
  - `cel25c` row count = `25`
  - global `print_identity_key` coverage = `2726 / 24648` rows
  - `cel25c` `print_identity_key` coverage = `25 / 25`
- Dependency audit confirmed the raw carve-out name only appeared in:
  - `supabase/migrations/20260415173000_repair_cel25c_multi_origin_reprint_lane_v1.sql`
  - `docs/checkpoints/identity/cel25c_multi_origin_reprint_lane_repair_v1.md`
- Broader duplicate-number sets exist, but only `cel25c` currently had a proven lawful same-number coexistence model that required declared anthology behavior in V1. Other sets remained valid under the standard surface already enforced by V2.

## Enforcement Design

- Chosen design: explicit declared model on `public.sets`, plus a deterministic denormalized helper on `public.card_prints`.
- Added:
  - `public.sets.identity_model text not null default 'standard'`
  - `public.card_prints.set_identity_model text not null default 'standard'`
- Allowed values in V1:
  - `standard`
  - `reprint_anthology`
- Deterministic sync path:
  - `public.resolve_set_identity_model(uuid)`
  - `public.card_prints_assign_set_identity_model()` trigger function
  - `public.propagate_set_identity_model_to_card_prints()` trigger function
- Governing partial unique indexes after the change:
  - `uq_card_prints_identity_v2_standard_sets`
    - `unique (set_id, number_plain, coalesce(printed_identity_modifier, ''), coalesce(variant_key, ''))`
    - predicate: `set_identity_model = 'standard'`
  - `uq_card_prints_identity_v3_print_identity`
    - `unique (set_id, number_plain, print_identity_key, coalesce(variant_key, ''))`
    - predicate: `set_identity_model = 'reprint_anthology'`
- Supporting guard:
  - `ck_card_prints_reprint_anthology_requires_pik_v1`
  - anthology rows cannot exist without nonblank `print_identity_key`
- Why this path was chosen:
  - partial indexes cannot predicate across `public.sets`
  - the helper field keeps enforcement DB-native and explicit
  - the trigger logic is deterministic and limited to mirroring declared set behavior
  - no raw set-code or set-id carve-out remains in the governing index predicates

## Dry-Run Proof

- Artifact: `docs/checkpoints/identity/artifacts/reprint_anthology_identity_model_dry_run.json`
- Projected prechecks on the live remote data:
  - `standard_duplicate_groups = 0`
  - `reprint_anthology_duplicate_groups = 0`
  - `reprint_anthology_missing_print_identity_rows = 0`
  - `cel25c_row_count = 25`
- Transaction rehearsal:
  - migration executed successfully inside a rollback transaction
  - `sets.identity_model` and `card_prints.set_identity_model` existed in the rehearsal state
  - only allowed values were present: `standard`, `reprint_anthology`
  - `cel25c_identity_model = reprint_anthology`
  - `other_anthology_set_count = 0`
  - rehearsed indexes were:
    - `uq_card_prints_identity_v2_standard_sets`
    - `uq_card_prints_identity_v3_print_identity`
  - `raw_cel25c_index_dependency_count = 0`
  - `helper_mismatch_count = 0`
- Replay proof before remote apply:
  - first local reset exposed a replay bug: the migration assumed `cel25c` existed even on sparse reset databases
  - migration was corrected to skip the `cel25c` anthology assertion when the canonical set row is absent
  - rerun result: `supabase db reset --local --no-seed` passed cleanly

## Apply Summary

- Applied migration:
  - `supabase/migrations/20260415203000_reprint_anthology_identity_model_v1.sql`
- Remote apply command:
  - `supabase db push`
- Applied changes:
  - added `public.sets.identity_model`
  - added `public.card_prints.set_identity_model`
  - backfilled existing sets to `standard`
  - marked `cel25c` as `reprint_anthology`
  - backfilled `card_prints.set_identity_model` from the owning set
  - added deterministic sync functions and triggers
  - dropped `uq_card_prints_identity_v2_non_cel25c`
  - created `uq_card_prints_identity_v2_standard_sets`
  - recreated `uq_card_prints_identity_v3_print_identity` with anthology-only predicate
- Scope remained structural:
  - no `card_prints` identity truth rows were mutated in this task
  - no row deletions
  - no set membership changes

## Verification

- Artifact: `docs/checkpoints/identity/artifacts/reprint_anthology_identity_model_post_apply.json`
- Remote schema state:
  - `sets.identity_model` exists, `NOT NULL`, default `'standard'`
  - `card_prints.set_identity_model` exists, `NOT NULL`, default `'standard'`
  - constraints present:
    - `ck_sets_identity_model_v1`
    - `ck_card_prints_set_identity_model_v1`
    - `ck_card_prints_reprint_anthology_requires_pik_v1`
- Remote backfill state:
  - `reprint_anthology` sets = `1`
  - `standard` sets = `247`
  - `cel25c.identity_model = reprint_anthology`
- Enforcement state:
  - active identity indexes now are:
    - `uq_card_prints_identity_v2_standard_sets`
    - `uq_card_prints_identity_v3_print_identity`
  - `raw_cel25c_index_dependency_count = 0`
  - `helper_mismatch_count = 0`
- `cel25c` safety:
  - row count = `25`
  - anthology rows = `25`
  - `print_identity_key` rows = `25`
  - lawful duplicate `15` rows still present = `4`
  - duplicate anthology `print_identity_key` groups = `0`
- Standard-set safety:
  - duplicate groups under the standard uniqueness surface = `0`
- Replay / remote hygiene:
  - `supabase db reset --local --no-seed` passed after the fix
  - `supabase migration list --linked` aligned through `20260415203000`
  - `supabase db push --dry-run` returned `Remote database is up to date`

## Follow-Up

- TODO: Audit for future anthology candidates and formal onboarding flow.
