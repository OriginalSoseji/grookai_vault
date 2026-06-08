# Unseen Forces Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: ex10
- target_set_name: Unseen Forces
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 3
- candidate_printing_rows: 3
- db_snapshot_available: true
- db_card_prints_found: 3
- db_card_printings_found: 3
- external_mappings_referencing_targets: 3
- identity_rows_referencing_targets: 3
- trait_rows_referencing_targets: 3
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 113 | Entei ★ | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 114 | Raikou ★ | 043dbc47-0815-4ef4-b31d-2027f70f2338 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 115 | Suicune ★ | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| 2fdd39c8-7afa-4031-be84-649ac28a7b72 |  |  | Entei Star | 1 | 0 |
| 043dbc47-0815-4ef4-b31d-2027f70f2338 |  |  | Raikou Star | 1 | 0 |
| 584c31ad-d7ac-4356-b9cc-4de3152511b2 |  |  | Suicune Star | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, 'ex10', '113', '113', 'Entei ★'),
    ('043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, 'ex10', '114', '114', 'Raikou ★'),
    ('584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid, 'ex10', '115', '115', 'Suicune ★')
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

Expected: 3

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, '043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, '584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid])
  and lower(coalesce(set_code, '')) = 'ex10';
```

### target_child_printing_count_unchanged

Expected: 3

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, '043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, '584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, '043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, '584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
