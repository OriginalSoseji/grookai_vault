# CAMEO_SEARCH_V1 Source Audit

Date: 2026-05-20

## Scope

Audit-only ingestion of the public cameo workbook. No DB writes, migrations, resolver changes, or app changes were performed.

## Source

- https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview
- Workbook hash: `f55a961dbe17050420ba5765520bd8ce9a61e106df786045136d4cdb4fc15088`

## Tabs

| Tab | GID | Rows | Headers |
| --- | --- | ---: | --- |
| Main | 1923267969 | 5 | Source policy / workbook instructions |
| Gen 1 | 0 | 1234 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 2 | 2112540589 | 395 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 3 | 1642805847 | 416 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 4 | 623394955 | 376 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 5 | 907311085 | 291 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 6 | 1750206679 | 166 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 7 | 2096460131 | 132 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 8 | 692781906 | 184 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 9 | 1784063283 | 142 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Trainers | 36967854 | 539 |  / Cameo Trainer / Card name / Set / # / Notes |

## Summary

- Data rows: 3875
- Pokemon cameo rows: 3336
- Trainer cameo rows: 539
- Rows with card name: 3568
- Rows with set name: 3875
- Rows with number: 3036
- Rows with notes: 897
- Distinct Pokemon subjects: 813
- Distinct trainer subjects: 190

## Source Risk Buckets

| Bucket | Rows |
| --- | ---: |
| SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN | 2393 |
| BLOCKED_NUMBER_MISSING | 839 |
| NEEDS_NOTE_REVIEW | 330 |
| BLOCKED_CARD_NAME_MISSING | 307 |
| NEEDS_JUMBO_REVIEW | 240 |
| NEEDS_LANGUAGE_SCOPE_REVIEW | 48 |

## Cameo Qualifiers

| Qualifier | Rows |
| --- | ---: |
| unknown_note | 330 |
| jumbo | 240 |
| toy_or_costume | 78 |
| picture | 70 |
| partial_visibility | 68 |
| silhouette | 62 |
| non_english | 48 |
| disguise | 10 |

## Largest Source Sets

| Source set name | Rows |
| --- | ---: |
| Crown Zenith | 126 |
| SM-P Promos | 124 |
| BW-P Promos | 91 |
| XY-P Promos | 91 |
| Astral Radiance | 71 |
| 2010 Card Design Contest | 68 |
| SV Promos | 66 |
| Miscellaneous Promos | 64 |
| SM Promos | 63 |
| XY Promos | 62 |
| Evolving Skies | 61 |
| Twilight Masquerade | 60 |
| SWSH Promos | 59 |
| SV-P Promos | 57 |
| Silver Tempest | 56 |
| MEP Promos | 55 |
| Temporal Forces | 53 |
| Lost Origin | 51 |
| Paradox Rift | 51 |
| Destined Rivals | 50 |
| Ascended Heroes | 49 |
| Cosmic Eclipse | 48 |
| Art Academy Promo | 47 |
| Koko Illustration Contest | 47 |
| Brilliant Stars | 44 |
| Double Crisis | 42 |
| Skyridge | 42 |
| Paldean Fates | 41 |
| Paldea Evolved | 39 |
| Scarlet & Violet | 38 |

## Next Gate

The next lane should be a no-write card match dry-run against `card_prints` and set aliases. Rows must be classified before any cameo relationship table or search resolver integration is proposed.

Required dry-run classifications:

- `APPROVED_MATCH`
- `BLOCKED_SET_ALIAS_MISSING`
- `BLOCKED_CARD_NOT_FOUND`
- `BLOCKED_NUMBER_MISSING`
- `BLOCKED_AMBIGUOUS_CARD`
- `BLOCKED_PARENT_VARIANT_AMBIGUITY`
- `BLOCKED_NON_ENGLISH_SCOPE`
- `NEEDS_MANUAL_REVIEW`

## Confirmations

- No DB writes.
- No migrations.
- No search resolver changes.
- No app changes.
- No Species Dex denominator changes.
- No scanner changes.
