# Pricing Checkpoint 110: MTG Sealed Image Schema Applied

## Context

Checkpoint 109 froze the reviewed MTG sealed image evidence, immutable image
release, and signing-authorization schema as one exact migration. The user then
granted a schema-only production authority tied to the migration bytes,
execution commit, and apply-plan fingerprint.

## Problem

The image layer could not proceed to a transient Storage canary until production
had the append-only evidence tables, immutable release boundary, forced RLS,
exact grants, and the database authorization predicate required by the future
trusted signer. Applying more than those objects would have crossed into image
data, Storage, pricing, visibility, Vault, or client activation.

## Risk

- An incorrect migration or stale plan could mutate production.
- Partial DDL could leave the image trust boundary inconsistent.
- App roles could receive direct access to service-owned tables.
- The signing predicate could allow anonymous or unbacked object signing.
- Existing MTG pricing, MTG visibility, One Piece state, or canonical catalog
  rows could change during a schema gate.
- A successful schema apply could be mistaken for signer deployment or image
  availability.

## Decision

Apply exactly migration `20260904130000` in one transaction from execution
commit `3eccc923011be7f399ba1b54d12878361526e7b5`. Validate the complete schema and
security inventory before commit, insert exactly one migration-ledger row, then
open a separate read-only connection and repeat the durable readback.

The first shell orchestration attempt produced no apply artifacts. A fresh
read-only production preflight then proved that the target remained the sole
pending migration, all target schema objects were absent, and no production
boundary had changed. The exact authority was therefore still unused. The
subsequent guarded operation committed successfully.

## Alternatives Rejected

- Supabase CLI bulk migration apply: rejected because the authority covered one
  exact migration only.
- Deploy the signer in the same operation: rejected because deployment is a
  separate trust and rollback gate.
- Seed image rows or create an image release immediately: rejected because this
  authority was schema-only.
- Activate MTG sealed visibility after schema apply: rejected because image,
  pricing, RPC, signer, and signed-in canaries remain serial gates.

## Applied Authority

- Execution commit: `3eccc923011be7f399ba1b54d12878361526e7b5`
- Migration:
  `supabase/migrations/20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql`
- Migration SHA-256:
  `6de51515e500ae3e02039a21fc05b88b59019003f57f6b5319537794550072a9`
- Apply-plan fingerprint:
  `6b3b58a41f9cbbe6377c1d0eb51b17321b813c2a7634fb15bfeccb37aa3e23ef`
- Migration-ledger rows written: `1`
- Migration statement count recorded in the ledger: `83`

## Durable Readback

The independent post-commit transaction had `transaction_read_only=on` and was
closed before audit artifacts were written. It returned zero findings.

- Repository migrations: `383`
- Production migration-ledger rows: `383`
- Target migration-ledger rows: `1`
- Target schema tables: `6`
- Constraints: `72`
- Indexes: `29`
- Functions: `10`
- Triggers: `9`
- Policies: `6`
- Table grants: `11`
- Routine grants: `4`

All six target tables have forced RLS and contain zero rows:

- `sealed_product_image_evidence`
- `sealed_product_image_objects`
- `sealed_product_variant_image_assertions`
- `sealed_product_image_releases`
- `sealed_product_image_release_members`
- `sealed_product_image_release_pointer`

Grant and signing boundaries read back as follows:

- `anon` and `authenticated` have no direct target-table privileges;
- target-table grants are service-role-only;
- `anon` cannot execute the signing-authorization predicate;
- `authenticated` and `service_role` may execute that predicate;
- the predicate returns `false` against the empty image state.

## Protected Boundary Proof

The independent readback preserved:

- canonical card prints: `170,404`;
- canonical sets: `3,397`;
- card-print traits: `32,903` with `0` orphans;
- sealed families/variants: `479` / `3,294`;
- MTG active frozen price release: `1` with `2,182` members;
- MTG catalog visibility: `signed_in`;
- MTG sealed visibility: `hidden`;
- One Piece active frozen sealed price release: `1`.

This operation performed zero image/data rows, Storage operations, pricing
operations, release-pointer operations, visibility changes, Vault operations,
signer deployments, or client activations.

## Permanent Artifacts

Directory:

`docs/audits/pricing/mtg_sealed_image_schema_apply_v1/2026-09-04T20-30-00Z_production/`

Verified artifact hashes:

- `summary.json`:
  `66185bab70fa9528cf721c6abedf40c8a7facf1f1aa9fb5fe8e30ee12852beb6`
- `independent_post_apply_readback.json`:
  `96b27068d2c61017de2f2691f21b5ed90f081147ce27bfc08c567dc1469e911a`
- `REPORT.md`:
  `4cda7aac1934686ca7d6983b8f808c5c8c8e74071a61ee4d6f57cd64d2ec7480`

`artifact_hashes.json` matches the bytes of all three permanent artifacts.

## Current Truths

- Migration `20260904130000` is durably applied in production.
- The complete image schema and authorization predicate exist and passed exact
  inventory/security readback.
- Every image table is empty and no image release or pointer exists.
- The trusted signer is not deployed.
- No Storage object has been read, written, or signed by this gate.
- MTG sealed remains hidden and the existing price release is unchanged.
- Clients remain disabled for MTG sealed images.

## Invariants

- Schema existence is not image evidence.
- Signing authorization is not signer deployment.
- Authenticated execution of the predicate never grants direct table or Storage
  access.
- Only exact, content-addressed, evidence-backed image objects may enter a later
  canary.
- Image release activation remains separate from price release and visibility
  activation.
- Cross-game, Vault, canonical identity, and pricing data remain outside this
  gate.

## What Must Never Be Broken

- Forced RLS and service-owned target tables.
- Anonymous signing denial and false empty-state authorization.
- Exact binding between image evidence, source mapping, object bytes, audited
  coverage, source price release, and immutable image release.
- Complete eligible-set reconciliation at image freeze and activation.
- Hidden MTG sealed visibility until all later gates pass independently.
- Unchanged One Piece and canonical catalog state.

## Exact Next Gate

Prepare and execute a transient MTG sealed image Storage canary under a new,
separately fingerprinted authority. The canary must use the already frozen
17-object plan, perform collision preflight, upload only those exact
content-addressed objects, read back exact bytes and hashes, exercise the
trusted one-object signing path only after separately deploying it if required,
then remove every transient object and prove absence.

That gate must not write durable image evidence, image assertions, image
releases, pricing, visibility, Vault, canonical catalog, or cross-game data.
