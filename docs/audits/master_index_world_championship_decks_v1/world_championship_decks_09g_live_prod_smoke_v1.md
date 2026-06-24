# MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09G-LIVE-PROD-SMOKE

- Generated: 2026-06-24T19:58:24.265Z
- Mode: read_only_live_production_http_smoke_no_db_no_storage_no_migration
- Base URL: `https://grookaivault.com`
- Failures: 2
- Proof hash: `9cfd2fe9c2b7231659d819b1d0af066d79040f50f36099a3b5656844b5e7a939`
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

## Runtime Routes

| Route | HTTP | Result | Missing expected signals | Forbidden signals present |
| --- | ---: | --- | --- | --- |
| set_magma_spirit | 200 | PASS | none | none |
| set_pikarom_judge | 200 | PASS | none | none |
| set_pult_bomb | 200 | PASS | none | none |
| card_magma_spirit_groudon | 200 | FAIL | none | assets.tcgdex.net |
| card_pikarom_pikachu_zekrom | 200 | FAIL | none | assets.tcgdex.net |

## Runtime Redirects

| Probe | HTTP | Result | Location |
| --- | ---: | --- | --- |
| search_alias_magma_spirit | 307 | PASS | /sets/wcd2004-magma-spirit |
| search_alias_pikarom_judge | 307 | PASS | /sets/wcd2019-pikarom-judge |
| search_alias_pult_bomb_deck | 307 | PASS | /sets/wcd2025-pult-bomb |
| search_alias_world_championship_decks | 307 | PASS | /sets?q=world+championship+decks |
