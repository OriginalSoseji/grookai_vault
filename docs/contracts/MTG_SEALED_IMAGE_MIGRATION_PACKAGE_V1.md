# MTG Sealed Image Migration Package V1

**Status:** Promoted and production-preflighted; unapplied and undeployed

**Date:** 2026-09-04

## Purpose

Promote the reviewed MTG sealed image evidence/release schema and authenticated
one-object signing predicate into one atomic production migration while keeping
all data, Storage, pricing, visibility, and client behavior unchanged.

## Frozen Package

- Base merged-main authority: `3545f2148d6cd194ffcf7f159b56f3ea692cdb5a`
- Migration version: `20260904130000`
- Migration file:
  `supabase/migrations/20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql`
- Migration SHA-256:
  `6de51515e500ae3e02039a21fc05b88b59019003f57f6b5319537794550072a9`
- Preserved image-schema candidate SHA-256:
  `6a8143719633193c6d6f0d1ee3da2e95cb933f37194203cb95c7fc5314c5a735`
- Preserved signing-authorization candidate SHA-256:
  `46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0`
- Trusted signer source SHA-256:
  `2dc6c3a6a275214dec9d39b29bd65e7ffc08f344c0ed327a1b5e76852478b30b`
- Trusted signer config SHA-256:
  `7551533d8029d2f2ff237c1ff0915b2758a25711aec701d6a5378cc7f7d94e3f`

## Migration Scope

If separately authorized and applied, this migration may create:

- six service-owned, forced-RLS image evidence/release resources;
- five indexes;
- nine integrity and append-only triggers;
- six service-role-only table policies;
- nine service-owned integrity, completeness, manifest, freeze, and pointer
  functions;
- one authenticated signing-authorization predicate;
- two unique binding constraints on existing sealed mapping/release-member
  tables; and
- one migration-ledger row written by the migration runner.

It contains one `BEGIN` and one `COMMIT`. The signing predicate grants only
`EXECUTE` to `authenticated` and `service_role`. It grants no
`storage.objects` privilege or policy.

## Release Completeness Boundary

The later image-data gate cannot freeze or activate a caller-selected subset.
For the bound source-plan and coverage fingerprints, the database requires:

- one evidence row for every member of the frozen source price release;
- exact identity parity between those evidence rows and source members;
- image-release members equal to every eligible evidence row and no excluded
  row;
- the declared eligible count equal to the database-derived eligible count;
- each member fingerprint derived from its release, variant, assertion,
  evidence, and verified image-object identities; and
- the ordered release manifest recomputed and matched at both freeze and
  activation.

For the current MTG audit, this means 2,149 eligible members and 33 explicit
exclusions must reconcile to all 2,182 source-price members. Once frozen, no
evidence may be appended under the release's audit fingerprints.

## Explicit Exclusions

The package does not authorize or contain:

- image evidence, object, assertion, release, member, or pointer data;
- Storage reads, uploads, deletes, listing, or public bucket changes;
- pricing, qualification, release, or pointer writes;
- catalog or sealed visibility changes;
- One Piece, card catalog, Vault, or ownership mutation;
- Edge Function deployment;
- client activation; or
- anonymous access.

## Trusted Signer

`mtg-sealed-sign-image-v1` remains undeployed. It validates the caller JWT,
asks the authenticated predicate about one exact content-addressed path, and
uses service authority to sign only that path for one hour. Web and Flutter
clients remain literal-false disabled and have no product-surface wiring.

## Required Preflight

Before any apply:

1. the exact producer commit and clean branch must be recorded;
2. all package hashes must match;
3. the production migration ledger must exist, match every repository migration
   version, and have only `20260904130000` pending;
4. all prerequisite relations, functions, and roles must exist;
5. every proposed relation, function, index, trigger, policy, and constraint
   must have zero collisions;
6. the MTG frozen price authority must remain at 2,182 members;
7. MTG sealed visibility must remain `hidden`;
8. One Piece state and all existing sealed counts must reconcile; and
9. the preflight must prove a read-only session and zero prohibited operations.

## Exact Next Gate

The read-only production preflight passed from producer commit
`15384f5aefa5240dc8bf68ab4e974d0e20b44f11`; its permanent evidence is linked
from Pricing Checkpoint 109. Do not apply the migration or deploy the signer
unless a later authority names the exact migration SHA-256 and producer commit.
The next serial gate is a separately authorized schema-only apply and exact
readback. It does not include signer deployment or any Storage/data operation.

The operator entrypoint is
`npm run mtg:sealed:image-schema-apply:v1`. Its default `--plan` mode reruns
the complete read-only production preflight and emits a commit-bound apply-plan
fingerprint plus the exact required authority text. Its `--apply` mode is
fail-closed unless the clean execution commit, fresh preflight, migration hash,
apply-plan fingerprint, and `MTG_SEALED_IMAGE_SCHEMA_APPLY_APPROVAL` value all
match. Apply mode performs an inside-transaction schema/security/ledger
readback before commit and an independent read-only connection readback after
commit. There is intentionally no production rollback-execution mode.
