# Skyridge Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: ecard3
- target_set_name: Skyridge
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 15
- candidate_printing_rows: 19
- db_snapshot_available: true
- db_card_prints_found: 15
- db_card_printings_found: 19
- external_mappings_referencing_targets: 15
- identity_rows_referencing_targets: 15
- trait_rows_referencing_targets: 15
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 4 | Articuno | d0270c83-13c1-4d2b-ae50-19830be9d134 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 6 | Crobat | 36a0af86-f863-4ff0-967c-285a67272dcb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 8 | Flareon | 6406220f-4684-4f26-a52d-310db5eb5700 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 9 | Forretress | 982bd726-548f-4e0c-9a93-c1301af1342f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H13 | Kabutops | d139fca7-558c-4dad-9a46-f94e4d45ab6b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H14 | Ledian | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H16 | Magcargo | 02a4156d-5f67-4969-8288-c440938a923c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H17 | Magcargo | bb73d56c-c46f-4341-b4a1-825a10c2406b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H18 | Magneton | 28d7a9bb-fcff-4e93-861d-d200770984d6 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H22 | Piloswine | 415065f4-68dd-44a9-a0f0-d6375e203275 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H23 | Politoed | b7c244c2-35bf-4dbd-836c-1341a777d65e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H24 | Poliwrath | e99d7d18-af64-4d34-b62c-8a795f6da2c3 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H27 | Rhydon | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H30 | Umbreon | abcf71f3-edd8-4130-aaa3-b7fecada39e2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| H31 | Vaporeon | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| d0270c83-13c1-4d2b-ae50-19830be9d134 |  | 4 | Articuno | 2 | 0 |
| 36a0af86-f863-4ff0-967c-285a67272dcb |  | 6 | Crobat | 2 | 0 |
| 6406220f-4684-4f26-a52d-310db5eb5700 |  | 8 | Flareon | 2 | 0 |
| 982bd726-548f-4e0c-9a93-c1301af1342f |  | 9 | Forretress | 2 | 0 |
| d139fca7-558c-4dad-9a46-f94e4d45ab6b |  |  | Kabutops | 1 | 0 |
| 8c78b35f-6dd0-4b12-9709-8b4198ad3089 |  |  | Ledian | 1 | 0 |
| 02a4156d-5f67-4969-8288-c440938a923c |  |  | Magcargo | 1 | 0 |
| bb73d56c-c46f-4341-b4a1-825a10c2406b |  |  | Magcargo | 1 | 0 |
| 28d7a9bb-fcff-4e93-861d-d200770984d6 |  |  | Magneton | 1 | 0 |
| 415065f4-68dd-44a9-a0f0-d6375e203275 |  |  | Piloswine | 1 | 0 |
| b7c244c2-35bf-4dbd-836c-1341a777d65e |  |  | Politoed | 1 | 0 |
| e99d7d18-af64-4d34-b62c-8a795f6da2c3 |  |  | Poliwrath | 1 | 0 |
| 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 |  |  | Rhydon | 1 | 0 |
| abcf71f3-edd8-4130-aaa3-b7fecada39e2 |  |  | Umbreon | 1 | 0 |
| 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 |  |  | Vaporeon | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('d0270c83-13c1-4d2b-ae50-19830be9d134'::uuid, 'ecard3', '4', '4', 'Articuno'),
    ('36a0af86-f863-4ff0-967c-285a67272dcb'::uuid, 'ecard3', '6', '6', 'Crobat'),
    ('6406220f-4684-4f26-a52d-310db5eb5700'::uuid, 'ecard3', '8', '8', 'Flareon'),
    ('982bd726-548f-4e0c-9a93-c1301af1342f'::uuid, 'ecard3', '9', '9', 'Forretress'),
    ('d139fca7-558c-4dad-9a46-f94e4d45ab6b'::uuid, 'ecard3', 'H13', 'H13', 'Kabutops'),
    ('8c78b35f-6dd0-4b12-9709-8b4198ad3089'::uuid, 'ecard3', 'H14', 'H14', 'Ledian'),
    ('02a4156d-5f67-4969-8288-c440938a923c'::uuid, 'ecard3', 'H16', 'H16', 'Magcargo'),
    ('bb73d56c-c46f-4341-b4a1-825a10c2406b'::uuid, 'ecard3', 'H17', 'H17', 'Magcargo'),
    ('28d7a9bb-fcff-4e93-861d-d200770984d6'::uuid, 'ecard3', 'H18', 'H18', 'Magneton'),
    ('415065f4-68dd-44a9-a0f0-d6375e203275'::uuid, 'ecard3', 'H22', 'H22', 'Piloswine'),
    ('b7c244c2-35bf-4dbd-836c-1341a777d65e'::uuid, 'ecard3', 'H23', 'H23', 'Politoed'),
    ('e99d7d18-af64-4d34-b62c-8a795f6da2c3'::uuid, 'ecard3', 'H24', 'H24', 'Poliwrath'),
    ('9a1cc452-e8b4-48bf-acc9-e592fe9cc521'::uuid, 'ecard3', 'H27', 'H27', 'Rhydon'),
    ('abcf71f3-edd8-4130-aaa3-b7fecada39e2'::uuid, 'ecard3', 'H30', 'H30', 'Umbreon'),
    ('7cbee94f-9f6a-441d-98e1-6a50da7f72d7'::uuid, 'ecard3', 'H31', 'H31', 'Vaporeon')
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

Expected: 15

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['d0270c83-13c1-4d2b-ae50-19830be9d134'::uuid, '36a0af86-f863-4ff0-967c-285a67272dcb'::uuid, '6406220f-4684-4f26-a52d-310db5eb5700'::uuid, '982bd726-548f-4e0c-9a93-c1301af1342f'::uuid, 'd139fca7-558c-4dad-9a46-f94e4d45ab6b'::uuid, '8c78b35f-6dd0-4b12-9709-8b4198ad3089'::uuid, '02a4156d-5f67-4969-8288-c440938a923c'::uuid, 'bb73d56c-c46f-4341-b4a1-825a10c2406b'::uuid, '28d7a9bb-fcff-4e93-861d-d200770984d6'::uuid, '415065f4-68dd-44a9-a0f0-d6375e203275'::uuid, 'b7c244c2-35bf-4dbd-836c-1341a777d65e'::uuid, 'e99d7d18-af64-4d34-b62c-8a795f6da2c3'::uuid, '9a1cc452-e8b4-48bf-acc9-e592fe9cc521'::uuid, 'abcf71f3-edd8-4130-aaa3-b7fecada39e2'::uuid, '7cbee94f-9f6a-441d-98e1-6a50da7f72d7'::uuid])
  and lower(coalesce(set_code, '')) = 'ecard3';
```

### target_child_printing_count_unchanged

Expected: 19

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['d0270c83-13c1-4d2b-ae50-19830be9d134'::uuid, '36a0af86-f863-4ff0-967c-285a67272dcb'::uuid, '6406220f-4684-4f26-a52d-310db5eb5700'::uuid, '982bd726-548f-4e0c-9a93-c1301af1342f'::uuid, 'd139fca7-558c-4dad-9a46-f94e4d45ab6b'::uuid, '8c78b35f-6dd0-4b12-9709-8b4198ad3089'::uuid, '02a4156d-5f67-4969-8288-c440938a923c'::uuid, 'bb73d56c-c46f-4341-b4a1-825a10c2406b'::uuid, '28d7a9bb-fcff-4e93-861d-d200770984d6'::uuid, '415065f4-68dd-44a9-a0f0-d6375e203275'::uuid, 'b7c244c2-35bf-4dbd-836c-1341a777d65e'::uuid, 'e99d7d18-af64-4d34-b62c-8a795f6da2c3'::uuid, '9a1cc452-e8b4-48bf-acc9-e592fe9cc521'::uuid, 'abcf71f3-edd8-4130-aaa3-b7fecada39e2'::uuid, '7cbee94f-9f6a-441d-98e1-6a50da7f72d7'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['d0270c83-13c1-4d2b-ae50-19830be9d134'::uuid, '36a0af86-f863-4ff0-967c-285a67272dcb'::uuid, '6406220f-4684-4f26-a52d-310db5eb5700'::uuid, '982bd726-548f-4e0c-9a93-c1301af1342f'::uuid, 'd139fca7-558c-4dad-9a46-f94e4d45ab6b'::uuid, '8c78b35f-6dd0-4b12-9709-8b4198ad3089'::uuid, '02a4156d-5f67-4969-8288-c440938a923c'::uuid, 'bb73d56c-c46f-4341-b4a1-825a10c2406b'::uuid, '28d7a9bb-fcff-4e93-861d-d200770984d6'::uuid, '415065f4-68dd-44a9-a0f0-d6375e203275'::uuid, 'b7c244c2-35bf-4dbd-836c-1341a777d65e'::uuid, 'e99d7d18-af64-4d34-b62c-8a795f6da2c3'::uuid, '9a1cc452-e8b4-48bf-acc9-e592fe9cc521'::uuid, 'abcf71f3-edd8-4130-aaa3-b7fecada39e2'::uuid, '7cbee94f-9f6a-441d-98e1-6a50da7f72d7'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
