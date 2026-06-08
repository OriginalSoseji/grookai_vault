# Platinum Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: pl1
- target_set_name: Platinum
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 9
- candidate_printing_rows: 10
- db_snapshot_available: true
- db_card_prints_found: 9
- db_card_printings_found: 10
- external_mappings_referencing_targets: 9
- identity_rows_referencing_targets: 9
- trait_rows_referencing_targets: 9
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 6 | Dialga | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 122 | Dialga G | 9d20653b-49ea-4a30-8e18-629267d7397b | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 123 | Drapion | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 124 | Giratina | 9deb3714-1f02-4eb2-a249-6b3b42a106cb | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 125 | Palkia G | 182aab06-7802-4dea-90cb-32dfc7cefaab | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 126 | Shaymin | 24bd8689-4031-40d0-8948-1d08e652ef34 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 127 | Shaymin | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| SH4 | Lotad | 74b9d351-aecc-4ff9-8ed2-958311074af7 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| SH5 | Swablu | e48e17b9-b693-4882-9e9f-d177dbce37c8 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 |  |  | Dialga | 2 | 0 |
| 9d20653b-49ea-4a30-8e18-629267d7397b |  |  | Dialga G | 1 | 0 |
| 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 |  |  | Drapion | 1 | 0 |
| 9deb3714-1f02-4eb2-a249-6b3b42a106cb |  |  | Giratina | 1 | 0 |
| 74b9d351-aecc-4ff9-8ed2-958311074af7 |  |  | Lotad | 1 | 0 |
| 182aab06-7802-4dea-90cb-32dfc7cefaab |  |  | Palkia G | 1 | 0 |
| 1f03518a-bed9-4c04-ad0c-3a5cf3008248 |  |  | Shaymin | 1 | 0 |
| 24bd8689-4031-40d0-8948-1d08e652ef34 |  |  | Shaymin | 1 | 0 |
| e48e17b9-b693-4882-9e9f-d177dbce37c8 |  |  | Swablu | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, 'pl1', '6', '6', 'Dialga'),
    ('9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, 'pl1', '122', '122', 'Dialga G'),
    ('1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, 'pl1', '123', '123', 'Drapion'),
    ('9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, 'pl1', '124', '124', 'Giratina'),
    ('182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, 'pl1', '125', '125', 'Palkia G'),
    ('24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, 'pl1', '126', '126', 'Shaymin'),
    ('1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, 'pl1', '127', '127', 'Shaymin'),
    ('74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'pl1', 'SH4', 'SH4', 'Lotad'),
    ('e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid, 'pl1', 'SH5', 'SH5', 'Swablu')
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

Expected: 9

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, '9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, '1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, '9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, '182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, '24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, '1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, '74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid])
  and lower(coalesce(set_code, '')) = 'pl1';
```

### target_child_printing_count_unchanged

Expected: 10

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, '9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, '1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, '9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, '182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, '24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, '1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, '74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, '9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, '1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, '9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, '182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, '24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, '1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, '74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
