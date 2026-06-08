# Supreme Victors Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: pl3
- target_set_name: Supreme Victors
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 9
- candidate_printing_rows: 9
- db_snapshot_available: true
- db_card_prints_found: 9
- db_card_printings_found: 9
- external_mappings_referencing_targets: 9
- identity_rows_referencing_targets: 9
- trait_rows_referencing_targets: 9
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 141 | Absol G | 8cd92a82-149d-43b4-a7d3-d65782536182 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 142 | Blaziken FB | 79097350-eb58-44e8-bd39-3ec5f417f02b | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 143 | Charizard G | 880dc8c7-6959-4fda-b79a-32e48c684267 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 144 | Electivire FB | 29a4bca4-6264-45f6-bc24-1d5ded5520cd | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 145 | Garchomp C | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 146 | Rayquaza C | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 147 | Staraptor FB | fa6310ae-be43-4309-af1d-a5033daff2f0 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| SH8 | Relicanth | 9089264b-fd13-4261-94ac-b252ab89f6c7 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| SH9 | Yanma | e8a8c0b0-2213-4701-89a9-8926cc0d5669 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| 8cd92a82-149d-43b4-a7d3-d65782536182 |  |  | Absol G | 1 | 0 |
| 79097350-eb58-44e8-bd39-3ec5f417f02b |  |  | Blaziken FB | 1 | 0 |
| 880dc8c7-6959-4fda-b79a-32e48c684267 |  |  | Charizard G | 1 | 0 |
| 29a4bca4-6264-45f6-bc24-1d5ded5520cd |  |  | Electivire FB | 1 | 0 |
| 2c1b3125-dd67-4522-b3e0-5621c05f7a9a |  |  | Garchomp C | 1 | 0 |
| 89f61622-12a4-4861-abb3-ef3dbcaf2a86 |  |  | Rayquaza C | 1 | 0 |
| 9089264b-fd13-4261-94ac-b252ab89f6c7 |  |  | Relicanth | 1 | 0 |
| fa6310ae-be43-4309-af1d-a5033daff2f0 |  |  | Staraptor FB | 1 | 0 |
| e8a8c0b0-2213-4701-89a9-8926cc0d5669 |  |  | Yanma | 1 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, 'pl3', '141', '141', 'Absol G'),
    ('79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, 'pl3', '142', '142', 'Blaziken FB'),
    ('880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, 'pl3', '143', '143', 'Charizard G'),
    ('29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, 'pl3', '144', '144', 'Electivire FB'),
    ('2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, 'pl3', '145', '145', 'Garchomp C'),
    ('89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'pl3', '146', '146', 'Rayquaza C'),
    ('fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, 'pl3', '147', '147', 'Staraptor FB'),
    ('9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'pl3', 'SH8', 'SH8', 'Relicanth'),
    ('e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid, 'pl3', 'SH9', 'SH9', 'Yanma')
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
where id = any(array['8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, '79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, '880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, '29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, '2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, '89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, '9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid])
  and lower(coalesce(set_code, '')) = 'pl3';
```

### target_child_printing_count_unchanged

Expected: 9

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, '79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, '880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, '29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, '2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, '89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, '9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, '79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, '880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, '29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, '2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, '89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, '9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
