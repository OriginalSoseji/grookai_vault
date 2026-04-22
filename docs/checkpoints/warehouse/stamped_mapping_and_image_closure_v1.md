# STAMPED_MAPPING_AND_IMAGE_CLOSURE_V1

## Context

This pass closed the exact 25 promoted stamped rows from the first stamped-ready warehouse batch. Scope stayed bounded to:

- source-backed JustTCG mapping for the exact 25 promoted stamped rows
- representative image coverage for the exact 25 promoted stamped rows

No canon promotion, pricing closure, global mapping repair, or global image repair ran in this pass.

## Exact 25-row Batch Identity

| # | Name | Printed Number | Variant Key | Stamp Label | Effective Set Code | Card Print ID |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Arcanine | 12/99 | prerelease_stamp | Prerelease Stamp | bw4 | e58b7b0f-09e0-4d54-a9c0-3a865d6bed02 |
| 2 | Arcanine | 12/99 | staff_prerelease_stamp | Staff Prerelease Stamp | bw4 | b64e200c-3c6d-436a-8581-799fac1ef104 |
| 3 | Darmanitan | 25/114 | prerelease_stamp | Prerelease Stamp | bw1 | 7184d1f1-cfbe-471d-a0d3-e8b8fc491dab |
| 4 | Darmanitan | 25/114 | staff_prerelease_stamp | Staff Prerelease Stamp | bw1 | 88eef516-13c1-4e84-bf4e-d09925994a70 |
| 5 | Victini | 43/101 | prerelease_stamp | Prerelease Stamp | bw3 | e494bcfc-6812-408d-aa2c-1712cd44d0d1 |
| 6 | Victini | 43/101 | staff_prerelease_stamp | Staff Prerelease Stamp | bw3 | 8519c026-803d-45ad-9fec-9753007cab6d |
| 7 | Gigalith | 53/98 | prerelease_stamp | Prerelease Stamp | bw2 | 9bc5a43e-13de-411d-a903-719cd149f746 |
| 8 | Tropical Beach | BW28 | worlds_11_staff_stamp | Worlds 11 Staff Stamp | bwp | dcdddef8-1f41-4545-9562-d725395261c6 |
| 9 | Tropical Beach | BW28 | worlds_11_top_16_stamp | Worlds 11 Top 16 Stamp | bwp | 3fb6b255-a389-4d58-a6eb-8f9b6b336a43 |
| 10 | Victory Cup | BW29 | battle_road_autumn_2011_3rd_place_stamp | Battle Road Autumn 2011 3rd Place Stamp | bwp | 0723d8a3-8ae2-4cdc-86e7-cfea1ee9557a |
| 11 | Victory Cup | BW29 | battle_road_autumn_2012_3rd_place_stamp | Battle Road Autumn 2012 3rd Place Stamp | bwp | 7dc6496f-4c93-46c5-aee8-7163ce8a0718 |
| 12 | Victory Cup | BW29 | battle_road_spring_2012_3rd_place_stamp | Battle Road Spring 2012 3rd Place Stamp | bwp | 4c933142-8034-4909-a821-c146bdd5aae8 |
| 13 | Victory Cup | BW29 | battle_road_spring_2013_3rd_place_stamp | Battle Road Spring 2013 3rd Place Stamp | bwp | e46196e1-0fa0-48d2-a203-c436dd60bcb9 |
| 14 | Victory Cup | BW30 | battle_road_autumn_2011_2nd_place_stamp | Battle Road Autumn 2011 2nd Place Stamp | bwp | 6d6ad883-9cd6-4d42-a62e-795f39bad9b4 |
| 15 | Victory Cup | BW30 | battle_road_autumn_2012_2nd_place_stamp | Battle Road Autumn 2012 2nd Place Stamp | bwp | 457d6990-d464-4bd0-8dad-7c9af6982027 |
| 16 | Victory Cup | BW30 | battle_road_spring_2012_2nd_place_stamp | Battle Road Spring 2012 2nd Place Stamp | bwp | 80e04978-8bc8-4516-a805-d5a978c75366 |
| 17 | Victory Cup | BW30 | battle_road_spring_2013_2nd_place_stamp | Battle Road Spring 2013 2nd Place Stamp | bwp | 27d6e789-43be-4702-a1e0-75e399681aff |
| 18 | Victory Cup | BW31 | battle_road_autumn_2011_1st_place_stamp | Battle Road Autumn 2011 1st Place Stamp | bwp | 3e03d567-160a-427a-9b8c-3b50119756d5 |
| 19 | Victory Cup | BW31 | battle_road_autumn_2012_1st_place_stamp | Battle Road Autumn 2012 1st Place Stamp | bwp | 65704a25-8436-4e92-a875-7cedcd5dd925 |
| 20 | Victory Cup | BW31 | battle_road_spring_2012_1st_place_stamp | Battle Road Spring 2012 1st Place Stamp | bwp | ee628c89-cedb-40fd-89e8-76891f2e886e |
| 21 | Victory Cup | BW31 | battle_road_spring_2013_1st_place_stamp | Battle Road Spring 2013 1st Place Stamp | bwp | 668bac23-4c00-472a-afad-9464c778f66a |
| 22 | Volcarona | BW40 | prerelease_stamp | Prerelease Stamp | bwp | 1f80b31d-226f-4374-88d5-7b7a169a4c6e |
| 23 | Volcarona | BW40 | staff_prerelease_stamp | Staff Prerelease Stamp | bwp | 5b7490e5-9463-4130-9a03-65e59ffdea0c |
| 24 | Altaria | BW48 | prerelease_stamp | Prerelease Stamp | bwp | 9f97fb3c-c50f-4a22-9032-d50aa04679ca |
| 25 | Altaria | BW48 | staff_prerelease_stamp | Staff Prerelease Stamp | bwp | fddba405-804b-42b2-80cf-fb6c8019c47b |

Set distribution:

- `bwp`: 18
- `bw4`: 2
- `bw3`: 2
- `bw1`: 2
- `bw2`: 1

## Mapping Closure Result

Bounded mapping surface used: `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs`

- dry run: `25 would_upsert`, `0 conflicts`
- apply: `25 upserted`
- post-apply rerun: `25 already_correct`

Live DB verification for the exact 25 promoted rows:

- active mappings by source:
  - `justtcg = 25`
- unmapped rows: `0`
- duplicate active external ids inside the batch: `0`
- card prints with multiple active mappings inside the batch: `0`

Mapping remained source-backed to the promoted stamped identity and did not collapse any stamped row onto a base row.

## Image Closure Result

Bounded image surface used: `backend/images/source_image_enrichment_worker_v1.mjs --input-json`

- dry run: `25 representative_shared_stamp`, `0 missing`, `0 ambiguous`, `0 unmatched`
- apply: `25 updated`
- post-apply rerun: `25 skipped_existing_representative`

Live DB verification for the exact 25 promoted rows:

- total rows: `25`
- exact images: `0`
- representative images: `25`
- `image_status = representative_shared_stamp`: `25`
- missing rows: `0`

Truth boundary checks passed:

- no representative image was written into `image_url`
- `image_url` stayed null for all 25 rows
- `representative_image_url` is populated for all 25 rows
- `image_note` is present for all 25 rows:
  - `Identity is confirmed. Displayed image is a representative image until the exact stamped image is available.`

## Representative Closed Examples

- Arcanine `12/99` / `prerelease_stamp` / `bw4`: mapped to JustTCG source id `pokemon-black-and-white-promos-arcanine-12-99-prerelease-promo`, image status `representative_shared_stamp`
- Arcanine `12/99` / `staff_prerelease_stamp` / `bw4`: mapped to JustTCG source id `pokemon-black-and-white-promos-arcanine-12-99-prerelease-staff-promo`, image status `representative_shared_stamp`
- Darmanitan `25/114` / `prerelease_stamp` / `bw1`: mapped to JustTCG source id `pokemon-black-and-white-promos-darmanitan-25-114-prerelease-promo`, image status `representative_shared_stamp`
- Victini `43/101` / `staff_prerelease_stamp` / `bw3`: mapped to JustTCG source id `pokemon-black-and-white-promos-victini-43-101-prerelease-staff-promo`, image status `representative_shared_stamp`
- Gigalith `53/98` / `prerelease_stamp` / `bw2`: mapped to JustTCG source id `pokemon-black-and-white-promos-gigalith-53-98-prerelease-promo`, image status `representative_shared_stamp`
- Tropical Beach `BW28` / `worlds_11_staff_stamp` / `bwp`: mapped to JustTCG source id `pokemon-black-and-white-promos-tropical-beach-bw28-worlds-11-staff-promo`, image status `representative_shared_stamp`
- Victory Cup `BW29` / `battle_road_autumn_2011_3rd_place_stamp` / `bwp`: mapped to JustTCG source id `pokemon-black-and-white-promos-victory-cup-bw29-battle-road-autumn-2011-3rd-place-promo`, image status `representative_shared_stamp`
- Victory Cup `BW31` / `battle_road_spring_2013_1st_place_stamp` / `bwp`: mapped to JustTCG source id `pokemon-black-and-white-promos-victory-cup-bw31-battle-road-spring-2013-1st-place-promo`, image status `representative_shared_stamp`
- Volcarona `BW40` / `staff_prerelease_stamp` / `bwp`: mapped to JustTCG source id `pokemon-black-and-white-promos-volcarona-bw40-prerelease-staff-promo`, image status `representative_shared_stamp`
- Altaria `BW48` / `prerelease_stamp` / `bwp`: mapped to JustTCG source id `pokemon-black-and-white-promos-altaria-bw48-prerelease-promo`, image status `representative_shared_stamp`

## Rows Still Missing Anything

None.

## Lessons Learned

- source-backed mapping is the correct closure surface for promoted stamped rows; direct set-number JustTCG alignment is not sufficient for this batch
- representative image closure needed a bounded input mode keyed by promoted row identity, not a set-wide worker run
- `effective_set_code + number_plain + name` is sufficient to assign representative stamped imagery for this batch without collapsing stamped/base identity
- the representative image truth boundary is clean when stamped fallback writes only to `representative_image_url`

## Closure Status

This first stamped batch is fully closed:

- mapping closure: complete
- image closure: complete
- exact/representative truth boundary: preserved
- no widened writes outside the 25-row batch

## Recommended Next Execution Step

`STAMPED_READY_BATCH_2_WAREHOUSE_INTAKE_V1`
