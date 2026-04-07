# NUMERIC_PROMOTION_FOR_2011BW_V1

## Context

`2011bw` entered this phase from the global remaining-surface audit as a numeric-promotion candidate:

- unresolved rows = `12`
- numeric rows = `12`
- non-numeric rows = `0`

The intended execution mode was the same in-place promotion pattern already used for `2021swsh`.

## Why 2011bw Looked Promotion-Safe

The unresolved `2011bw` parents satisfied the numeric-only surface assumptions:

- all `12` rows were numeric-only
- printed numbers were unique
- canonical base lane count was `0`
- exact same-card canonical overlap count was `0`
- `printed_set_abbrev` was stable across all rows: `MCD`

## Problem

The unresolved `2011bw` parents still have no public `gv_id`, but the builder-derived public IDs they would need are already occupied by live rows outside the target set.

That means this is not a lawful promotion surface under the current live namespace.

## Decision

Do not apply.

The runner stopped at dry-run because the hard gate for collision-free proposed `gv_id` values failed.

## Proof

Dry-run output:

- `candidate_count = 12`
- `all_candidates_parent_gvid_null = true`
- `numeric_candidate_count = 12`
- `non_numeric_candidate_count = 0`
- `distinct_set_code_identity_values = ['2011bw']`
- `distinct_printed_number_count = 12`
- `printed_number_duplicate_groups = 0`
- `printed_set_abbrev_values = ['MCD']`
- `printed_total_values = [12]`
- `canonical_base_count = 0`
- `exact_canonical_overlap_count = 0`
- `candidate_distinct_card_print_id_count = 12`
- `candidate_distinct_proposed_gvid_count = 12`
- `internal_proposed_gvid_collision_count = 0`
- `live_gvid_collision_count = 12`
- `safe_to_apply = false`
- `stop_reasons = ['LIVE_GVID_COLLISIONS:12']`

## GV_ID Derivation Rule Used

Source of truth:

- `backend/warehouse/buildCardPrintGvIdV1.mjs`

Observed builder outputs for this surface:

- `1 -> GV-PK-MCD-1`
- `7 -> GV-PK-MCD-7`
- `12 -> GV-PK-MCD-12`

## Collision Audit Results

All `12` proposed `GV-PK-MCD-*` values already existed live on other rows:

| proposed gv_id | live row id | live set_code | live name |
| --- | --- | --- | --- |
| `GV-PK-MCD-1` | `d34033e2-a8e8-4e72-b1e9-2033445e8f00` | `null` | Bulbasaur |
| `GV-PK-MCD-7` | `cb3e5ff6-ace4-44ca-99e0-91098dff5bba` | `null` | Rowlet |
| `GV-PK-MCD-12` | `cefedf7b-f1c0-42f7-af7d-e6e9279358f3` | `null` | Chimchar |

Full collision count:

- live `card_prints.gv_id` collision count = `12`

This is a hard stop because promotion would overwrite the live public namespace.

## Risks

The blocking risk is not candidate drift inside `2011bw`; it is live namespace occupancy:

- current `GV-PK-MCD-*` namespace is already owned by other rows
- promoting `2011bw` into that namespace would create immediate public-ID collisions
- any apply would be unsafe until the namespace conflict is resolved by a separate identity decision

## Verification Plan

The runner was designed to verify:

- `promoted_total = 12`
- `remaining_null_gvid_in_2011bw = 0`
- `live_gvid_collision_count = 0`
- active identity total unchanged
- same `card_prints.id` preserved
- same active `card_print_identity` preserved
- unrelated sets unaffected

That verification never proceeded to apply because the dry-run failed closed before backups or updates.

## Post-Apply Truth

No apply was executed.

- backups created = `0`
- promoted total = `0`
- remaining null `gv_id` in `2011bw` = unchanged
- live collision count = `12`

## Sample Candidate Rows

These are the blocked promotion candidates and their proposed IDs:

- first numbered card:
  - `99555f58-22ae-44ce-a4b3-57a2e41635ac`
  - `Snivy`
  - `1`
  - `GV-PK-MCD-1`
- middle numbered card:
  - `a357528d-c789-416d-8b65-84edf7cacb9d`
  - `Munna`
  - `7`
  - `GV-PK-MCD-7`
- last numbered card:
  - `9f3878be-5c08-47ed-bf7c-101c052c9eca`
  - `Audino`
  - `12`
  - `GV-PK-MCD-12`

## Status

STOPPED ON HARD GATE FAILURE
