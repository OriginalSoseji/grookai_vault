# MEP Black Star Promos Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: mep
- target_set_name: MEP Black Star Promos
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 10
- candidate_printing_rows: 10
- db_snapshot_available: true
- db_card_prints_found: 10
- db_card_printings_found: 10
- external_mappings_referencing_targets: 10
- identity_rows_referencing_targets: 10
- trait_rows_referencing_targets: 10
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 001 | Meganium | 6419894a-137f-4fc7-8db1-fa853872b190 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 002 | Inteleon | b75d4730-3c1a-42ca-9d18-e8ca736ae41f | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 003 | Alakazam | aa9f207d-c9ea-4607-bbc5-448648bca47f | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 004 | Lunatone | bf523703-271c-49fe-b8aa-c31c57cb9b32 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 005 | Drifloon | 04e533ae-dd17-478c-ab46-220859079b2c | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 006 | Drifblim | ac2b6cf7-6873-44e8-96b9-e03a179fae51 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 007 | Psyduck | 870f45fe-0680-4a92-b77b-dd03a6018bd3 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 008 | Golduck | 47f874b2-ea20-4b89-af44-085905bb1f60 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 009 | Alakazam | a3624761-be25-4841-83e4-c5936ec434fe | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |
| 010 | Riolu | 242de512-f2fb-4994-9615-6c1e2c55ac02 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| aa9f207d-c9ea-4607-bbc5-448648bca47f |  | 3 | Alakazam | 1 | 0 |
| a3624761-be25-4841-83e4-c5936ec434fe |  | 9 | Alakazam | 1 | 0 |
| ac2b6cf7-6873-44e8-96b9-e03a179fae51 |  | 6 | Drifblim | 1 | 0 |
| 04e533ae-dd17-478c-ab46-220859079b2c |  | 5 | Drifloon | 1 | 0 |
| 47f874b2-ea20-4b89-af44-085905bb1f60 |  | 8 | Golduck | 1 | 0 |
| b75d4730-3c1a-42ca-9d18-e8ca736ae41f |  | 2 | Inteleon | 1 | 0 |
| bf523703-271c-49fe-b8aa-c31c57cb9b32 |  | 4 | Lunatone | 1 | 0 |
| 6419894a-137f-4fc7-8db1-fa853872b190 |  | 1 | Meganium | 1 | 0 |
| 870f45fe-0680-4a92-b77b-dd03a6018bd3 |  | 7 | Psyduck | 1 | 0 |
| 242de512-f2fb-4994-9615-6c1e2c55ac02 |  | 10 | Riolu | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('6419894a-137f-4fc7-8db1-fa853872b190'::uuid, 'mep', '001', '001', 'Meganium'),
    ('b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, 'mep', '002', '002', 'Inteleon'),
    ('aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, 'mep', '003', '003', 'Alakazam'),
    ('bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, 'mep', '004', '004', 'Lunatone'),
    ('04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'mep', '005', '005', 'Drifloon'),
    ('ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, 'mep', '006', '006', 'Drifblim'),
    ('870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, 'mep', '007', '007', 'Psyduck'),
    ('47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, 'mep', '008', '008', 'Golduck'),
    ('a3624761-be25-4841-83e4-c5936ec434fe'::uuid, 'mep', '009', '009', 'Alakazam'),
    ('242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid, 'mep', '010', '010', 'Riolu')
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

Expected: 10

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['6419894a-137f-4fc7-8db1-fa853872b190'::uuid, 'b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, 'aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, 'bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, '04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, '47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, 'a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid])
  and lower(coalesce(set_code, '')) = 'mep';
```

### target_child_printing_count_unchanged

Expected: 10

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['6419894a-137f-4fc7-8db1-fa853872b190'::uuid, 'b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, 'aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, 'bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, '04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, '47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, 'a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['6419894a-137f-4fc7-8db1-fa853872b190'::uuid, 'b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, 'aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, 'bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, '04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, '47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, 'a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
