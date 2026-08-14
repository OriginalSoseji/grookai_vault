# Cross-TCG Sealed Product Schema Apply Plan V1

- Status: **FROZEN / NOT EXECUTED**
- Migration: `20260814060000_cross_tcg_sealed_product_domain_v1.sql`
- Migration SHA-256: `794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4`
- Preflight fingerprint: `791bfb677a432b8ec9f7d8d027830fc96b21f40ccfbd0c0a528f1833baca28f7`
- Migration-plan fingerprint: `f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643`
- Apply-plan fingerprint: `c908fe55a4459b0b0e80bdd375ff8090ee84ad71d552ee21f9b8aaa195d14221`
- Ledger fingerprint: `a6eda9822abe8a0f7a684107ad0ac2c63a35a75f13f7c6bcdc932ea48e2ffd99`
- Ledger statements: `93`
- Sealed tables: `10`
- Sealed data rows authorized: `0`

## Boundary

This gate authorizes only one atomic schema migration and its exact migration-ledger row. It authorizes no sealed data, canonical/card/Vault/pricing/MTG rows, Storage, app access, publication, or deployment. The writer is fail-closed and has no global db-push path.

## Guard Token

```text
EXECUTE_CROSS_TCG_SEALED_SCHEMA_ONLY:791bfb677a432b8ec9f7d8d027830fc96b21f40ccfbd0c0a528f1833baca28f7:f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643:794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4:c908fe55a4459b0b0e80bdd375ff8090ee84ad71d552ee21f9b8aaa195d14221:ZERO_SEALED_DATA_ROWS
```
