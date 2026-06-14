# Shining Fates Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: swsh4.5
- target_set_name: Shining Fates
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 2
- candidate_printing_rows: 4
- db_snapshot_available: true
- db_card_prints_found: 2
- db_card_printings_found: 4
- external_mappings_referencing_targets: 2
- identity_rows_referencing_targets: 2
- trait_rows_referencing_targets: 2
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 58 | Boss's Orders (Lysandre) | 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 | normal, reverse | tcdb_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 60 | Professor's Research (Professor Juniper) | 17cd3179-b844-47a8-a197-ae123ca4b583 | normal, reverse | tcdb_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 |  |  | Boss's Orders (Lysandre) | 2 | 0 |
| 17cd3179-b844-47a8-a197-ae123ca4b583 |  |  | Professor's Research (Professor Juniper) | 2 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, 'swsh4.5', '58', '58', 'Boss''s Orders (Lysandre)'),
    ('17cd3179-b844-47a8-a197-ae123ca4b583'::uuid, 'swsh4.5', '60', '60', 'Professor''s Research (Professor Juniper)')
)
select cp.id, cp.set_code as before_set_code, approved.set_code as after_set_code,
       cp.number as before_number, approved.number as after_number,
       cp.name as before_name, approved.name as after_name
from public.card_prints cp
join approved on approved.card_print_id = cp.id;
```

## Rollback Requirements

- Capture full before-state snapshot for every target card_print row before any apply.
- Capture child card_printings for every target card_print row before any apply.
- Rollback must restore only approved target row IDs and must not touch blocked remainder rows.
- Rollback must preserve vault ownership and provenance references.
- Rollback must be reviewed before any write path is executed.

## Post-Apply Verification Queries

### target_parent_rows_resolved_to_set

Expected: 2

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, '17cd3179-b844-47a8-a197-ae123ca4b583'::uuid])
  and lower(coalesce(set_code, '')) = 'swsh4.5';
```

### target_child_printing_count_unchanged

Expected: 4

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, '17cd3179-b844-47a8-a197-ae123ca4b583'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, '17cd3179-b844-47a8-a197-ae123ca4b583'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
