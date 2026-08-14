# One Piece Canonical Import Production Rollback Canary V1

- Status: **BLOCKED**
- Executor: `ONE_PIECE_CANONICAL_IMPORT_ROLLBACK_CANARY_EXECUTOR_V1`
- Repository SHA: `f3674c964ffd72fe960621562125793f6ad5c191`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Plan fingerprint: `98bf6bfa61fdd38b8c3cadfccb0b64b4e6607381d66182226b34aff997deccef`
- Migration draft SHA-256: `e7a9f3afeb1ac1355955960f2ef5c5346fcd8988418c04ef1f75fcfc38ef74a9`
- Selected group: `3189`
- Transaction-local batch rows: `1`
- Transaction-local staging rows: `21`
- Rollback attempted: `true`
- Rollback succeeded: `true`
- Fresh read-only verification: `true`
- Durable schema objects: `0` required
- Durable rows authorized: `0`
- Findings: `1`

This executor has no commit path. The staging draft, one batch, and 21 exact
source rows exist only inside one transaction that is always rolled back. The
automatic post-rollback proof uses a newly created read-only connection. A
second standalone verifier remains required for independent confirmation.
