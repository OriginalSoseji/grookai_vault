# MTG Canonical Catalog Service-Only Staging Canary

- Status: **SERVICE_ONLY_STAGING_APPLIED_AND_READ_BACK**
- Mode: `apply`
- Payload fingerprint: `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Batch ID: `60ea72dd-df1c-5ef8-9270-2dcbefc4adfe`
- Staged rows: `2866`
- Staged rows SHA-256: `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Mutation contract SHA-256: `0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c`
- Durable database writes: `true`

## Boundary

Only the service-only MTG import staging tables are in scope. Canonical games, sets, cards, printings, source mappings, images, prices, publication, app visibility, and Pokemon rows remain unchanged.

## Required Apply Approval

```text
I approve the service-only MTG canonical staging canary only: staging migration 20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8, payload 83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7, mutation contract 0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c, one immutable batch and 2866 immutable staged rows. I do not approve canonical game, set, card, printing, mapping, image, Storage, pricing, publication, app-visibility, Pokemon, update, delete, truncate, cleanup, or promotion writes.
```
