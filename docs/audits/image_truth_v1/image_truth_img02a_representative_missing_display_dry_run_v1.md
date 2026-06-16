# Image Truth IMG-02A Representative Missing-Display Dry Run V1

Generated: 2026-06-16T05:26:31.159Z

Status: rollback-only dry run. No persisted DB writes. No migrations. No production image promotion.

This package is representative display coverage, not exact finish/variant imagery.

## Scope

- package_id: IMG-02A-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-DRY-RUN
- target_table: card_printings
- parent_overwrite_allowed: false
- source rows: 2
- normalized asset rows: 2
- rollback update verified rows: 2
- blocked rows: 0
- rollback_completed: true
- dry_run_ready_for_real_apply: true
- proof_hash: e3bf5606b8f5407556d27aa590b8d61406d2f0d94119744e432be821a5083bee

## Rows

| status | set | card | number | finish | confidence | parent unchanged | planned image path | source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rollback_update_verified | mfb | Potion | 33 | normal | representative | true | warehouse-derived/image-truth-v1/img02a-missing-display-representative/mfb/673d0e32-6748-4f2c-8de6-f76a3f3698d5/4cce9b1f132297acc8d5c2a6.jpg | https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010 |
| rollback_update_verified | mfb | Switch | 34 | normal | representative | true | warehouse-derived/image-truth-v1/img02a-missing-display-representative/mfb/3df8a13f-4fb7-45db-a8b7-d174a4895f6a/68d097055b9e0ca1315e46fd.jpg | https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011 |

## Explicit Non-Actions

- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
