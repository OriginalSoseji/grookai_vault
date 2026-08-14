# Sealed Product Schema/Security Production Preflight V1

- Result: **PASS**
- Producer SHA: `111314c537cb0b05673e4fc521dd8a7d91875835`
- Migration SHA-256: `f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0`
- Migration-plan fingerprint: `9ba9803731eac32e3fd63dc4bdf3e07b781f3a71d9f919cf15b0f2b552ab225b`
- Reserved migration: `20260814060000_cross_tcg_sealed_product_domain_v1.sql`
- Transaction read-only: `on`
- Transaction closed before artifacts: `true`
- Candidate collisions: `{"tables":0,"functions":0,"indexes":0,"policies":0,"triggers":0}`
- Protected schema fingerprint: `1224bc0fa350de813e0055b22ed95080b381a0986ed040b1823b9cdb3349bccb`
- Protected row fingerprint: `5ca9245bb483aad2cbf1a8a9eb2f11e2ca02e4a985e2e486b83d40871ce7a7ba`
- Findings: `0`

## Findings

- None

## Boundaries

No DDL, migration apply/history write, canonical write, pricing/Vault/MTG write, Storage, publication, deployment, or app visibility occurred.

## Exact Next Gate

Produce a schema-only apply plan bound to this preflight, then execute one atomic schema apply plus schema/RLS/grant readback. Do not run the no-publication data canary.
