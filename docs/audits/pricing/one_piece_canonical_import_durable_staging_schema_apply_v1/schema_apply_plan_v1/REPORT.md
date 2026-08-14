# One Piece Durable Staging Schema Apply Plan V1

- Status: **FROZEN / NOT EXECUTED**
- Migration: `20260814120000_one_piece_canonical_import_durable_staging_v1.sql`
- Migration SHA-256: `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Preflight fingerprint: `636c05c066bb51a80b02b4a84776590d3971ade109e8efa9958ddc6581e81bae`
- Apply-plan fingerprint: `ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58`
- Ledger fingerprint: `6895ee219cc369ebb29e0cd66e7f30d41ab805e3c8e6d6b02a74db4ac0ef185f`
- Ledger statements: `26`
- Tables: `2`
- One Piece staging rows authorized: `0`

## Boundary

Only the exact schema and ledger row are authorized. No One Piece payload, canonical, pricing, sealed, Vault, Storage, publication, deployment, or app-visible write is authorized.

## Guard Token

```text
EXECUTE_ONE_PIECE_DURABLE_STAGING_SCHEMA_ONLY:636c05c066bb51a80b02b4a84776590d3971ade109e8efa9958ddc6581e81bae:7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a:ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58:ZERO_ONE_PIECE_STAGING_ROWS
```
