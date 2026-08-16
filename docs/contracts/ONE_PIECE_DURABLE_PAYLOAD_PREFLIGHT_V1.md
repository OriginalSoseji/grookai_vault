# One Piece Durable Payload Preflight V1

## Purpose

This read-only production gate binds the frozen 1-batch/21-row One Piece
payload to the applied private schema and current TCGCSV source evidence.

## Required Proof

- Exact clean producer commit and branch.
- Exact frozen payload and schema plans.
- Applied schema, ledger, RLS, grants, and zero staging rows.
- Exact 21 current source products and their frozen price-lane evidence.
- Zero batch, payload-fingerprint, or source-product staging collisions.
- Zero database blockers and zero findings.

## Boundary

The preflight uses one repeatable-read, read-only transaction and rolls it back
before writing artifacts. It authorizes no database, canonical, sealed,
pricing, Storage, Vault, publication, deployment, or app-visible write.
