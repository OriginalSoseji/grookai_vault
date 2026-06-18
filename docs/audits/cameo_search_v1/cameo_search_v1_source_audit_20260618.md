# CAMEO_SEARCH_V1 Source Audit

Date: 2026-06-18

## Scope

Audit-only ingestion of the public cameo workbook. No DB writes, migrations, resolver changes, or app changes were performed.

## Source

- https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview
- Workbook hash: `ae1802ce774e6cd610e08e210177746c509375fd599b2ef3d057e1fc6e32553f`

## Tabs

| Tab | GID | Rows | Headers |
| --- | --- | ---: | --- |
| Main | 1923267969 | 6 | Source policy / workbook instructions |
| Gen 1 | 0 | 1251 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 2 | 2112540589 | 398 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 3 | 1642805847 | 439 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 4 | 623394955 | 380 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 5 | 907311085 | 297 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 6 | 1750206679 | 171 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 7 | 2096460131 | 137 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 8 | 692781906 | 185 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Gen 9 | 1784063283 | 156 | Ndex / Cameo Pokémon / Card name / Set / # / Notes |
| Trainers | 36967854 | 577 |  / Cameo Trainer / Card name / Set / # / Notes |

## Summary

- Data rows: 3991
- Pokemon cameo rows: 3414
- Trainer cameo rows: 577
- Rows with card name: 3670
- Rows with set name: 3991
- Rows with number: 3148
- Rows with notes: 926
- Distinct Pokemon subjects: 823
- Distinct trainer subjects: 197

## Source Risk Buckets

| Bucket | Rows |
| --- | ---: |
| SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN | 2474 |
| BLOCKED_NUMBER_MISSING | 843 |
| NEEDS_NOTE_REVIEW | 346 |
| BLOCKED_CARD_NAME_MISSING | 321 |
| NEEDS_JUMBO_REVIEW | 240 |
| NEEDS_LANGUAGE_SCOPE_REVIEW | 50 |

## Cameo Qualifiers

| Qualifier | Rows |
| --- | ---: |
| unknown_note | 346 |
| jumbo | 240 |
| toy_or_costume | 81 |
| picture | 76 |
| partial_visibility | 69 |
| silhouette | 63 |
| non_english | 50 |
| disguise | 10 |

## Largest Source Sets

| Source set name | Rows |
| --- | ---: |
| Crown Zenith | 128 |
| SM-P Promos | 126 |
| MEP Promos | 98 |
| BW-P Promos | 91 |
| XY-P Promos | 91 |
| Astral Radiance | 71 |
| 2010 Card Design Contest | 68 |
| SV Promos | 66 |
| Miscellaneous Promos | 64 |
| SM Promos | 63 |
| XY Promos | 63 |
| Evolving Skies | 61 |
| Twilight Masquerade | 60 |
| SWSH Promos | 59 |
| Silver Tempest | 57 |
| SV-P Promos | 57 |
| Temporal Forces | 53 |
| Paradox Rift | 52 |
| Lost Origin | 51 |
| Destined Rivals | 50 |
| Ascended Heroes | 49 |
| Cosmic Eclipse | 48 |
| Art Academy Promo | 47 |
| Koko Illustration Contest | 47 |
| Brilliant Stars | 45 |
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
