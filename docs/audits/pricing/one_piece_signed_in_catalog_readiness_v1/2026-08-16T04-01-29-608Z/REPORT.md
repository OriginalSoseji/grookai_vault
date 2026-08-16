# One Piece Signed-In Catalog Readiness V1

- Result: **SIGNED_IN_CATALOG_READINESS_PASSED_ZERO_RESIDUE**
- Producer commit: `85bbcb6c72c95627869c7619a19c438a53f0cfcc`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Transaction committed: `false`
- Durable database writes: `0`

## Catalog Truth

- Games: `1`
- Sets: `60`
- Parent cards: `6730`
- Active identities: `6730`
- Child printings: `14`
- Exact self-hosted images: `6553`
- Explicit image coverage gaps: `177`

## Visibility Proof

- Anonymous One Piece games/sets/cards: `0/0/0`
- Authenticated One Piece games/sets/cards: `1/60/6730`
- Print-identity search matches: `1`
- Legacy search matches: `1`
- Direct card matches: `1`
- Signed-in sealed prices returned: `100`
- Anonymous sealed RPC execute: `false`

## Rollback Proof

- Release control restored hidden: `true`
- Release fingerprint unchanged: `true`
- One Piece catalog fingerprint unchanged: `true`
- Non-One Piece boundary unchanged: `true`

## Decision

The database visibility boundary is ready for a separately governed signed-in activation. The catalog remains hidden after this rollback-only proof.

## Findings

- None.
