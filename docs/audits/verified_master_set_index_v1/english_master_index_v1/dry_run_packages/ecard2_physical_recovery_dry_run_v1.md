# Aquapolis Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: ecard2
- target_set_name: Aquapolis
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 13
- candidate_printing_rows: 26
- db_snapshot_available: true
- db_card_prints_found: 13
- db_card_printings_found: 26
- external_mappings_referencing_targets: 39
- identity_rows_referencing_targets: 13
- trait_rows_referencing_targets: 13
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 11 | Espeon | 5155d8da-c49b-43cf-8173-1e4ceca853d2 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 12 | Exeggutor | 49008b62-21be-48b8-a561-9dc0bea390e1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 13 | Exeggutor | 0f752ca1-5458-4241-af37-4a7b48b85013 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 15 | Houndoom | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 16 | Hypno | d5e3ba78-7a85-49d2-8ab0-295521652f55 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 17 | Jumpluff | 11591d3d-6574-487e-9958-f0d94bba5af4 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 18 | Jynx | 72b1ec6b-fe84-4190-a0d3-d95155296261 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 19 | Kingdra | b22dc290-dade-45f8-b488-5d3c921a79a1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 20 | Lanturn | 0e7d501c-b666-43df-9ee6-82443fcae8cb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 25 | Ninetales | a077e73a-275a-405e-85ac-24b28b6ffe3a | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 28 | Porygon2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 30 | Quagsire | 507f014e-d43d-4b24-b01f-c9635b6aba81 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 32 | Scizor | 2233732b-ced1-4f51-b45b-603c1c15a65c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| 5155d8da-c49b-43cf-8173-1e4ceca853d2 |  | 11 | Espeon | 2 | 0 |
| 49008b62-21be-48b8-a561-9dc0bea390e1 |  | 12 | Exeggutor | 2 | 0 |
| 0f752ca1-5458-4241-af37-4a7b48b85013 |  | 13 | Exeggutor | 2 | 0 |
| bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 |  | 15 | Houndoom | 2 | 0 |
| d5e3ba78-7a85-49d2-8ab0-295521652f55 |  | 16 | Hypno | 2 | 0 |
| 11591d3d-6574-487e-9958-f0d94bba5af4 |  | 17 | Jumpluff | 2 | 0 |
| 72b1ec6b-fe84-4190-a0d3-d95155296261 |  | 18 | Jynx | 2 | 0 |
| b22dc290-dade-45f8-b488-5d3c921a79a1 |  | 19 | Kingdra | 2 | 0 |
| 0e7d501c-b666-43df-9ee6-82443fcae8cb |  | 20 | Lanturn | 2 | 0 |
| a077e73a-275a-405e-85ac-24b28b6ffe3a |  | 25 | Ninetales | 2 | 0 |
| 898ad06e-aab1-4c1a-b91b-44fdd6069031 |  | 28 | Porygon2 | 2 | 0 |
| 507f014e-d43d-4b24-b01f-c9635b6aba81 |  | 30 | Quagsire | 2 | 0 |
| 2233732b-ced1-4f51-b45b-603c1c15a65c |  | 32 | Scizor | 2 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('5155d8da-c49b-43cf-8173-1e4ceca853d2'::uuid, 'ecard2', '11', '11', 'Espeon'),
    ('49008b62-21be-48b8-a561-9dc0bea390e1'::uuid, 'ecard2', '12', '12', 'Exeggutor'),
    ('0f752ca1-5458-4241-af37-4a7b48b85013'::uuid, 'ecard2', '13', '13', 'Exeggutor'),
    ('bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88'::uuid, 'ecard2', '15', '15', 'Houndoom'),
    ('d5e3ba78-7a85-49d2-8ab0-295521652f55'::uuid, 'ecard2', '16', '16', 'Hypno'),
    ('11591d3d-6574-487e-9958-f0d94bba5af4'::uuid, 'ecard2', '17', '17', 'Jumpluff'),
    ('72b1ec6b-fe84-4190-a0d3-d95155296261'::uuid, 'ecard2', '18', '18', 'Jynx'),
    ('b22dc290-dade-45f8-b488-5d3c921a79a1'::uuid, 'ecard2', '19', '19', 'Kingdra'),
    ('0e7d501c-b666-43df-9ee6-82443fcae8cb'::uuid, 'ecard2', '20', '20', 'Lanturn'),
    ('a077e73a-275a-405e-85ac-24b28b6ffe3a'::uuid, 'ecard2', '25', '25', 'Ninetales'),
    ('898ad06e-aab1-4c1a-b91b-44fdd6069031'::uuid, 'ecard2', '28', '28', 'Porygon2'),
    ('507f014e-d43d-4b24-b01f-c9635b6aba81'::uuid, 'ecard2', '30', '30', 'Quagsire'),
    ('2233732b-ced1-4f51-b45b-603c1c15a65c'::uuid, 'ecard2', '32', '32', 'Scizor')
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

Expected: 13

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['5155d8da-c49b-43cf-8173-1e4ceca853d2'::uuid, '49008b62-21be-48b8-a561-9dc0bea390e1'::uuid, '0f752ca1-5458-4241-af37-4a7b48b85013'::uuid, 'bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88'::uuid, 'd5e3ba78-7a85-49d2-8ab0-295521652f55'::uuid, '11591d3d-6574-487e-9958-f0d94bba5af4'::uuid, '72b1ec6b-fe84-4190-a0d3-d95155296261'::uuid, 'b22dc290-dade-45f8-b488-5d3c921a79a1'::uuid, '0e7d501c-b666-43df-9ee6-82443fcae8cb'::uuid, 'a077e73a-275a-405e-85ac-24b28b6ffe3a'::uuid, '898ad06e-aab1-4c1a-b91b-44fdd6069031'::uuid, '507f014e-d43d-4b24-b01f-c9635b6aba81'::uuid, '2233732b-ced1-4f51-b45b-603c1c15a65c'::uuid])
  and lower(coalesce(set_code, '')) = 'ecard2';
```

### target_child_printing_count_unchanged

Expected: 26

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['5155d8da-c49b-43cf-8173-1e4ceca853d2'::uuid, '49008b62-21be-48b8-a561-9dc0bea390e1'::uuid, '0f752ca1-5458-4241-af37-4a7b48b85013'::uuid, 'bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88'::uuid, 'd5e3ba78-7a85-49d2-8ab0-295521652f55'::uuid, '11591d3d-6574-487e-9958-f0d94bba5af4'::uuid, '72b1ec6b-fe84-4190-a0d3-d95155296261'::uuid, 'b22dc290-dade-45f8-b488-5d3c921a79a1'::uuid, '0e7d501c-b666-43df-9ee6-82443fcae8cb'::uuid, 'a077e73a-275a-405e-85ac-24b28b6ffe3a'::uuid, '898ad06e-aab1-4c1a-b91b-44fdd6069031'::uuid, '507f014e-d43d-4b24-b01f-c9635b6aba81'::uuid, '2233732b-ced1-4f51-b45b-603c1c15a65c'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['5155d8da-c49b-43cf-8173-1e4ceca853d2'::uuid, '49008b62-21be-48b8-a561-9dc0bea390e1'::uuid, '0f752ca1-5458-4241-af37-4a7b48b85013'::uuid, 'bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88'::uuid, 'd5e3ba78-7a85-49d2-8ab0-295521652f55'::uuid, '11591d3d-6574-487e-9958-f0d94bba5af4'::uuid, '72b1ec6b-fe84-4190-a0d3-d95155296261'::uuid, 'b22dc290-dade-45f8-b488-5d3c921a79a1'::uuid, '0e7d501c-b666-43df-9ee6-82443fcae8cb'::uuid, 'a077e73a-275a-405e-85ac-24b28b6ffe3a'::uuid, '898ad06e-aab1-4c1a-b91b-44fdd6069031'::uuid, '507f014e-d43d-4b24-b01f-c9635b6aba81'::uuid, '2233732b-ced1-4f51-b45b-603c1c15a65c'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
