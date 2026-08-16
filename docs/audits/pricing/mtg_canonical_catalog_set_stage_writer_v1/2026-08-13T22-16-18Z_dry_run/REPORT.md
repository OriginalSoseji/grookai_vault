# MTG Canonical Catalog Service-Only Staging Canary

- Status: **ROLLBACK_DRY_RUN_PASSED_NO_DURABLE_CHANGE**
- Mode: `dry-run`
- Payload fingerprint: `73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38`
- Batch ID: `276cc9f7-0159-5df3-874c-73ea04e741a4`
- Staged rows: `3089`
- Staged rows SHA-256: `788eaf7637311ce021f531d70430f05700594eb03fd48a0c00bd8e0e4b7f0e6c`
- Mutation contract SHA-256: `0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c`
- Durable database writes: `false`

## Boundary

Only the service-only MTG import staging tables are in scope. Canonical games, sets, cards, printings, source mappings, images, prices, publication, app visibility, and Pokemon rows remain unchanged.

## Required Apply Approval

```text
I approve the service-only MTG canonical staging canary only: staging migration 20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8, payload 73d0b68c08ff462cc2f853520faa491a73d9d7e27db9c93afcc95bfc06c00e38, mutation contract 0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c, one immutable batch and 3089 immutable staged rows. I do not approve canonical game, set, card, printing, mapping, image, Storage, pricing, publication, app-visibility, Pokemon, update, delete, truncate, cleanup, or promotion writes.
```
