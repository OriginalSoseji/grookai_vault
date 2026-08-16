# One Piece Canonical Import Production Rollback Canary V1

- Status: **BLOCKED**
- Executor: `ONE_PIECE_CANONICAL_IMPORT_ROLLBACK_CANARY_EXECUTOR_V1`
- Repository SHA: `d1e9da5b4fffe42a98f23aa55417b5e36a4b645a`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Plan fingerprint: `98bf6bfa61fdd38b8c3cadfccb0b64b4e6607381d66182226b34aff997deccef`
- Migration draft SHA-256: `e7a9f3afeb1ac1355955960f2ef5c5346fcd8988418c04ef1f75fcfc38ef74a9`
- Selected group: `3189`
- Transaction-local batch rows: `0`
- Transaction-local staging rows: `0`
- Rollback attempted: `false`
- Rollback succeeded: `false`
- Fresh read-only verification: `false`
- Durable schema objects: `0` required
- Durable rows authorized: `0`
- Findings: `1`

This executor has no commit path. The staging draft, one batch, and 21 exact
source rows exist only inside one transaction that is always rolled back. The
automatic post-rollback proof uses a newly created read-only connection. A
second standalone verifier remains required for independent confirmation.
