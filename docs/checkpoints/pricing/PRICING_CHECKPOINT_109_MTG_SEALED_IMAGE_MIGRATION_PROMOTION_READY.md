# Pricing Checkpoint 109: MTG Sealed Image Migration Promotion Ready

## Context

Checkpoint 108 completed the approved no-write MTG sealed productization work.
The next serial gate was to promote the reviewed image evidence/release schema
and authenticated one-object signing authorization into one versioned migration,
then prove that package against production without applying it.

## Problem

The reviewed image schema and signing predicate existed as separate immutable
candidates. Production execution requires one atomic, hash-addressed migration
whose prerequisites, collision state, visibility boundaries, migration history,
and cross-game state are proven immediately before any later apply.

## Risk

- A stale candidate could be applied instead of the reviewed package.
- An existing relation, function, index, trigger, policy, or constraint could
  collide with the proposed migration.
- Migration history could already contain the selected version.
- A schema gate could accidentally alter sealed data, pricing, visibility,
  Storage, Vault, or another game.
- The trusted signer could be deployed before its authorization boundary exists.
- A successful read-only preflight could be mistaken for production apply.

## Decision

Promote both reviewed candidates into one atomic migration and require a
production read-only preflight from an exact clean producer commit. Keep the
migration unapplied, the signer undeployed, clients hard-disabled, and all data
and visibility unchanged until a separate authority explicitly names the
migration SHA-256 and producer commit.

The first preflight attempt stopped before artifact publication or any write
because its readback snapshot used two obsolete sealed table names. The query
was repaired to use `sealed_product_candidates` and
`sealed_product_variant_evidence`, a regression test was added, and the full
repository shipcheck passed before the successful production preflight.

## Alternatives Rejected

- Apply the two candidate SQL files separately: rejected because production
  identity and rollback reasoning require one atomic package.
- Deploy the signer with the schema: rejected because schema apply and function
  deployment are separate trust gates.
- Infer collision safety from repository history: rejected because production
  catalog state and migration history are authoritative.
- Continue after the stale-name query error without a clean commit: rejected
  because the successful proof must identify the exact code that produced it.

## Frozen Authority

- Branch: `agent/mtg-sealed-image-migration-promotion-v1`
- Package commit: `0a1c52a842bf9c78934ef00254324a2682b16dfa`
- Preflight producer commit:
  `3ba1ba69e39cf481b6b8076df292cce9e35b4124`
- Migration version: `20260904130000`
- Migration file:
  `supabase/migrations/20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql`
- Migration SHA-256:
  `0efd90e3291731f153afd901f23b51c264f4a0b0d27236c10bb34f82938c8406`
- Image-schema candidate SHA-256:
  `6a8143719633193c6d6f0d1ee3da2e95cb933f37194203cb95c7fc5314c5a735`
- Signing-authorization candidate SHA-256:
  `46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0`
- Trusted signer source SHA-256:
  `2dc6c3a6a275214dec9d39b29bd65e7ffc08f344c0ed327a1b5e76852478b30b`
- Trusted signer config SHA-256:
  `7551533d8029d2f2ff237c1ff0915b2758a25711aec701d6a5378cc7f7d94e3f`

## Production Preflight

The successful preflight ran in a transaction with both
`transaction_read_only` and `default_transaction_read_only` equal to `on`.
Every validation check passed:

- repository and package identities matched;
- migration ledger count for this version was `0`;
- duplicate repository migration versions were `0`;
- all prerequisite relations, functions, and roles were present;
- relation, function, index, trigger, policy, and constraint collisions were
  all empty;
- MTG had one active frozen price release with exactly `2,182` members;
- MTG catalog visibility remained `signed_in`;
- MTG sealed visibility remained `hidden`;
- One Piece retained one active frozen sealed price release;
- all six proposed image resources had zero production rows because the schema
  remains absent;
- before and after fingerprints matched at
  `c9401f2bd3b991a88c3787744e6a16a8519069029c370ddf224393a4b1e28fe2`.

Observed sealed-world counts were `479` families, `3,294` variants, `3,307`
candidates, `3,294` reviews, `3,294` mappings, `15,801` evidence rows, `3,153`
qualifications, two releases, `2,514` release members, two price pointers, and
two release controls.

## Verification

- Focused migration/candidate contract tests after repair: `19/19` passed.
- Full pre-commit shipcheck: passed.
- Flutter tests in the full shipcheck: `657/657` passed.
- Production preflight status: `PASS` with `16/16` checks true.
- Database writes: `0`.
- Storage reads/writes: `0/0`.
- Provider calls: `0`.
- Pricing and release-pointer writes: `0`.
- Visibility changes: `0`.
- Vault writes: `0`.
- Edge Function deployments: `0`.
- Client activations: `0`.

## Permanent Artifacts

Directory:

`docs/audits/pricing/mtg_sealed_image_migration_promotion_v1/2026-09-04T12-53-47-562Z_preflight/`

Key artifact hashes:

- `preflight.json`:
  `fb16878b11fcf10c1a374791dd3482466fad850c1406b2d78a049a73fb688e77`
- `summary.json`:
  `ecd8db977a3586d2ddae4a6c92078558bdd7a5acffbd7970d3316efb87b32cfd`
- `migration_apply_plan.json`:
  `3eb4356b6a8fca0424cc6cd3697c739551f057482e9cde237fc487e16560d862`
- `signer_deployment_plan.json`:
  `ffa5f432967c0a90be22f814dcde1f1e79f502765a9fcf7647491be07f8e9854`
- `MTG_SEALED_IMAGE_MIGRATION_PROMOTION_PREFLIGHT_V1.md`:
  `f04a2bf8b5d6097b20cbd116ca5fd0a36ed86bcfbfe803807284d4d19162b09b`

`artifact_hashes.json` is the permanent manifest for those five artifacts.

## Current Truths

- The migration package is repository-ready but unapplied in production.
- Production has no migration-ledger row for version `20260904130000`.
- The six proposed image resources and signing predicate do not yet exist in
  production.
- The trusted signer remains undeployed.
- Web and Flutter clients remain literal-false disabled and unreachable.
- The active MTG sealed price release remains frozen at 2,182 members and
  sealed visibility remains hidden.
- No image object, image evidence, assertion, image release, or image pointer
  has been written.

## Invariants

- A preflight does not grant apply or deployment authority.
- Migration identity is the exact filename, version, SHA-256, and producer SHA.
- The schema gate may create schema and one migration-ledger row only.
- It may not write image, pricing, release, pointer, visibility, Vault, or
  cross-game data.
- Authenticated clients receive no direct Storage list or read authority.
- Signer deployment and every Storage/data operation remain separate gates.

## What Must Never Be Broken

- Exact 2,182-member active MTG price authority before schema apply.
- Hidden MTG sealed visibility and unchanged One Piece state.
- Zero collisions and zero migration-ledger reuse before execution.
- One atomic migration with the frozen SHA-256 above.
- No client activation before image, price, RPC, signer, and signed-in canaries.
- No provider URL may become production image authority.

## Exact Next Gate

Obtain a separately scoped production authority for the schema-only apply of
the exact migration SHA-256
`0efd90e3291731f153afd901f23b51c264f4a0b0d27236c10bb34f82938c8406`
from producer commit
`3ba1ba69e39cf481b6b8076df292cce9e35b4124`.

That gate must rerun fresh preflight, apply only the migration and migration
ledger row, then read back the exact tables, constraint, indexes, triggers,
functions, grants, forced RLS, policies, signing authorization, anonymous
denial, migration ledger, unchanged sealed counts, unchanged visibility, and
unchanged cross-game state. It does not authorize signer deployment, Storage,
image data, pricing, release pointers, visibility activation, Vault writes, or
client activation.
