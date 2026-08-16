# One Piece Durable Service-Only Staging Schema V1

- Status: **OFFLINE_DURABLE_STAGING_DESIGN_READY_FOR_PRODUCTION_READ_ONLY_PREFLIGHT**
- Producing commit: `e755cc28e9fae221f204b5dd470a7c3bf9165adf`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Migration candidate SHA-256: `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Rollback candidate SHA-256: `60a17c8daeae7a7e306dec74178fd8b7f95368f701b41d8b5ed18447740b9bc1`
- Plan fingerprint: `75187d3758b726426aadcae8533ddb9ecd4083cb413850fd1c50dca5e4ad3d46`
- Database connections: `0`
- Database writes: `0`

## Proven Input

The production rollback-only canary passed with plan
`174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90`, and the
standalone verifier reported `rollback_independently_verified`.
The hash-bound canary draft remains unchanged.

## Durable Design Boundary

The candidate creates only two FORCE-RLS staging tables, one internal mutation
rejection function, two immutable triggers, four service-role policies, and two
indexes. Effective service-role authority is limited to SELECT and INSERT.
There is no canonical promotion, app RPC, public read, pricing publication,
Storage operation, image mutation, Vault write, or staging data write.

The rollback candidate is fail-closed: it refuses to run when either staging
table contains a row or when later migrations exist.

## Exact Next Gate

Run a separately governed production **read-only preflight** for proposed
migration `20260814120000_one_piece_canonical_import_durable_staging_v1`.
It must verify migration-version and object-name availability, capture effective
role privileges and protected-domain baselines, account for concurrent MTG
growth, and perform zero writes. Stop before copying this candidate into
`supabase/migrations` or applying it.
