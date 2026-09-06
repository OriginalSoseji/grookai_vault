# Pricing Checkpoint 119: MTG Sealed Image Release Applied

## Context

Checkpoint 118 proved the complete 8,622-row MTG sealed image evidence payload
and release freeze inside a production transaction, then rolled it back and
verified zero residue. The durable executor was subsequently added because the
rollback producer commit had no commit-capable path.

## Problem

The 2,141 self-hosted image objects were not yet connected to governed database
evidence, exact variant assertions, or an immutable image release. Storage
existence alone could not authorize clients or establish which image proved
which MTG sealed variant.

## Risk

A partial commit, wrong source lineage, incorrect object binding, omitted
exclusion, manifest drift, or accidental image-pointer update could expose the
wrong sealed image. Reusing the prior rollback-only execution fingerprint would
also have broken the exact code-to-authority provenance boundary.

## Decision

Add the guarded durable executor, rerun the complete 77-test MTG image contract
suite, and generate a new read-only execution plan from clean producer commit
`107735b2cf61145b883a550f37b9c5de91b9ee06`.

Apply only the exact authorized plan:

- Execution fingerprint:
  `0e477804e8f7fb653b118e4567d9dca6d7b2663d8dd532073d1986c8e9aeb440`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Durable Storage execution fingerprint:
  `ce99331a559a62d78a2ef2fffa389d30498df16928f4de9d7e1d58cec8ff426e`
- Image release plan fingerprint:
  `7c7f65ed0d281fec9f9b0e65f74c6b695828445bcf45fb2dcd98baab814c68a9`
- Release ID: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`

## Durable Apply Result

The single production transaction committed exactly:

- Image evidence: `2,182`
- Image objects: `2,141`
- Variant image assertions: `2,149`
- Image releases: `1`
- Image release members: `2,149`
- Total inserts: `8,622`
- Governed draft-to-frozen release transitions: `1`

Write attribution contained only those five tables and exact counts. No row was
upserted, deleted, or separately updated. The only update was the schema-owned
draft-to-frozen transition.

## Independent Readback

After commit, a new read-only database connection proved:

- All five payload datasets matched every planned field: `true`
- Release state: `frozen`
- Database manifest matched the plan: `true`
- Evidence-only exclusions: `33`
- Image pointer rows for MTG: `0`
- Protected production boundaries unchanged: `true`
- RLS and grant boundaries unchanged: `true`
- Complete identical release needs additional rows on rerun: `0`
- Post-apply findings: `0`

## Boundaries

- Storage operations: `0`
- Image pointer writes: `0`
- Pricing writes: `0`
- Visibility writes: `0`
- Vault writes: `0`
- Signer deployments: `0`
- Client activations: `0`
- Cross-game writes: `0`
- Deletes: `0`

MTG sealed remains hidden. The frozen image release is durable but inactive.

## Verification

- MTG sealed image contract suite: `77/77` passed.
- Syntax checks: passed.
- `git diff --check`: passed.
- Read-only plan artifacts verified: `4/4`.
- Durable apply artifacts verified: `6/6`.
- Transaction-local precommit validation: passed.
- Independent post-apply validation: passed.
- Zero-row idempotency classification:
  `complete_identical_frozen_release_requires_zero_additional_rows`.

## Permanent Evidence

- Zero-write authority plan:
  `docs/audits/pricing/mtg_sealed_image_release_apply_v1/2026-09-05T02-10-01Z_plan_only/`
- Durable apply and readback:
  `docs/audits/pricing/mtg_sealed_image_release_apply_v1/2026-09-05T03-10-31Z_apply/`
- Rollback proof:
  `docs/audits/pricing/mtg_sealed_image_release_rollback_canary_v1/2026-09-05T01-59-17Z_production_rollback/`
- Contract: `docs/contracts/MTG_SEALED_IMAGE_RELEASE_APPLY_V1.md`

## Current Truths

- Every MTG sealed source release member has durable image evidence.
- Every one of the 2,149 eligible variants has an exact assertion linked to a
  byte-verified self-hosted object.
- All 33 unavailable or invalid source images remain explicit evidence-only
  exclusions.
- The immutable MTG image release is frozen and exactly read back.
- No MTG image release is active because the image pointer remains absent.
- No client can use this release yet.

## Invariants

- Do not mutate or delete the append-only image evidence release.
- Do not infer authority for the 33 exclusions.
- Image activation must compare-and-swap from the exact null pointer baseline.
- The active image release must remain bound to the active frozen exact price
  release.
- Pointer activation must remain separate from signer, RPC, client, visibility,
  and scheduler changes.

## What Must Never Be Broken

Do not substitute representative packaging for excluded variants. Do not expose
Storage paths without active release authority. Do not combine pointer,
visibility, pricing, signer, and client activation into one unreviewable change.

## Exact Next Gate

Build and run a rollback-only image-pointer compare-and-swap canary from the
current null pointer to release `86b207e6-4f73-5d9a-af40-864c47256c38`.
Inside the transaction, verify the active image release remains bound to active
price release `25626032-7d72-5542-a8e0-7a6532c2f776`, exercise one authorized
signing predicate and one bounded RPC V3 read if the schema permits, then roll
back and prove the pointer returns to null. Durable pointer activation requires
separate exact authority after that proof.
