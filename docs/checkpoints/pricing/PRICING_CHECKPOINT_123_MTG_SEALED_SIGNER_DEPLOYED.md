# Pricing Checkpoint 123: MTG Sealed Signer Deployed

## Context

Checkpoint 122 installed the image-backed MTG sealed pricing RPC V3 while MTG
sealed visibility remained hidden. The next serial gate was deploying the
trusted exact-object signer without enabling the product or either client.

## Problem

The private self-hosted image objects could not be consumed through the future
signed-in client boundary. Direct collector Storage access, public bucket URLs,
or provider image URLs would violate the image authority contract.

## Risk

A broad or incorrectly targeted deployment could expose private object listing,
sign arbitrary paths, bypass visibility, deploy to the wrong Supabase project,
or modify image, pricing, pointer, visibility, Vault, or cross-game state.

## Decision

Deploy exactly `mtg-sealed-sign-image-v1` from a commit-bound source bundle.
Require an exact project, source bundle SHA-256, and plan fingerprint; capture
protected state before deployment; prove authentication and hidden-state
denial; and require exact protected-state equality after deployment.

## Alternatives Rejected

- Direct public Storage URLs: rejected because `user-card-images` remains
  private and object access must be individually authorized.
- Client-side `createSignedUrl`: rejected because collectors have no Storage
  signing authority.
- Deploy the feature branch through an unregistered workflow: rejected because
  GitHub only dispatches workflow files present on the default branch.
- Merge the full MTG workstream to register the workflow: rejected because only
  the manual deployment workflow was needed on `main`.
- Enable sealed visibility with the signer: rejected because publication is a
  separate gate.

## Deployment Applied

- Frozen producer commit:
  `f8af247aa1dc075d74a7839705a4ce7a561c2cc8`
- Signer source SHA-256:
  `2dc6c3a6a275214dec9d39b29bd65e7ffc08f344c0ed327a1b5e76852478b30b`
- Frozen bundle SHA-256:
  `a721f2e784bc5273adc2c1e2641f761d3175a2e7128f9600881f4aefd76f335c`
- Deployment plan fingerprint:
  `f9ecc69a99c9a9efb6727d4bd7f2f9e6c39992d6c751dd85289ea80dbbe3282d`
- Workflow registration PR: `#417`
- Workflow registration merge commit:
  `39adbf73e8f29ffb3bf24c6b51497862ef386d71`
- GitHub Actions run: `33971178286`
- Production function ID: `b92e46ea-11ac-460e-97d7-951a68a08a64`
- Production function version: `1`
- Production function state: `ACTIVE`
- Production project: `ycdxbpibncqcchqiihfz`

## Security Proof

- Anonymous `POST`: `401 unauthorized`
- Invalid bearer `POST`: `401 unauthorized`
- Unauthenticated `GET`: `405 method_not_allowed`
- Authenticated-role exact-object authorization while hidden: `false`
- Object listing operations in signer: none
- Direct download operations in signer: none
- Public URL operations in signer: none
- Provider image URLs in signer: none
- Signed URL lifetime if later authorized: one hour

The authenticated-role proof used an existing user inside a read-only rolled
back transaction. No user ID was written to the artifact.

## Boundary Proof

- Database writes: `0`
- Storage operations: `0`
- Pricing writes: `0`
- Pointer writes: `0`
- Visibility writes: `0`
- Vault writes: `0`
- Client activations: `0`
- Cross-game writes: `0`
- Protected-state drift: `0`

Before and after deployment, the system retained exactly:

- MTG image pointer:
  `86b207e6-4f73-5d9a-af40-864c47256c38`
- MTG price pointer:
  `25626032-7d72-5542-a8e0-7a6532c2f776`
- Image release members: `2,149`
- Image objects: `2,141`
- MTG private Storage objects: `2,141`
- MTG private Storage bytes: `157,335,339`
- Image evidence rows: `2,182`
- Image assertions: `2,149`
- Vault items: `450`
- Vault instances: `3,399`

## Current Truths

- The trusted signer is deployed and active in production.
- MTG catalog visibility remains `signed_in`.
- MTG sealed visibility remains `hidden`.
- Authenticated image signing remains denied while sealed is hidden.
- RPC V3 and the active image pointer remain installed.
- Web and Flutter MTG sealed clients remain literal hard-disabled.
- No signed-in collector can currently see MTG sealed through the clients.

## Invariants

- Signing requires a valid user, exact active price/image lineage, fresh exact
  English TCGPlayer evidence, exact byte-verified private object evidence, and
  both catalog and sealed visibility.
- The signer accepts one content-addressed MTG image path and never lists.
- Signer deployment does not imply product publication.
- Clients remain disabled until a separate signed-in canary passes.

## What Must Never Be Broken

Do not expose the private bucket, grant direct collector Storage access, accept
arbitrary object paths, return provider URLs, bypass hidden visibility, or treat
signer availability as authority to enable MTG sealed products.

## Verification

- Focused signer/client tests: `13/13` passed.
- Complete MTG sealed contract suite: `178/178` passed.
- Deno signer type check: passed.
- Producer commit full shipcheck: passed.
- Producer push full shipcheck: passed with `657/657` Flutter tests.
- Workflow registration commit full shipcheck: passed.
- Workflow registration push initially encountered one transient Flutter test
  loader failure; the isolated test passed, and the unchanged full retry passed
  with `657/657` Flutter tests.
- GitHub deployment/readback workflow: passed.
- Permanent audit files: `19` hashed files plus the aggregate hash manifest.
- Aggregate artifact manifest SHA-256:
  `366923bbef556e4e6a1a84ee45533237e1792b51c0aca743660659e973e6cd64`

## Permanent Evidence

- Contract:
  `docs/contracts/MTG_SEALED_SIGNER_DEPLOYMENT_GATE_V1.md`
- Deployment audit:
  `docs/audits/pricing/mtg_sealed_signer_deployment_gate_v1/2026-09-05T14-13-43Z_deploy/`
- GitHub run:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33971178286`

## Exact Next Gate

Prepare and run a zero-residue signed-in MTG sealed visibility canary. It must
prove RPC V3 rows and exact image signing through a real authenticated user,
then restore `hidden` and verify no residue. Do not durably enable visibility,
enable clients, schedule refresh, or publish anonymously in that canary.
