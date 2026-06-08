# Stormfront Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: dp7
- target_set_name: Stormfront
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 8
- candidate_printing_rows: 10
- db_snapshot_available: true
- db_card_prints_found: 8
- db_card_printings_found: 10
- external_mappings_referencing_targets: 8
- identity_rows_referencing_targets: 8
- trait_rows_referencing_targets: 8
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 2 | Empoleon | 62f77935-5749-4d26-87e6-06bbca565b22 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 3 | Infernape | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 96 | Dusknoir | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 97 | Heatran | 7c211bf2-ab9e-489d-842f-65c896270783 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 98 | Machamp | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 99 | Raichu | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 100 | Regigigas | 687811f7-e3d2-41bb-b37d-1e73882551d2 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| SH1 | Drifloon | e8444009-0c47-48a6-af07-f5b450ac0082 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| e8444009-0c47-48a6-af07-f5b450ac0082 |  |  | Drifloon | 1 | 0 |
| d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff |  |  | Dusknoir | 1 | 0 |
| 62f77935-5749-4d26-87e6-06bbca565b22 |  |  | Empoleon | 2 | 0 |
| 7c211bf2-ab9e-489d-842f-65c896270783 |  |  | Heatran | 1 | 0 |
| 665ee2b0-4a22-43d5-bf8e-8ff22a990384 |  |  | Infernape | 2 | 0 |
| 6f49c231-0a53-4c0c-9db1-6d4c36aa460e |  |  | Machamp | 1 | 0 |
| 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 |  |  | Raichu | 1 | 0 |
| 687811f7-e3d2-41bb-b37d-1e73882551d2 |  |  | Regigigas | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('62f77935-5749-4d26-87e6-06bbca565b22'::uuid, 'dp7', '2', '2', 'Empoleon'),
    ('665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'dp7', '3', '3', 'Infernape'),
    ('d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, 'dp7', '96', '96', 'Dusknoir'),
    ('7c211bf2-ab9e-489d-842f-65c896270783'::uuid, 'dp7', '97', '97', 'Heatran'),
    ('6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, 'dp7', '98', '98', 'Machamp'),
    ('7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, 'dp7', '99', '99', 'Raichu'),
    ('687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'dp7', '100', '100', 'Regigigas'),
    ('e8444009-0c47-48a6-af07-f5b450ac0082'::uuid, 'dp7', 'SH1', 'SH1', 'Drifloon')
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

Expected: 8

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['62f77935-5749-4d26-87e6-06bbca565b22'::uuid, '665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'd45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, '7c211bf2-ab9e-489d-842f-65c896270783'::uuid, '6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, '7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, '687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'e8444009-0c47-48a6-af07-f5b450ac0082'::uuid])
  and lower(coalesce(set_code, '')) = 'dp7';
```

### target_child_printing_count_unchanged

Expected: 10

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['62f77935-5749-4d26-87e6-06bbca565b22'::uuid, '665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'd45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, '7c211bf2-ab9e-489d-842f-65c896270783'::uuid, '6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, '7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, '687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'e8444009-0c47-48a6-af07-f5b450ac0082'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['62f77935-5749-4d26-87e6-06bbca565b22'::uuid, '665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'd45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, '7c211bf2-ab9e-489d-842f-65c896270783'::uuid, '6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, '7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, '687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'e8444009-0c47-48a6-af07-f5b450ac0082'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
