# MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09C-TRANSLATION-DRY-RUN

- Generated: 2026-06-23T21:16:12.121Z
- Mode: translation_dry_run_no_db_writes_no_storage_writes
- Fingerprint: `da7a18fb284b6ba18078a64868c6375a5e15145d37392b4c92da788de69e0594`
- Source WH09B fingerprint: `7ffa3604fe491cb5c6d535305c77b681d18e0765d2c0d6932ec11520728bfdaa`
- Proposed set lane inserts: 80
- Proposed card_print parent identity inserts: 1944
- Existing proposed set code collisions: 0
- Existing proposed gv_id collisions: 0
- Duplicate proposed gv_ids in plan: 0
- Source card rows with existing DB match: 1145
- Source card rows without existing DB match: 799
- Write ready after this dry run: true
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## Stop Findings

_None._

## Proposed Set Sample

| code | name | total |
| --- | --- | --- |
| wcd2004-magma-spirit | 2004 World Championships Deck: Magma Spirit | 22 |
| wcd2004-rocky-beach | 2004 World Championships Deck: Rocky Beach | 25 |
| wcd2004-team-rushdown | 2004 World Championships Deck: Team Rushdown | 24 |
| wcd2004-blaziken-tech | 2004 World Championships Deck: Blaziken Tech | 25 |
| wcd2005-queendom | 2005 World Championships Deck: Queendom | 20 |
| wcd2005-dark-tyranitar-deck | 2005 World Championships Deck: Dark Tyranitar Deck | 26 |
| wcd2005-bright-aura | 2005 World Championships Deck: Bright Aura | 18 |
| wcd2005-king-of-the-west | 2005 World Championships Deck: King of the West | 25 |
| wcd2006-mewtrick | 2006 World Championships Deck: Mewtrick | 20 |
| wcd2006-suns-and-moons | 2006 World Championships Deck: Suns & Moons | 25 |
| wcd2006-b-l-s | 2006 World Championships Deck: B-L-S | 23 |
| wcd2006-eeveelutions | 2006 World Championships Deck: Eeveelutions | 27 |

## Proposed Sets By Year

| year | sets |
| --- | --- |
| 2004 | 4 |
| 2005 | 4 |
| 2006 | 4 |
| 2007 | 4 |
| 2008 | 4 |
| 2009 | 4 |
| 2010 | 4 |
| 2011 | 4 |
| 2012 | 4 |
| 2013 | 4 |
| 2014 | 4 |
| 2015 | 4 |
| 2016 | 4 |
| 2017 | 4 |
| 2018 | 4 |
| 2019 | 4 |
| 2022 | 4 |
| 2023 | 4 |
| 2024 | 4 |
| 2025 | 4 |

## Next Work

If the scope is acceptable, the next package is a guarded rollback SQL dry-run that inserts these proposed rows inside a transaction and rolls back. Real apply should still require exact approval text and should not include child writes, external mappings, prices, storage writes, deletes, merges, migrations, or exact image claims.
