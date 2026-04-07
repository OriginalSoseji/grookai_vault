# NUMERIC_PROMOTION_FOR_2021SWSH_V1

## Context

`2021swsh` was identified by the current remaining-identity global audit as a clean numeric-only promotion surface.

Frozen audit truth before apply:

- classification: `NUMERIC_PROMOTION`
- unresolved rows: `25`
- numeric rows: `25`
- non-numeric rows: `0`

This surface required no duplicate collapse, family realignment, suffix contract, or namespace correction.

## Why 2021swsh Is Numeric-Promotion Only

The unresolved parents already existed, but they lacked public `gv_id` values.

The set stayed promotion-safe because:

- all `25` candidates were numeric-only
- canonical base lane count was `0`
- exact canonical overlap count was `0`
- `printed_set_abbrev` was stable across all rows: `MCD`
- proposed builder-derived `gv_id` values were unique inside the candidate pool
- proposed builder-derived `gv_id` values were collision-free against live catalog rows

## Problem

Existing `card_prints` parents for `2021swsh` were not publicly routable because `card_prints.gv_id` was null, even though identity proof was already sufficient to mint canonical public IDs in place.

## Decision

Assign deterministic `gv_id` values directly onto the existing `card_prints.id` parents for `2021swsh`.

No inserts.
No `card_print_identity` rewrites.
No unrelated set mutation.

## Proof

Dry-run runner:

- `backend/identity/2021swsh_numeric_promotion_apply_v1.mjs --dry-run`

Dry-run proof:

- `candidate_count = 25`
- `all_candidates_parent_gvid_null = true`
- `numeric_candidate_count = 25`
- `non_numeric_candidate_count = 0`
- `distinct_set_code_identity_values = ['2021swsh']`
- `distinct_printed_number_count = 25`
- `printed_number_duplicate_groups = 0`
- `printed_set_abbrev_values = ['MCD']`
- `printed_total_values = [25]`
- `canonical_base_count = 0`
- `exact_canonical_overlap_count = 0`
- `candidate_distinct_card_print_id_count = 25`
- `candidate_distinct_proposed_gvid_count = 25`
- `internal_proposed_gvid_collision_count = 0`
- `live_gvid_collision_count = 0`
- `safe_to_apply = true`

## GV_ID Derivation Rule Used

Source of truth:

- `backend/warehouse/buildCardPrintGvIdV1.mjs`

Observed live builder outputs for this set:

- `1 -> GV-PK-MCD-1`
- `13 -> GV-PK-MCD-13`
- `25 -> GV-PK-MCD-25`

Applied rule:

- prefix: `GV-PK`
- set token: `MCD`
- number token: numeric `printed_number`
- no suffix
- no descriptor
- no family qualifier

## Collision Audit Results

Pre-apply collision audit:

- internal candidate collision count: `0`
- live `card_prints.gv_id` collision count: `0`
- canonical overlap count: `0`

Post-apply collision audit:

- live `gv_id` collision count in promoted scope: `0`

## Risks

The runner remained fail-closed on:

- candidate count drift away from `25`
- non-numeric candidate drift
- missing or unstable `printed_set_abbrev`
- canonical overlap drift
- internal proposed-`gv_id` collision
- live `gv_id` collision
- attempted overwrite of a non-null parent `gv_id`
- rowcount mismatch during update

## Verification Plan

The runner verified:

- `promoted_total = 25`
- `remaining_null_gvid_in_2021swsh = 0`
- `live_gvid_collision_count = 0`
- active identity total unchanged
- same `card_prints.id` preserved
- same active `card_print_identity` preserved
- promoted rows became route-resolvable because `card_prints.gv_id` now exists on all `25` promoted parents
- unrelated sets unaffected by scope

## Pre-Apply Backups

Created before update:

- `backups/2021swsh_preapply_schema.sql`
- `backups/2021swsh_preapply_data.sql`

Backup row counts:

- `card_prints = 25`
- `card_print_identity = 25`

## Post-Apply Truth

Apply runner:

- `backend/identity/2021swsh_numeric_promotion_apply_v1.mjs --apply`

Committed result:

- `promoted_total = 25`
- `remaining_null_gvid_in_2021swsh = 0`
- `active_identity_total_before = 10613`
- `active_identity_total_after = 10613`
- `active_identity_on_candidate_before = 25`
- `active_identity_on_candidate_after = 25`
- `route_resolvable_candidate_count = 25`
- `promoted_rows_with_expected_gvid_count = 25`
- `same_card_prints_id_preserved = true`
- `same_card_print_identity_preserved = true`
- `unrelated_sets_affected = false`

## Sample Promoted Rows

- first numbered card:
  - `d34033e2-a8e8-4e72-b1e9-2033445e8f00`
  - `Bulbasaur`
  - `1`
  - `GV-PK-MCD-1`
- middle numbered card:
  - `43d5432d-7152-40de-9660-dd2893847b8a`
  - `Tepig`
  - `13`
  - `GV-PK-MCD-13`
- last numbered card:
  - `be9b1912-c62b-46d9-9081-acaefe8cf0c2`
  - `Pikachu`
  - `25`
  - `GV-PK-MCD-25`

## Status

PROMOTION COMPLETED SUCCESSFULLY
