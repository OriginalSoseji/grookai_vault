# CAMEO_SEARCH_V1 Charizard Gap Fix

Date: 2026-05-20

## Finding

Production search for `charizard cameo` returned only 5 cameo-labeled card results because only 5 unique Charizard-family cameo card targets were active in `card_print_cameos`.

The source replay evidence contained additional Charizard-family rows, but most were intentionally blocked:

- Japanese promo-family rows such as `XY-P Promos` remain blocked by language-scope rules.
- Future/manual-review rows such as `Phantasmal Flames` remain blocked.
- One English promo row was blocked only because the source label `SV Promos` was missing from the source-owned alias file.

## Safe Repair

Added a source-owned alias:

```text
SV Promos -> svp
```

Then inserted exactly one approved cameo row:

```text
Charizard cameo on Pikachu, Scarlet & Violet Black Star Promos #101
GV-PK-PR-SV-101
```

## Production Result

After the guarded insert, production `charizard cameo` returns 6 cameo-labeled card results:

- Charizard Spirit Link, `GV-PK-EVO-75`, Cameo: Mega Charizard X
- Mew, `GV-PK-SI-1`, Cameo: Charizard
- Lucky Stadium, `GV-PK-PR-41`, Cameo: Charizard
- Special Delivery Bidoof, `GV-PK-PR-SW-SWSH177`, Cameo: Charizard
- Team Rocket's Meowth, `GV-PK-PR-18`, Cameo: Charizard · silhouette
- Pikachu, `GV-PK-PR-SV-101`, Cameo: Charizard

## Remaining Blocked Rows

The remaining Charizard-family rows are not promoted in this repair because they require separate governed review:

- `XY-P Promos` Japanese promo-family rows
- `Start Deck 100 CoroCiao Version`
- `Phantasmal Flames` manual-review rows
- 151 Charmander manual-review row

## Confirmations

- DB write was limited to one `public.card_print_cameos` insert.
- No migrations were run.
- No card identity rows were changed.
- No search ranking or resolver architecture changed.
- No Species Dex changes.
- No scanner changes.
- No pricing changes.
