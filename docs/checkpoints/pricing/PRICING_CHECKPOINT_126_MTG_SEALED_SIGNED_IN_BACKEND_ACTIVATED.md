# Pricing Checkpoint 126: MTG Sealed Signed-In Backend Activated

## Context

Checkpoint 125 froze the exact durable transition for MTG sealed visibility
after a rollback-only production proof. MTG sealed pricing, images, RPC V3,
and the trusted image signer were already present and mutually bound, but the
game release-control row remained `hidden` and both clients remained disabled.

## Problem

The production backend still needed one durable, stale-authority-safe
transition to `signed_in`. The transition had to prove that a real signed-in
user could read an authorized row and its exact private image without exposing
the corpus anonymously, mutating any product data, or leaving a test identity
behind.

## Risk

An unsafe activation could overwrite a newer decision, expose rows or image
signing anonymously, bind the wrong price or image release, mutate unrelated
production state, leave an Auth fixture behind, or enable clients before the
backend boundary was proven.

## Decision

Execute the frozen activation from its exact clean producer commit in an
isolated checkout. Permit one complete-row compare-and-swap against the MTG
entry in `sealed_product_game_release_controls`, then require immediate
real-auth RPC, signer, exact-image-byte, anonymous-denial, protected-state,
disabled-client, and zero-auth-residue readback. The operator retained the
frozen automatic rollback authority for any failed post-commit proof.

## Alternatives Rejected

- Enable web or Flutter in the same transaction: rejected because client
  rollout is a separate blast-radius gate.
- Activate from the later documentation commit: rejected because only the
  exact plan-producing source SHA can reproduce the frozen authority.
- Trust service-role readback alone: rejected because signed-in behavior had
  to be proven through a disposable real Supabase Auth user.
- Leave rollback as a manual response: rejected because post-commit proof
  failure required an immediate exact inverse.

## Execution Authority

- Exact producer SHA:
  `32539d1f7b9198092543f597871e0fbf71687ccf`
- Branch: `agent/mtg-sealed-image-migration-promotion-v1`
- Production project: `ycdxbpibncqcchqiihfz`
- Activation plan fingerprint:
  `29ad09b5d117bcfa22698c429d280444f1fb7f9fe0b43419a1f3882b4fb95599`
- Rollback plan fingerprint:
  `c2c7ef6d4db92db44b2341e82a110fb226ecf503627a01dceb6ec810c864ff05`

## Durable Apply

- Transaction committed: `true`
- Rows updated: `1`
- Updated relation: `sealed_product_game_release_controls`
- Updated key: `mtg`
- Previous status: `hidden`
- Current status: `signed_in`
- Release version: `MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_V1`
- Activated at: `2026-09-05 18:17:43.259828+00`
- Activated by: `MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_V1`
- Other durable writes: `0`
- Automatic rollback invoked: `false`

## Authority Reconciliation

- Full authenticated corpus rows: `2,144`
- Full corpus fingerprint:
  `34a91368a22a296beff607934d070ff888a8f858de9e497ffbb88a4a8634ded7`
- Active price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Active price members: `2,182`
- Active image release: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Active image members: `2,149`
- Image manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`

## Live Readback

- Disposable signed-in user RPC status: `200`
- Selected canary returned: `true`
- Trusted signer status: `200`
- Signed image download status: `200`
- Signed image SHA-256:
  `e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd`
- Anonymous RPC status: `401`
- Anonymous RPC rows: `0`
- Anonymous signer status: `401`
- Auth fixture absent after proof: `true`
- Auth reference rows after deletion: `0`
- Protected state exact except the intended control row: `true`
- Independent readback status: `signed_in`
- Independent service readback returned the bounded first `100` RPC rows.
- Independent signer authorization readback: `true`
- Independent readback SHA-256:
  `9f1dff7ecd472702ba7a135e29d67a98b17b9c49c76f03c9e64167f0aaa8f136`

## Current Truths

- MTG sealed backend visibility is durably `signed_in`.
- The complete `2,144`-row signed-in corpus is bound to the active price and
  image releases.
- Private self-hosted image signing works for authenticated users.
- Anonymous RPC and signing remain denied.
- Web and Flutter client flags remain `false`; collectors cannot yet reach
  this backend through either product client.
- Catalog, sealed product, mapping, price, image, Storage, Vault, and
  cross-game data were not mutated by this gate.

## Invariants

- Anonymous visibility remains false.
- Client activation remains independent from backend activation.
- The active price and image release IDs and image manifest stay bound to the
  signed-in release-control evidence.
- Every future client canary must use authenticated access and the bounded
  app-facing RPC/signer interfaces.
- A rollback must restore the exact captured hidden control row; it must not
  mutate product, price, image, Storage, Vault, or cross-game state.

## What Must Never Be Broken

Do not grant anonymous access, expose private Storage paths, bypass the trusted
signer, enable both clients without bounded canaries, reinterpret this backend
activation as public visibility, or mutate release members and pointers under
this authority.

## Verification

- Frozen rollback proof before apply: passed.
- Durable compare-and-swap: exactly `1` row.
- Full corpus count and fingerprint: exact.
- Real-auth RPC/signer/image proof: passed.
- Anonymous denial: passed.
- Protected-state comparison: passed.
- Auth cleanup: passed with zero residue.
- Independent production readback: passed.
- Client activations: `0`.
- Artifact hash mismatches: `0`.

## Permanent Evidence

- Plan audit:
  `docs/audits/pricing/mtg_sealed_signed_in_visibility_activation_v1/2026-09-05T17-22-28Z_plan/`
- Durable apply audit:
  `docs/audits/pricing/mtg_sealed_signed_in_visibility_activation_v1/2026-09-05T18-16-55Z_apply/`
- Independent readback:
  `docs/audits/pricing/mtg_sealed_signed_in_visibility_activation_v1/2026-09-05T18-16-55Z_apply/independent_production_readback.json`

## Exact Next Gate

Perform a bounded signed-in client rollout. Enable and smoke-test one client at
a time against the already active backend, prove MTG sealed browsing, price
readback, signed self-hosted images, authentication boundaries, latency, and
fallback behavior, and retain immediate client-disable rollback. Do not enable
anonymous visibility.
