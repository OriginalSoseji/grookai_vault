# Sealed Product Schema/Security Production Preflight V1

- Result: **BLOCKED**
- Producer SHA: `f598081266783181bc97eb2cfdadb00f7d20d768`
- Migration SHA-256: `f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0`
- Migration-plan fingerprint: `9ba9803731eac32e3fd63dc4bdf3e07b781f3a71d9f919cf15b0f2b552ab225b`
- Reserved migration: `20260814060000_cross_tcg_sealed_product_domain_v1.sql`
- Transaction read-only: `on`
- Transaction closed before artifacts: `true`
- Candidate collisions: `{"tables":0,"functions":0,"indexes":0,"policies":0,"triggers":0}`
- Protected schema fingerprint: `1224bc0fa350de813e0055b22ed95080b381a0986ed040b1823b9cdb3349bccb`
- Protected row fingerprint: `8f279e5ff7fa3efd73372918785823aff49ba7c385dc222523193fe1c45c1170`
- Findings: `2`

## Findings

- candidate_already_in_applied_migration_path
- reserved_migration_version_not_after_local_history

## Boundaries

No DDL, migration apply/history write, canonical write, pricing/Vault/MTG write, Storage, publication, deployment, or app visibility occurred.

## Exact Next Gate

Stop before migration apply. Resolve the reported preflight findings, rerun this exact read-only gate from a new frozen producer, and do not create the reserved migration file yet.
