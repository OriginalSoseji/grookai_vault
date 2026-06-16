# Image Truth IMG-01B Missing-Display Dry Run V1

Generated: 2026-06-16T04:44:20.336Z

Status: rollback-only dry run. No persisted DB writes. No migrations. No production image promotion.

## Scope

- package_id: IMG-01B-MISSING-DISPLAY-EXACT-CHILD-IMAGE-DRY-RUN
- target_table: card_printings
- parent_overwrite_allowed: false
- source rows: 1
- normalized asset rows: 1
- rollback update verified rows: 1
- blocked rows: 0
- rollback_completed: true
- dry_run_ready_for_real_apply: true
- proof_hash: d93dff9d548f35fc593e6d458599581017f2f3e789a806f4f9414705c95700a5

## Rows

| status | set | card | number | finish | parent unchanged | planned image path | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rollback_update_verified | mee | Basic Grass Energy | 001 | reverse | true | warehouse-derived/image-truth-v1/img01b-missing-display/mee/48e37111-db45-4c3e-9331-eb502378cb24/997886f1017668bc97324532.jpg | https://www.pricecharting.com/game/pokemon-mega-evolution-energy/basis-energy-grass-reverse-holo-1 |

## Explicit Non-Actions

- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
