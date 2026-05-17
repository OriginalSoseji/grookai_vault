# GV-ID Public Coverage Audit - 2026-05-17

Status: read-only focused audit after the Lane A 247 number-normalization execution. No Supabase writes, migrations, inserts, updates, deletes, generated ID backfills, public view rewrites, deploys, card/set changes, or variant changes were performed.

## Corrected Display Rule

Blank or hidden `card_prints.set_code` is not a user-facing defect. Grookai product display should show set name as the user-facing authority. Set code remains internal routing/debug identity. This audit does not mark missing visible set code as a failure.

The remaining public issue is `gv_id` and public addressability coverage: whether normalized cards have a stable public route and can be surfaced with card name, set name, card number, image, and `/card/[gv_id]` where applicable.

## Coverage Counts

| Metric | Count |
| --- | --- |
| Total audited | 247 |
| Has gv_id | 29 |
| Missing gv_id | 218 |
| Public-ready | 4 |
| Not public-ready | 243 |
| Has set name | 247 |
| Missing set name | 0 |
| Has card number | 247 |
| Missing card number | 0 |
| Has image_url | 185 |
| Missing image_url | 62 |
| Has any image field | 185 |
| Missing any image field | 62 |
| Appears in public web views | 247 |
| Absent from public web views | 0 |
| Public web app route eligible | 29 |

## Classification Counts

| Classification | Rows |
| --- | --- |
| MISSING_GV_ID | 218 |
| MISSING_IMAGE | 25 |
| PUBLIC_READY | 4 |

## Reason Counts

| Reason | Rows |
| --- | --- |
| MISSING_GV_ID | 218 |
| MISSING_IMAGE | 62 |
| PUBLIC_READY | 4 |

## Set Breakdown

| Set | Name | Rows | Has gv_id | Missing gv_id | Public-ready | Missing image_url |
| --- | --- | --- | --- | --- | --- | --- |
| 2021swsh | Macdonald's Collection 2021 | 25 | 25 | 0 | 0 | 25 |
| A3a | Extradimensional Crisis | 103 | 0 | 103 | 0 | 0 |
| ecard3 | Skyridge | 4 | 4 | 0 | 4 | 0 |
| fut2020 | Pokémon Futsal 2020 | 5 | 0 | 5 | 0 | 0 |
| mep | MEP Black Star Promos | 10 | 0 | 10 | 0 | 10 |
| P-A | Promos-A | 100 | 0 | 100 | 0 | 27 |

## Public View Inventory

| Object | Available | Match basis | Matched rows |
| --- | --- | --- | --- |
| card_prints_public | true |  | 0 |
| v_card_prints_web_v1 | true | card_print_id | 247 |
| v_card_search | true | id | 247 |

## Website Sample Verification

| Metric | Count |
| --- | --- |
| Sample count | 30 |
| Pass | 12 |
| Fail | 18 |
| Missing gv_id route failures | 18 |
| Display mismatch failures | 0 |

| Status | GV-ID | Name | Set name | Number | Card status | Search match | Image tag |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PASS | GV-PK-MCD-1 | Bulbasaur | Macdonald's Collection 2021 | 1 | 200 | true | true |
| PASS | GV-PK-MCD-2 | Chikorita | Macdonald's Collection 2021 | 2 | 200 | true | true |
| PASS | GV-PK-MCD-3 | Treecko | Macdonald's Collection 2021 | 3 | 200 | true | true |
| PASS | GV-PK-MCD-4 | Turtwig | Macdonald's Collection 2021 | 4 | 200 | true | true |
| PASS | GV-PK-MCD-5 | Snivy | Macdonald's Collection 2021 | 5 | 200 | true | true |
| PASS | GV-PK-MCD-6 | Chespin | Macdonald's Collection 2021 | 6 | 200 | true | true |
| PASS | GV-PK-MCD-7 | Rowlet | Macdonald's Collection 2021 | 7 | 200 | true | true |
| PASS | GV-PK-MCD-8 | Grookey | Macdonald's Collection 2021 | 8 | 200 | true | true |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Petilil | Extradimensional Crisis | 1 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Lilligant | Extradimensional Crisis | 2 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Rowlet | Extradimensional Crisis | 3 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Dartrix | Extradimensional Crisis | 4 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Decidueye | Extradimensional Crisis | 5 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Buzzwole ex | Extradimensional Crisis | 6 |  | false | false |
| PASS | GV-PK-SK-4 | Articuno | Skyridge | 4 | 200 | true | true |
| PASS | GV-PK-SK-6 | Crobat | Skyridge | 6 | 200 | true | true |
| PASS | GV-PK-SK-8 | Flareon | Skyridge | 8 | 200 | true | true |
| PASS | GV-PK-SK-9 | Forretress | Skyridge | 9 | 200 | true | true |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Pikachu on the Ball | Pokémon Futsal 2020 | 1 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Eevee on the Ball | Pokémon Futsal 2020 | 2 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Grookey on the Ball | Pokémon Futsal 2020 | 3 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Scorbunny on the Ball | Pokémon Futsal 2020 | 4 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Sobble on the Ball | Pokémon Futsal 2020 | 5 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Meganium | MEP Black Star Promos | 1 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Inteleon | MEP Black Star Promos | 2 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Alakazam | MEP Black Star Promos | 3 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Lunatone | MEP Black Star Promos | 4 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Drifloon | MEP Black Star Promos | 5 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Drifblim | MEP Black Star Promos | 6 |  | false | false |
| FAIL_MISSING_GV_ID_PUBLIC_ROUTE |  | Potion | Promos-A | 1 |  | false | false |

## Proposed Fix Plan

1. Missing `gv_id`: the existing public web contract treats non-null `card_prints.gv_id` as the stable public route identity. The repo has compatibility aliases for legacy GV-ID prefixes and several historical migrations that set specific GV-IDs, but this audit did not find a general approved backfill execution path for the 247 Lane A rows. A future generator/backfill plan must be explicit, reviewed, and guarded.

2. Safe generation requirements: before any future `gv_id` backfill, prove deterministic input fields for each row: canonical Pokemon domain, canonical set identity, printed number, card name, identity modifier/variant where needed, and collision-free candidate GV-ID. The plan must query the existing unique `card_prints.gv_id` surface and compatibility alias rules before proposing any new IDs.

3. Public view/query exclusion: current web code primarily reads `card_prints` directly and filters public set/card/search surfaces to rows with non-null `gv_id`. Missing `gv_id` is therefore an intentional public route gate, not a reason to loosen web queries. If DB public views are introduced or used later, they should preserve the same stable-ID gate unless a separate product decision authorizes provisional exposure.

4. Route/search failures with existing `gv_id`: rows that already have `gv_id` should continue to be verified through `/card/[gv_id]` and `/api/resolver/search`. If any such row fails, investigate resolver identifier normalization, search scoring, and public set routing before changing DB data.

5. Image-only issues: rows whose only missing signal is image coverage should be classified as image pipeline work, not a GV-ID or set-code issue.

## TLS Note

Node fetch required NODE_TLS_REJECT_UNAUTHORIZED=0 in this local environment due local certificate chain verification failure. Browser-facing HTTPS responses were still fetched from https://grookaivault.com.

## Confirmation

- Supabase writes: none.
- Migrations: none.
- Data changes: none.
- Deploy: none.
