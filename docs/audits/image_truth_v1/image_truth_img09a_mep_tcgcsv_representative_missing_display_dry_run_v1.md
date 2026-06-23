# Image Truth IMG-09A MEP TCGCSV Representative Missing-Display Dry Run V1

Generated: 2026-06-23T04:03:54.795Z

Status: rollback-only dry run. No persisted DB writes. No migrations. No production image promotion.

This package is representative display coverage from live TCGCSV/TCGplayer product imagery for unmodified MEP Holofoil rows only. It excludes Cosmos Holo, Staff, Pokemon Center Exclusive, normal-only, and ambiguous rows.

## Scope

- package_id: IMG-09A-MEP-TCGCSV-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-DRY-RUN
- target_table: card_printings
- parent_overwrite_allowed: false
- source rows: 2
- normalized asset rows: 2
- rollback update verified rows: 2
- blocked rows: 0
- rollback_completed: true
- dry_run_ready_for_real_apply: true
- proof_hash: 4b4f4fab2b9dad8ca0cd4f7ca5671d539751311adc19db2f5647bcd08506fbd5

## Rows

| status | set | card | number | finish | confidence | parent unchanged | planned image path | source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rollback_update_verified | mep | Barbaracle | 065 | holo | representative | true | warehouse-derived/image-truth-v1/img09a-mep-tcgcsv-representative/mep/2c76b426-bdda-42ce-85d8-a921e79de026/3150be3f71585a9b7de999dc.jpg | https://www.tcgplayer.com/product/685495/pokemon-me-mega-evolution-promo-barbaracle-065 |
| rollback_update_verified | mep | Tyrantrum | 066 | holo | representative | true | warehouse-derived/image-truth-v1/img09a-mep-tcgcsv-representative/mep/ed4ce9f8-9703-492e-919c-3ec19d1f493a/9cd56f1884565b0397087ea7.jpg | https://www.tcgplayer.com/product/685496/pokemon-me-mega-evolution-promo-tyrantrum-066 |

## Explicit Non-Actions

- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
