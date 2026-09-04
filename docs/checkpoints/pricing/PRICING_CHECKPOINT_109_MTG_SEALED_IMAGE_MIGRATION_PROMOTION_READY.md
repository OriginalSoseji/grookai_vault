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

Automated review then identified that the first successful proof did not bind
the connection to the canonical Supabase project, did not include the rulebook
canonical-count invariants, required the historical topic-branch name, and did
not expose the new command in the operator playbook. Those findings were
repaired before final readiness. The earlier successful artifact remains
preserved as historical evidence but is not apply authority.

Final-head review then identified two SQL integrity gaps: PostgreSQL could
accept incomplete eligible evidence when a required comparison evaluated to
`NULL`, and image object paths were shape-checked without being bound to the
row's game, content hash, and MIME extension. Both constraints were repaired,
their contract coverage was added, and the production preflight was regenerated
from the new clean producer commit. All earlier preflight artifacts remain
preserved but are superseded by the canonical preflight below.

A subsequent review found that the preflight checked only the target migration
instead of reconciling the complete production ledger, and that release-member
inserts were not serialized against freezing. The scanner now includes both
legacy 8-digit and current 14-digit migration receipts and requires complete
repository/remote version parity with this migration as the sole pending
version. Member insertion now holds a `FOR SHARE` lock on the parent release,
which conflicts with the freeze function's `FOR UPDATE` lock.

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
- Final preflight producer commit:
  `55bd392b94a782dff1f180dd2831735e2c0b0bd5`
- Migration version: `20260904130000`
- Migration file:
  `supabase/migrations/20260904130000_mtg_sealed_image_evidence_and_signing_authorization_v1.sql`
- Migration SHA-256:
  `ceafd70f206e5223bc87b3fa24f4cd3c105c54e3149f5bbbeb88daac140ba184`
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

- repository, API, and database project refs all matched canonical production
  project `ycdxbpibncqcchqiihfz`;
- canonical counts were `170,404` card prints, `3,397` sets, and `32,903`
  card-print trait rows, all above the rulebook minimums;
- card-print trait orphans were `0`;
- repository and package identities matched;
- the migration ledger existed and reconciled exactly: `383` repository
  versions, `382` production versions, zero missing/unexpected/duplicate
  versions, and only `20260904130000` pending;
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
  `988f55952a35acb83d1692296f8e7b676bb607841eb56fddbfba54adc5ca24a5`.

Observed sealed-world counts were `479` families, `3,294` variants, `3,307`
candidates, `3,294` reviews, `3,294` mappings, `15,801` evidence rows, `3,153`
qualifications, two releases, `2,514` release members, two price pointers, and
two release controls.

## Verification

- Focused sealed-image and forward-gate contract tests after the final review
  repair: `47/47` passed.
- The repository-wide shipcheck passed backend contracts, web typecheck/lint,
  strict web build, and Flutter analysis. Its Flutter run had two test-file
  load transport failures (`HttpException` on localhost), not assertion
  failures; both affected files then passed directly at `16/16`.
- Production preflight status: `PASS` with `18/18` checks true.
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

`docs/audits/pricing/mtg_sealed_image_migration_promotion_v1/2026-09-04T14-46-04-690Z_canonical_preflight/`

Key artifact hashes:

- `preflight.json`:
  `7e18cfa019a10350b8ab165d53b78184b9507c9515d2a00bfa0187205de464eb`
- `summary.json`:
  `c19321155df4c83fc3d0ad688b36b52a57db8d855dd2827af30d31d35e18facc`
- `migration_apply_plan.json`:
  `8c9b3b61035d61d4cf0c33f0181c0665ebd009133a3d0ec0df10bf3990b35c0e`
- `signer_deployment_plan.json`:
  `c4ac8f90cdb6daa37c0524eee07946eb21d865300067dbb836ee66287b61aa49`
- `MTG_SEALED_IMAGE_MIGRATION_PROMOTION_PREFLIGHT_V1.md`:
  `1a09f0ed78cb38c7f70c081e85512526851dff0470e2066fe3ea20ae0a52fe3a`

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
`ceafd70f206e5223bc87b3fa24f4cd3c105c54e3149f5bbbeb88daac140ba184`
from producer commit
`55bd392b94a782dff1f180dd2831735e2c0b0bd5`.

That gate must rerun fresh preflight, apply only the migration and migration
ledger row, then read back the exact tables, constraint, indexes, triggers,
functions, grants, forced RLS, policies, signing authorization, anonymous
denial, migration ledger, unchanged sealed counts, unchanged visibility, and
unchanged cross-game state. It does not authorize signer deployment, Storage,
image data, pricing, release pointers, visibility activation, Vault writes, or
client activation.
