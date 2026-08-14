# Sealed Product Schema/Security Production Preflight V1

- Result: **PASS**
- Producer SHA: `3644fa14146b06325044bc0c5d0ce45bf8962e69`
- Migration SHA-256: `794ba84ce5fcd57568d7b94536ec06dbdb7d8b4d171a0f2895e6e0b808f895d4`
- Migration-plan fingerprint: `f95ee1e0787f14801ba3b24f313f40a391325d2169eda0798f0fe32dfe948643`
- Reserved migration: `20260814060000_cross_tcg_sealed_product_domain_v1.sql`
- Transaction read-only: `on`
- Transaction closed before artifacts: `true`
- Candidate collisions: `{"tables":0,"functions":0,"indexes":0,"policies":0,"triggers":0}`
- Protected schema fingerprint: `1224bc0fa350de813e0055b22ed95080b381a0986ed040b1823b9cdb3349bccb`
- Protected row fingerprint: `05d5d2844b70212dc55919bcacd8e1791c7f404f352f07ebd9ca2406e9bbcc54`
- Findings: `0`

## Findings

- None

## Boundaries

No DDL, migration apply/history write, canonical write, pricing/Vault/MTG write, Storage, publication, deployment, or app visibility occurred.

## Exact Next Gate

Create the reserved Supabase migration from the exact candidate bytes, produce a schema-only apply plan bound to this preflight, and request explicit approval for one atomic schema apply plus schema/RLS/grant readback. Do not run the no-publication data canary.
