# Cross-TCG Sealed Product Schema Apply Plan V1

- Status: **FROZEN / NOT EXECUTED**
- Migration: `20260814060000_cross_tcg_sealed_product_domain_v1.sql`
- Migration SHA-256: `f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0`
- Preflight fingerprint: `e8e7915888865e5b227f6b09b7a1a144d4780ae15ea0aebe552e6b0c232da740`
- Migration-plan fingerprint: `9ba9803731eac32e3fd63dc4bdf3e07b781f3a71d9f919cf15b0f2b552ab225b`
- Apply-plan fingerprint: `0325db8d8a4328cacba7026e2e37d3ac8a15d3cb107e98de866645e793b7942b`
- Ledger fingerprint: `560b00d18395741a2636e2437656165a8c648bb50d50e035f2635349fa1b2314`
- Ledger statements: `93`
- Sealed tables: `10`
- Sealed data rows authorized: `0`

## Boundary

This gate authorizes only one atomic schema migration and its exact migration-ledger row. It authorizes no sealed data, canonical/card/Vault/pricing/MTG rows, Storage, app access, publication, or deployment. The writer is fail-closed and has no global db-push path.

## Guard Token

```text
EXECUTE_CROSS_TCG_SEALED_SCHEMA_ONLY:e8e7915888865e5b227f6b09b7a1a144d4780ae15ea0aebe552e6b0c232da740:9ba9803731eac32e3fd63dc4bdf3e07b781f3a71d9f919cf15b0f2b552ab225b:f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0:0325db8d8a4328cacba7026e2e37d3ac8a15d3cb107e98de866645e793b7942b:ZERO_SEALED_DATA_ROWS
```
