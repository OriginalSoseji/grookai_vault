# MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09F-RUNTIME-SEARCH-SMOKE

- Generated: 2026-06-23T21:35:44.746Z
- Mode: read_only_db_and_runtime_surface_smoke
- Base URL: `http://127.0.0.1:3095`
- Proof hash: `de5b30e420ade12257277e28d792d1ec0d268ef9d1f82a2f6b6c6ae2ebdf4c81`
- Failures: 0
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## DB Readback

- WCD set rows: 80
- WCD parent card_print rows: 1944
- WCD child rows: 0
- WCD forbidden image rows: 0

## Search Probes

| Probe | Query | Result | Matching rows | Top parent GV ID |
| --- | --- | --- | ---: | --- |
| exact_gv_id_magma_spirit_groudon | GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON | PASS | 1 | GV-PK-WCD-2004-MAGMA_SPIRIT-01-EX_TEAM_MAGMA_VS-9-TEAM_MAGMAS_GROUDON |
| deck_name_magma_spirit | Magma Spirit | PASS | 10 | GV-PK-WCD-2004-MAGMA_SPIRIT-11-EXPEDITION-138-COPYCAT |
| deck_name_pikarom_judge | Pikarom Judge | PASS | 10 | GV-PK-WCD-2019-PIKAROM_JUDGE-10-UNIFIED_MINDS-191-CHERISH_BALL |
| deck_name_ancient_toolbox | Ancient Toolbox | PASS | 10 | GV-PK-WCD-2024-ANCIENT_TOOLBOX-22-PARADOX_RIFT-159-ANCIENT_BOOSTER_ENERGY_CAPSU |
| deck_name_pult_bomb | Pult Bomb | PASS | 10 | GV-PK-WCD-2025-PULT_BOMB-24-BLACK_BOLT-79-AIR_BALLOON |

## Runtime Routes

| Route | HTTP | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
| set_magma_spirit | 200 | PASS | none | none |
| set_pikarom_judge | 200 | PASS | none | none |
| set_pult_bomb | 200 | PASS | none | none |
| card_magma_spirit_groudon | 200 | PASS | none | none |
| card_pikarom_pikachu_zekrom | 200 | PASS | none | none |

## Runtime Redirects

| Probe | HTTP | Result | Location |
| --- | ---: | --- | --- |
| search_alias_magma_spirit | 307 | PASS | /sets/wcd2004-magma-spirit |
| search_alias_pikarom_judge | 307 | PASS | /sets/wcd2019-pikarom-judge |
| search_alias_pult_bomb_deck | 307 | PASS | /sets/wcd2025-pult-bomb |
| search_alias_world_championship_decks | 307 | PASS | /sets?q=world+championship+decks |

## Notes

- Deck-name search proves WCD parent rows are discoverable and deck aliases route to deterministic set pages when unambiguous.
- All runtime probes forbid external image URLs and self-hosted exact paths because these WCD rows intentionally have no exact images yet.
