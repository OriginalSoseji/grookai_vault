# IMG-HOST-WH-22C-RESIDUAL-GOVERNED-DB-POINTER-DRY-RUN

- Generated: 2026-07-22T22:22:12.024Z
- Mode: dry_run_no_write
- Approval fingerprint: `ba3fc47ec7c3e18fadcd84b51d921fce270d32c12fda4913b92e7fc67fa4753f`
- Pointer plan hash: `3e96ea174e2c11659c356893654185bf6d0a844f3d2fe71b25e6097a4e294efd`
- Mutation contract hash: `cab3fa77e4dff8fad5475752488a2135092d7b9f432c813bd55b18f51f4fa679`
- Parent-row mappings: 24
- Verified storage assets: 21 / 21
- Missing storage assets: 0
- Effective guarded pointer updates: 0
- Already-applied no-ops: 24
- Full-row snapshot drift: 0
- Ready for database apply: true
- Stop findings: none
- Planned columns: card_prints.image_source, card_prints.image_path, card_prints.image_status, card_prints.image_url, card_prints.representative_image_url
- Preserved columns: card_prints.image_note, card_prints.image_alt_url, all other card_prints columns
- Fallback column write in WH22: true
- Database writes performed: false
- Storage writes performed: false
- Migrations created: false

## Row disposition

| disposition | count |
| --- | --- |
| already_applied_no_op | 24 |

The dry run compares the complete current `card_prints` row with the immutable before/after snapshots. Apply bootstraps the pinned Supabase certificate chain without sending credentials, reconnects with `rejectUnauthorized: true`, then locks and updates all 24 rows in one compare-and-swap transaction with full readback before commit.
