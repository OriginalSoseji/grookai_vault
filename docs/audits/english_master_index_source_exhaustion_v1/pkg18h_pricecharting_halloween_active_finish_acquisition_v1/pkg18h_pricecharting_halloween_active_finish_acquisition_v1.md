# PKG-18H PriceCharting Halloween Active Finish Acquisition V1

Audit-only extraction of active finish evidence from local PriceCharting CSV Trick or Trade product titles.

## Safety

- audit_only: true
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| target_rows | 6 |
| csv_rows_reviewed | 75855 |
| candidate_rows | 4 |
| blocked_rows | 2 |
| fixture_records_written | 4 |
| fingerprint_sha256 | `837b59ee7abc209297d2964468053aef7c4c4b9eccec6c08d6b883061439c206` |

## Status Counts

| status | count |
| --- | --- |
| candidate_pricecharting_halloween_active_finish | 4 |
| blocked_no_pricecharting_halloween_active_finish | 2 |

## Candidate Rows

| set | number | card | variant | finish | source_url |
| --- | --- | --- | --- | --- | --- |
| swsh11 | 16 | Phantump | pikachu_jack_o_lantern_stamp | normal | https://www.pricecharting.com/game/pokemon-trick-or-trade-2022/phantump-16 |
| swsh11 | 24 | Litwick | pikachu_jack_o_lantern_stamp | normal | https://www.pricecharting.com/game/pokemon-trick-or-trade-2023/litwick-24 |
| swsh11 | 25 | Lampent | pikachu_jack_o_lantern_stamp | normal | https://www.pricecharting.com/game/pokemon-trick-or-trade-2023/lampent-25 |
| swsh11 | 65 | Haunter | pikachu_jack_o_lantern_stamp | normal | https://www.pricecharting.com/game/pokemon-trick-or-trade-2023/haunter-65 |

## Blocked Sample

| set | number | card | variant | status | reason |
| --- | --- | --- | --- | --- | --- |
| sv05 | 77 | Scream Tail | pikachu_jack_o_lantern_stamp | blocked_no_pricecharting_halloween_active_finish | no_exact_trick_or_trade_product_match |
| svp | 75 | Mimikyu | pikachu_jack_o_lantern_stamp | blocked_no_pricecharting_halloween_active_finish | no_exact_trick_or_trade_product_match |

## Limitation

PriceCharting Trick or Trade product titles prove the Halloween product family, card name, card number, and active finish label. They do not independently prove the original printed set symbol, so this evidence must be combined with existing Master Index identity evidence before any guarded write package.
