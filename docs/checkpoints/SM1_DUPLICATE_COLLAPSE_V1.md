# SM1_DUPLICATE_COLLAPSE_V1

## 1. Context

The global remaining identity audit classified `sm1` as `CLASS A — DUPLICATE COLLAPSE` with exactly one active unresolved null-`gv_id` parent row remaining.

This phase executed the single lawful action for that surface:

- preserve the canonical `sm1` parent and its `gv_id`
- repoint dependent FK rows from the duplicate null lane
- delete the duplicate parent only after zero-reference proof

Artifacts created for this phase:

- `backend/identity/sm1_duplicate_collapse_apply_v1.mjs`
- `docs/sql/sm1_duplicate_collapse_dry_run_v1.sql`
- `backups/sm1_duplicate_collapse_preapply_schema.sql`
- `backups/sm1_duplicate_collapse_preapply_data.sql`

## 2. Problem

One `sm1` parent remained unresolved with `card_prints.gv_id is null`. The row was not a promotion case and not a family-lane case. It had to prove as a deterministic duplicate of an existing canonical `sm1` row before any FK movement could occur.

## 3. Audit Proof

Dry-run preconditions all passed:

- `unresolved_count = 1`
- `canonical_target_count = 172`
- `canonical_match_count = 1`
- `distinct_candidate_new_count = 1`
- `map_count = 1`
- `distinct_old_count = 1`
- `distinct_new_count = 1`
- `multiple_match_old_count = 0`
- `multiple_match_new_count = 0`
- `unmatched_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`

Live scope remained isolated to `sm1`:

- old parent FK usage existed only in `card_print_identity`, `card_print_traits`, `card_printings`, and `external_mappings`
- `vault_items` and every other FK surface referencing `card_prints.id` had `0` rows for the old parent

## 4. Collapse Map Proof

Frozen 1:1 collapse map:

- old parent: `40e92a50-96fb-4ed2-9ced-b02cce258442`
- old name: `Eevee`
- old printed number: `101`
- old set_code: `null`

- canonical parent: `776d284f-940d-4425-b890-6761f1b936ab`
- canonical name: `Eevee`
- canonical number: `101a`
- canonical set_code: `sm1`
- canonical `gv_id`: `GV-PK-SUM-101A`

Normalized identity proof:

- `old_normalized_digits = 101`
- `new_normalized_digits = 101`
- `old_normalized_name = eevee`
- `new_normalized_name = eevee`

The duplicate proof therefore relied on normalized digits plus normalized name, not exact collector-number equality.

## 5. FK Movement Summary

Pre-apply live FK counts on the old parent:

- `card_print_identity = 1`
- `card_print_traits = 1`
- `card_printings = 3`
- `external_mappings = 1`
- `vault_items = 0`

Collision audit passed:

- `trait_target_key_conflict_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `printing_finish_conflict_count = 3`
- `printing_mergeable_metadata_only_count = 3`
- `printing_conflicting_non_identical_count = 0`
- `external_mapping_conflict_count = 0`
- `target_identity_row_count = 0`

Applied movement:

- `updated_identity_rows = 1`
- `moved_traits = 1`
- `deleted_redundant_traits = 0`
- `merged_printing_metadata_rows = 3`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 3`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`

## 6. Risks

The only meaningful structural risk was that the canonical target number was `101a` while the unresolved printed number was `101`. That risk was discharged by the hard gate requiring:

- one unresolved row only
- one canonical target only
- exact normalized-digit proof
- exact normalized-name proof
- zero multiple matches
- zero unmatched rows

The second live risk was printing duplication on finish keys. That risk was discharged by treating the overlap as metadata merge only:

- the canonical parent already had `holo`, `normal`, and `reverse`
- the duplicate parent carried the missing `tcgdex` provenance fields for those finishes
- the runner merged that metadata onto the canonical rows and then deleted the redundant old rows

## 7. Verification Results

Backup completed before apply:

- `backups/sm1_duplicate_collapse_preapply_schema.sql`
- `backups/sm1_duplicate_collapse_preapply_data.sql`

Post-apply validation passed:

- `deleted_old_parent_rows = 1`
- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_target_count = 172`
- `target_any_identity_rows = 1`
- `target_active_identity_rows = 1`
- zero FK references remained to the old parent across all referencing tables

## 8. Final Post-Apply Truth

The duplicate null-lane `sm1` parent was removed safely.

Sample before/after:

- before: `40e92a50-96fb-4ed2-9ced-b02cce258442` / `Eevee` / printed `101` / `gv_id = null`
- after: `776d284f-940d-4425-b890-6761f1b936ab` / `Eevee` / canonical `101a` / `gv_id = GV-PK-SUM-101A`

Canonical target state after collapse:

- target parent still exists and retained `GV-PK-SUM-101A`
- active identity rows on target: `1`
- traits on target now include both:
  - `pokemon:legal / expanded / pokemonapi`
  - `pokemon:stats / tcgdex / tcgdex`
- printings on target now have merged provenance for `holo`, `normal`, and `reverse`:
  - `provenance_source = tcgdex`
  - `provenance_ref = sm1-101`
  - `created_by = printing_ingestion_v2`
- external mappings on target now include the moved `tcgdex / sm1-101` row in addition to the pre-existing canonical mappings

## Status

APPLY COMPLETE
