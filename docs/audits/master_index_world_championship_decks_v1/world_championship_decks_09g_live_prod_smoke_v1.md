# MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09G-LIVE-PROD-SMOKE

- Generated: 2026-06-24T20:30:19.344Z
- Mode: read_only_live_production_http_smoke_no_db_no_storage_no_migration
- Base URL: `https://grookaivault.com`
- Failures: 0
- Proof hash: `ce3d97fff7c55940919177e294e72d4f497097609aab89368faf433d8f033f59`
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false

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
