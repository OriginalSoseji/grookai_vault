# MTG Sealed RPC V3 Apply V1

**Status:** Forward migration and guarded executor prepared

**Date:** 2026-09-05

## Purpose

Promote the reviewed MTG sealed image-backed pricing RPC V3 under a forward-only
migration and prove its production schema, ACL, visibility, and data boundaries
without enabling any client surface.

## Authority

The promoted function derives from candidate SHA-256
`5e3872f8d433d0e360a3039ba62a5a6d009c6a36ad0112479cb298220450a5a2`.
The migration uses version `20260905070000`, after all image schema and pointer
dependencies. Its exact migration hash and execution-plan fingerprint are
recorded by the plan artifact produced from the frozen execution commit.

## Apply Boundary

The durable transaction may create or replace exactly one function and insert
exactly one migration-ledger row. It may change function ACLs and the function
comment contained in that migration.

It may not write sealed-product data, image evidence, Storage, pricing,
pointers, visibility controls, Vault data, clients, signer deployments,
scheduling, another game, updates, or deletes.

## Required Proof

- The reviewed candidate hash remains exact.
- Production dependencies and active frozen image/price authority are exact.
- MTG catalog visibility is `signed_in` and sealed visibility is `hidden`.
- A rollback canary creates the function and ledger row, validates them, rolls
  back, and independently proves zero residue.
- Durable apply reads back the exact signature, `stable` volatility,
  `security definer`, fixed search path, and grants.
- `authenticated` and `service_role` can execute, while `anon` and `public`
  cannot.
- Authenticated execution returns zero rows while sealed visibility is hidden.
- Structural evidence still proves eligible image/price rows and explicit
  missing-image exclusions.
- Protected data counts, release pointers, and visibility values do not change.

## Stop Boundary

Stop after durable independent readback. Do not deploy the signer, activate a
client, or change sealed visibility in this gate.
