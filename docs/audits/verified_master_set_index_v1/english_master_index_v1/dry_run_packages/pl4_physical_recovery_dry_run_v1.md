# Arceus Physical Recovery Dry-Run Package V1

This is a no-write dry-run package. It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Summary

- target_set_key: pl4
- target_set_name: Arceus
- dry_run_package_status: ready_for_review_no_write
- write_ready_now: 0
- write_allowed_from_this_package: false
- candidate_card_prints: 18
- candidate_printing_rows: 23
- db_snapshot_available: true
- db_card_prints_found: 18
- db_card_printings_found: 23
- external_mappings_referencing_targets: 18
- identity_rows_referencing_targets: 18
- trait_rows_referencing_targets: 18
- vault_items_referencing_targets: 0

## Candidate Rows

| number | card | card_print_id | finishes | sources | status |
| --- | --- | --- | --- | --- | --- |
| 1 | Charizard | a02f871c-fe3e-432b-944d-6decea0eecdf | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 6 | Mothim | 71779a8b-ee22-4892-9425-8e3da51f179a | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 9 | Swalot | 3059259e-c28b-49d6-9f31-64e178e87f28 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 12 | Zapdos | 8716f287-3497-49b2-a499-9c1e026a6a94 | holo, reverse | reverseholo_set_checklist, tcgdex | eligible_for_row_level_dry_run |
| 94 | Arceus LV.X | 460e6437-4bc8-4a1c-90fc-546481f225e2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 95 | Arceus LV.X | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 96 | Arceus LV.X | ad751d34-d43b-4644-ae2e-622725f781cd | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 97 | Gengar LV.X | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 98 | Salamence LV.X | 2fb3462d-4a19-4412-b8cd-848a669549a0 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| 99 | Tangrowth LV.X | b319332c-aea7-4f3c-ad4c-02f0874b2d60 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR2 | Arceus | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR3 | Arceus | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR4 | Arceus | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR5 | Arceus | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR7 | Arceus | 67e47461-e03c-4da3-8557-d3df639dbb98 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| AR8 | Arceus | 0db1b355-bb14-4042-8597-4afd1d9a2b77 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| SH10 | Bagon | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |
| SH11 | Ponyta | 22a0396f-a0fe-4680-8568-71246489db3c | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | eligible_for_row_level_dry_run |

## Before-State Snapshot

| card_print_id | before_set_code | before_number | before_name | child_printings | vault_items |
| --- | --- | --- | --- | --- | --- |
| 0db1b355-bb14-4042-8597-4afd1d9a2b77 |  |  | Arceus | 1 | 0 |
| 61cd00a6-3418-4980-ade8-b26c8d0b4d5c |  |  | Arceus | 1 | 0 |
| 63a0a7b8-bdfa-4a08-ad30-680bcc45802e |  |  | Arceus | 1 | 0 |
| 67e47461-e03c-4da3-8557-d3df639dbb98 |  |  | Arceus | 1 | 0 |
| 8b2c91cf-bd7c-4564-84ca-5863e1414257 |  |  | Arceus | 1 | 0 |
| cf859f9b-f1d6-41ec-9e38-c7fd27743777 |  |  | Arceus | 1 | 0 |
| 460e6437-4bc8-4a1c-90fc-546481f225e2 |  |  | Arceus LV. X | 1 | 0 |
| ad751d34-d43b-4644-ae2e-622725f781cd |  |  | Arceus LV. X | 1 | 0 |
| c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 |  |  | Arceus LV. X | 1 | 0 |
| 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda |  |  | Bagon | 1 | 0 |
| a02f871c-fe3e-432b-944d-6decea0eecdf |  |  | Charizard | 2 | 0 |
| 1352eb03-1519-4e31-b7ad-a2d4af24ef65 |  |  | Gengar LV. X | 1 | 0 |
| 71779a8b-ee22-4892-9425-8e3da51f179a |  |  | Mothim | 2 | 0 |
| 22a0396f-a0fe-4680-8568-71246489db3c |  |  | Ponyta | 1 | 0 |
| 2fb3462d-4a19-4412-b8cd-848a669549a0 |  |  | Salamence LV. X | 1 | 0 |
| 3059259e-c28b-49d6-9f31-64e178e87f28 |  |  | Swalot | 3 | 0 |
| b319332c-aea7-4f3c-ad4c-02f0874b2d60 |  |  | Tangrowth LV. X | 1 | 0 |
| 8716f287-3497-49b2-a499-9c1e026a6a94 |  |  | Zapdos | 2 | 0 |

## Planned SQL Preview

```sql
-- DRY-RUN PREVIEW ONLY. Do not execute until a separate approved apply package exists.
-- Parent recovery shape under review:
with approved(card_print_id, set_code, number, number_plain, name) as (
  values
    ('a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, 'pl4', '1', '1', 'Charizard'),
    ('71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, 'pl4', '6', '6', 'Mothim'),
    ('3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, 'pl4', '9', '9', 'Swalot'),
    ('8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, 'pl4', '12', '12', 'Zapdos'),
    ('460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, 'pl4', '94', '94', 'Arceus LV.X'),
    ('c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, 'pl4', '95', '95', 'Arceus LV.X'),
    ('ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, 'pl4', '96', '96', 'Arceus LV.X'),
    ('1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, 'pl4', '97', '97', 'Gengar LV.X'),
    ('2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, 'pl4', '98', '98', 'Salamence LV.X'),
    ('b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, 'pl4', '99', '99', 'Tangrowth LV.X'),
    ('cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, 'pl4', 'AR2', 'AR2', 'Arceus'),
    ('8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, 'pl4', 'AR3', 'AR3', 'Arceus'),
    ('61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, 'pl4', 'AR4', 'AR4', 'Arceus'),
    ('63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, 'pl4', 'AR5', 'AR5', 'Arceus'),
    ('67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, 'pl4', 'AR7', 'AR7', 'Arceus'),
    ('0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, 'pl4', 'AR8', 'AR8', 'Arceus'),
    ('502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, 'pl4', 'SH10', 'SH10', 'Bagon'),
    ('22a0396f-a0fe-4680-8568-71246489db3c'::uuid, 'pl4', 'SH11', 'SH11', 'Ponyta')
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

Expected: 18

```sql
select count(*)::int as matching_rows
from public.card_prints
where id = any(array['a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, '71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, '3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, '8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, '460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, 'c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, 'ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, '1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, '2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, 'b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, 'cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, '8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, '61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, '63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, '67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, '0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, '502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, '22a0396f-a0fe-4680-8568-71246489db3c'::uuid])
  and lower(coalesce(set_code, '')) = 'pl4';
```

### target_child_printing_count_unchanged

Expected: 23

```sql
select count(*)::int as child_printings
from public.card_printings
where card_print_id = any(array['a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, '71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, '3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, '8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, '460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, 'c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, 'ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, '1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, '2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, 'b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, 'cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, '8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, '61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, '63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, '67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, '0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, '502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, '22a0396f-a0fe-4680-8568-71246489db3c'::uuid]);
```

### unsupported_finish_rows_absent_from_package

Expected: 0 rows

```sql
select cp.id, cpr.finish_key
from public.card_prints cp
join public.card_printings cpr on cpr.card_print_id = cp.id
where cp.id = any(array['a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, '71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, '3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, '8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, '460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, 'c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, 'ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, '1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, '2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, 'b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, 'cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, '8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, '61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, '63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, '67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, '0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, '502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, '22a0396f-a0fe-4680-8568-71246489db3c'::uuid])
  and cpr.finish_key not in ('normal', 'reverse');
```

## Stop Rules

- Stop if any target row is missing from the before-state snapshot.
- Stop if child-printing count differs from package expectation.
- Stop if unsupported finishes appear in the target rows.
- Stop if identity, ownership, vault, or provenance impact cannot be explained.
- Stop if rollback artifact is incomplete.
