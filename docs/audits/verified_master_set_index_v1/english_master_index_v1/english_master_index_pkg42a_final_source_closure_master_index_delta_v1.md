# PKG-42A Final Source Closure Master Index Delta V1

Docs-only Master Index closure for the final supported source facts before the last identity backfill dry-run.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| metric | value |
| --- | --- |
| package_id | PKG-42A-FINAL-SOURCE-CLOSURE-MASTER-INDEX-DELTA |
| fingerprint_sha256 | 0ec7ec6785b27eaebe294c5a26bd85cd9ed56d28f040b41084e7e612289ed9ba |
| master_rows_inserted | 2 |
| master_rows_promoted | 1 |
| route_rows | 2 |
| completion_export_rows_inserted | 3 |
| publishable_rows_inserted | 3 |
| publishable_evidence_rows_inserted | 7 |

## Master Index Changes

| action | set | number | card | finish | sources |
| --- | --- | --- | --- | --- | --- |
| promoted | sv03 | 196 | Town Store | stamped | thepricedex_price_list, bulbapedia_prize_pack_series_six |
| inserted | svp | 224 | Paradise Resort | normal | tcgdex, pkmncards_card_page, thepricedex_price_list |
| inserted | svp | 500 | Terapagos & Friends | normal | tcgdex, tcgcollector_card_page |

## Route Rows

| set | number | card | variant | active_finish | identity_backfill |
| --- | --- | --- | --- | --- | --- |
| sv03 | 196 | Town Store | play_pokemon_stamp | cosmos | false |
| svp | 224 | Paradise Resort | world_championships_2025_staff_stamp | normal | true |
