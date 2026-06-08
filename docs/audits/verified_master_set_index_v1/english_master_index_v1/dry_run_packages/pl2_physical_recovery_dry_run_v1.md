# Rising Rivals Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: pl2
- target_set_name: Rising Rivals
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 17
- candidate_printing_rows: 24
- db_snapshot_available: true
- db_card_prints_found: 17
- db_card_printings_found: 24
- external_mappings_referencing_targets: 17
- identity_rows_referencing_targets: 17
- trait_rows_referencing_targets: 17
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 1 | Arcanine | 2ebe059c-614e-4dd6-812f-ebf268459ce5 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 3 | Darkrai G | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 5 | Flygon | 1970689f-8f93-4148-96b2-0ed8ed149568 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 71 | Nidoran ♀ | 8c817161-627f-4ff5-aa27-127757b88213 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 72 | Nidoran ♂ | bc120b0e-4aad-47c1-989b-a733435a2000 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 95 | Team Galactic's Invention G-107 Technical Machine | f619ad6c-007c-4e4d-bea0-a4a517cffa50 | normal, reverse | tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 103 | Alakazam 4 | a1b66404-67e9-4586-8ac9-873c421da31e | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 104 | Floatzel GL | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 105 | Flygon | 7d47083d-43a4-4868-9bac-eb1deb237136 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 106 | Gallade 4 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 107 | Hippowdon | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 108 | Infernape 4 | a719dd63-f527-4edf-8c8e-e77bac65a715 | holo | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 110 | Mismagius GL | 26d6335d-9483-4de2-8b1b-771c43ab31cb | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| 111 | Snorlax | 25c91739-b09a-4360-94e5-9a8b1ed43755 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | eligible_for_row_level_dry_run |
| RT2 | Frost Rotom | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| RT4 | Mow Rotom | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| RT6 | Charon's Choice | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f | reverse | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| a1b66404-67e9-4586-8ac9-873c421da31e |  |  | Alakazam 4 | 1 | 0 |
| 2ebe059c-614e-4dd6-812f-ebf268459ce5 |  |  | Arcanine | 2 | 0 |
| 0a14f347-5dd0-425a-9c9c-ffd134a9de4f |  |  | Charon's Choice | 1 | 0 |
| 9d6eb3c7-dc61-4543-b436-a67fd23ba16c |  |  | Darkrai G | 2 | 0 |
| 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 |  |  | Floatzel GL | 1 | 0 |
| 1970689f-8f93-4148-96b2-0ed8ed149568 |  |  | Flygon | 3 | 0 |
| 7d47083d-43a4-4868-9bac-eb1deb237136 |  |  | Flygon | 1 | 0 |
| f5ada689-45c1-4b23-ac62-6a9f0bc11c97 |  |  | Frost Rotom | 1 | 0 |
| 60789fd6-a0bb-49cd-848f-1ba462f4e965 |  |  | Gallade 4 | 1 | 0 |
| 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae |  |  | Hippowdon | 1 | 0 |
| a719dd63-f527-4edf-8c8e-e77bac65a715 |  |  | Infernape 4 | 1 | 0 |
| 26d6335d-9483-4de2-8b1b-771c43ab31cb |  |  | Mismagius GL | 1 | 0 |
| 949f5c1d-6d29-41cd-91c9-0be81e5360c5 |  |  | Mow Rotom | 1 | 0 |
| 8c817161-627f-4ff5-aa27-127757b88213 |  |  | Nidoran♀ | 2 | 0 |
| bc120b0e-4aad-47c1-989b-a733435a2000 |  |  | Nidoran♂ | 2 | 0 |
| 25c91739-b09a-4360-94e5-9a8b1ed43755 |  |  | Snorlax | 1 | 0 |
| f619ad6c-007c-4e4d-bea0-a4a517cffa50 |  |  | Team Galactic's Invention G-107 Technical Machine | 2 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, 'pl2', '1', '1', 'Arcanine'),
    ('9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, 'pl2', '3', '3', 'Darkrai G'),
    ('1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, 'pl2', '5', '5', 'Flygon'),
    ('8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'pl2', '71', '71', 'Nidoran ♀'),
    ('bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, 'pl2', '72', '72', 'Nidoran ♂'),
    ('f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'pl2', '95', '95', 'Team Galactic''s Invention G-107 Technical Machine'),
    ('a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, 'pl2', '103', '103', 'Alakazam 4'),
    ('5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, 'pl2', '104', '104', 'Floatzel GL'),
    ('7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, 'pl2', '105', '105', 'Flygon'),
    ('60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, 'pl2', '106', '106', 'Gallade 4'),
    ('2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'pl2', '107', '107', 'Hippowdon'),
    ('a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, 'pl2', '108', '108', 'Infernape 4'),
    ('26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, 'pl2', '110', '110', 'Mismagius GL'),
    ('25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'pl2', '111', '111', 'Snorlax'),
    ('f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, 'pl2', 'RT2', 'RT2', 'Frost Rotom'),
    ('949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, 'pl2', 'RT4', 'RT4', 'Mow Rotom'),
    ('0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid, 'pl2', 'RT6', 'RT6', 'Charon''s Choice')
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

Expected: 17

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, '9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, '1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, '8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, 'f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, '5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, '7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, '60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, '2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, '26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, '25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, '949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, '0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid])
  and lower(coalesce(set_code, '')) = 'pl2';
```

### target_child_printing_count_unchanged

Expected: 24

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, '9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, '1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, '8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, 'f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, '5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, '7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, '60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, '2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, '26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, '25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, '949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, '0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, '9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, '1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, '8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, 'f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, '5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, '7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, '60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, '2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, '26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, '25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, '949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, '0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
