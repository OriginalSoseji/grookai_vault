# One Piece Immutable Staging And Rollback Canary Plan V1

- Status: **planned only; no database connection or write**
- Producing commit: `d6bcdc1338a41ea0ed5d06bb28b409b1dbf2c8d8`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Manifest logical SHA-256: `e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9`
- Migration draft SHA-256: `e7a9f3afeb1ac1355955960f2ef5c5346fcd8988418c04ef1f75fcfc38ef74a9`
- Canary plan SHA-256: `98bf6bfa61fdd38b8c3cadfccb0b64b4e6607381d66182226b34aff997deccef`
- Selected group: **Starter Deck 1: Straw Hat Crew** (`3189`)
- Release date: `2022-12-02`
- Language lanes: `en`
- Authorized durable rows: `0`

## Preserved Rows

| Lane | Count |
|---|---:|
| Numbered singles | 17 |
| DON!! singles | 1 |
| Sealed products | 3 |
| Quarantine | 0 |
| Future/presale holds | 0 |
| Source price lanes | 21 |
| Total source products | 21 |

## Exact Evidence Slice

- File: `selected_group_source_rows.jsonl.gz`
- Logical SHA-256: `b6adbbffa3ea5f1f390827bb9497056e5eba3130ce7c85ebd178caa7fd92a857`
- Compressed SHA-256: `d1e53f09d77ccc5840caba1f190ea6b5fe3e63dec63ac7e9e0c972727c33c793`
- Rows: `21`

## Rollback Boundary

The next gate may execute the exact draft and these 21 rows only inside one
rollback-required transaction. It must independently prove the draft schema and
rows are absent afterward. This artifact does not apply the draft, connect to a
database, create canonical or sealed identities, publish data, access Storage,
change images, deploy code, or touch the active MTG worktree.
