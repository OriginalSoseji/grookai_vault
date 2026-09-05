# Pricing Checkpoint 121: MTG Sealed Image Pointer Activated

## Context

Checkpoint 120 proved the repaired image-pointer compare-and-swap path in a
production transaction that was rolled back. The frozen MTG sealed image
release remained durable but inactive until a separately planned and
authorized pointer activation could be executed and read back.

## Problem

The self-hosted MTG sealed image bytes and immutable database image release
could not become an active source of image authority without a durable pointer.
Activating that pointer had to preserve the separation between image authority,
client visibility, signing, RPC deployment, and all pricing or Vault data.

## Risk

A direct insert or an unguarded retry could bypass release, manifest, active
price-release, and expected-current-pointer checks. Treating pointer activation
as visibility authority could expose MTG sealed products or Storage objects
before the separately reviewed client boundary exists.

## Decision

Use the governed `sealed_product_set_active_image_release_v1` compare-and-swap
function from exact producer
`f6339fea83facccd58cf8f6e9ea2907f38390fc0`, with an expected current pointer of
`null`. Authorize exactly one pointer insert and prove the committed state with
an independent read-only connection. Then attempt the stale `null`
compare-and-swap again to prove that the consumed authority cannot be replayed.

## Alternatives Rejected

- Direct pointer insertion: rejected because it bypasses governed release and
  compare-and-swap checks.
- Pointer upsert without expected-current state: rejected because it permits
  silent replacement.
- Combining activation with RPC, signer, visibility, or client deployment:
  rejected because those are independent trust boundaries.
- Rerunning after truncated console output: rejected until the durable state and
  audit artifacts were independently inspected.

## Activation Applied

- Producer commit:
  `f6339fea83facccd58cf8f6e9ea2907f38390fc0`
- Activation plan fingerprint:
  `191a12efe5772a11ebd1b35295f8ce38ee7669204b8240cdcd669ee021634736`
- Target image release:
  `86b207e6-4f73-5d9a-af40-864c47256c38`
- Target manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`
- Required active price release:
  `25626032-7d72-5542-a8e0-7a6532c2f776`
- Expected previous pointer: `null`
- Durable pointer inserts: `1`
- Durable pointer updates: `0`
- Transaction committed: `true`
- Independent pointer readback exact: `true`
- Stale null compare-and-swap rejected: `true`

## Boundary Proof

- Image evidence writes: `0`
- Storage operations: `0`
- Pricing writes: `0`
- Visibility writes: `0`
- Vault writes: `0`
- Signer deployments: `0`
- RPC deployments: `0`
- Client activations: `0`
- Cross-game writes: `0`
- Deletes: `0`
- Protected-state drift outside the permitted pointer: `0`
- Security-boundary drift: `0`

## Current Truths

- The active MTG image pointer now targets the frozen 2,149-member image release.
- The image release remains bound to active frozen price release
  `25626032-7d72-5542-a8e0-7a6532c2f776`.
- The release contains 2,182 evidence rows, 2,141 self-hosted objects, 2,149
  assertions, and 33 explicit exclusions.
- MTG catalog visibility remains `signed_in`.
- MTG sealed visibility remains `hidden`.
- Image signing remains denied while sealed visibility is hidden.
- RPC V3 remains undeployed.
- The original expected-null activation authority is consumed and cannot be
  replayed.

## Invariants

- Pointer changes must continue through the governed compare-and-swap function.
- An image release must remain frozen, manifest-exact, and bound to the active
  frozen price release before it can be activated.
- Pointer presence alone must never grant image signing or client visibility.
- The 33 exclusions must remain explicit coverage gaps and must not inherit
  representative images.
- RPC, signer, client, visibility, pricing, and scheduler changes remain
  independently authorized gates.

## What Must Never Be Broken

Do not expose raw Storage paths, bypass the pointer compare-and-swap, mutate the
frozen image release, infer images for excluded variants, or treat this pointer
as authority to publish MTG sealed products.

## Verification

- Precommit validation findings: `0`
- Transaction write attribution: exactly one pointer insert
- Independent read-only release/price binding: valid
- Candidate structural eligibility: valid
- Signing while hidden: denied
- Stale compare-and-swap SQLSTATE: `40001`
- Permanent audit artifact hashes: `8/8` valid

## Permanent Evidence

- Plan-only package:
  `docs/audits/pricing/mtg_sealed_image_pointer_apply_v1/2026-09-05T04-20-35Z_plan_only/`
- Durable activation and readback:
  `docs/audits/pricing/mtg_sealed_image_pointer_apply_v1/2026-09-05T06-07-42Z_apply/`
- Apply contract:
  `docs/contracts/MTG_SEALED_IMAGE_POINTER_DURABLE_APPLY_V1.md`

## Exact Next Gate

Apply and prove the separately reviewed RPC V3 migration candidate. That gate
must not enable MTG sealed visibility, deploy a signer or client, mutate image
evidence or Storage, write pricing or Vault data, or activate scheduling.
