# One Piece Immutable Staging And Rollback Canary Plan V1

- Status: **planned only; no database connection or write**
- Producing commit: `0844f2d3a0e9625650929cc850216eb016f8ed60`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Manifest logical SHA-256: `e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9`
- Migration draft SHA-256: `7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591`
- Canary plan SHA-256: `174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90`
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
