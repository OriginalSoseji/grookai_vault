# Image Truth IMG-07A CardTrader Representative Missing-Display Dry Run V1

Generated: 2026-06-14T16:02:41.347Z

Status: rollback-only dry run. No persisted DB writes. No migrations. No production image promotion.

This package is representative display coverage from CardTrader blueprint images, not exact finish/variant imagery.

## Scope

- package_id: IMG-07A-CARDTRADER-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-DRY-RUN
- target_table: card_printings
- parent_overwrite_allowed: false
- source rows: 2
- normalized asset rows: 2
- rollback update verified rows: 2
- blocked rows: 0
- rollback_completed: true
- dry_run_ready_for_real_apply: true
- proof_hash: 5da4efe695ac4fb7cf80e664c6f23ec7b796c36050d3ac1ce5fbc85cbaa42369

## Rows

| status | set | card | number | finish | confidence | parent unchanged | planned image path | source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rollback_update_verified | mep | Makuhita | 068 | cosmos | representative | true | warehouse-derived/image-truth-v1/img07a-cardtrader-representative/mep/50fb9836-a3a0-4742-a29a-09671121fa56/f44de6d49655b6a2276dcc15.jpg | https://www.cardtrader.com/en/cards/383014-makuhita-cosmos-holo-mep-068-mep-black-star-promos |
| rollback_update_verified | mep | Chikorita | 069 | cosmos | representative | true | warehouse-derived/image-truth-v1/img07a-cardtrader-representative/mep/8c4676e9-100d-4cf1-bee5-7fcbc475eade/7f7d6b1ec6ed5a5719c990c8.jpg | https://www.cardtrader.com/en/cards/383013-chikorita-cosmos-holo-mep-069-mep-black-star-promos |

## Explicit Non-Actions

- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
