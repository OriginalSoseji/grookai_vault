# Pricing Checkpoint 124: MTG Sealed Signed-In Canary Passed

## Context

Checkpoint 123 deployed the trusted exact-object image signer while MTG sealed
visibility remained hidden. RPC V3, the active frozen price release, the active
frozen image release, and private self-hosted objects were present, but no live
user had yet proved the complete read path.

## Problem

Database-role simulation could prove policy structure but could not prove that
a real Supabase Auth token could traverse PostgREST, RPC V3, the deployed Edge
signer, and private Storage signing. Enabling clients or durable visibility
without that proof would move the trust boundary into production untested.

## Risk

A canary could leave MTG sealed visible after a failure, expose rows or images
to anonymous callers, use stale or mismatched release authority, persist test
credentials, leave a test Auth user behind, or accidentally activate web or
Flutter clients.

## Decision

Run a commit-bound, fingerprinted, zero-residue canary using one disposable,
email-confirmed Supabase Auth user. Freeze the complete release-control row and
all active price/image authority before execution. Briefly transition only the
MTG sealed release control from `hidden` to `signed_in`, prove RPC V3 and exact
signed-image bytes over live HTTP, then restore every release-control column
and delete the Auth fixture.

## Alternatives Rejected

- Simulated database role only: rejected because it does not prove the live
  PostgREST, Auth, Edge Function, and signed Storage path.
- Existing collector credentials: rejected because a disposable fixture gives
  a bounded lifecycle and avoids persisting or handling a real user's secrets.
- Public image or anonymous RPC test: rejected because signed-in access is the
  intended boundary and anonymous publication remains unauthorized.
- Client activation during the canary: rejected because client rollout is a
  separate production gate.
- Transaction-only visibility change: rejected because an uncommitted row is
  not visible to independent HTTP requests.

## Producer And Plan

- Initial canary producer commit:
  `711503451e4491779c17a191960354e57c70d1ec`
- Final execution producer commit:
  `33496cf9297bbed16e7d6df95ea69c03b317acf7`
- Final plan fingerprint:
  `a3facd708a9c0fb6f29d856e12f21b6ba1195ee51743064b0bd7c5e34a50978f`
- Production project: `ycdxbpibncqcchqiihfz`

The first read-only preflight passed but exposed a Node `pg` deprecation warning
caused by queuing concurrent queries on one client. The operator was repaired
to serialize those reads, focused tests passed, and the plan was regenerated
from the final producer before any visibility write.

## Frozen Authority

- Price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Price release members: `2,182`
- Image release: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Image manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`
- Image release members: `2,149`
- Selected object:
  `sealed/mtg/sha256/e9/e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd.jpg`
- Selected object SHA-256:
  `e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd`
- Selected product:
  `Kamigawa: Neon Dynasty - Theme Booster [Green]`

## Live Proof

- Hidden authenticated RPC V3 rows: `0`
- Hidden authenticated signer response: `404 image_not_available`
- Hidden anonymous signer response: `401 unauthorized`
- Temporary release status: `signed_in`
- Signed-in authenticated RPC V3 rows for the selected product: `1`
- Selected candidate present in RPC V3: `true`
- Signed-in authenticated signer response: `200`
- Signed image download response: `200`
- Signed image byte SHA-256 matched: `true`
- Signed-in anonymous RPC response: `401`
- Signed-in anonymous signer response: `401 unauthorized`
- Visibility-open duration: `2.955` seconds

No access token, password, email address, signed URL, or raw test-user ID was
persisted in the artifacts.

## Rollback And Zero-Residue Proof

- Release-control row exactly restored: `true`
- Protected production state exactly restored: `true`
- MTG sealed status after canary: `hidden`
- Post-restore authenticated RPC V3 rows: `0`
- Post-restore authenticated signer response: `404 image_not_available`
- Disposable Auth user absent: `true`
- Auth and foreign-key reference rows remaining: `0`
- Independent post-canary preflight: passed
- Independent plan fingerprint reproduced exactly: `true`

The canary committed only the temporary visibility transition and its exact
inverse. It made no pricing, pointer, Storage, Vault, client, cross-game, or
anonymous-visibility change.

## Current Truths

- The complete signed-in MTG sealed backend read path works in production.
- RPC V3 returns exact, fresh, image-backed MTG sealed rows to a real user.
- The trusted signer returns a valid URL whose downloaded bytes match the
  active image authority.
- Anonymous callers cannot execute the RPC or obtain a signed image.
- MTG sealed visibility is back to `hidden`.
- Web and Flutter MTG sealed clients remain literal hard-disabled.
- No collector-facing MTG sealed product surface is active yet.

## Invariants

- The active price and image releases must remain bound to the same frozen
  authority.
- Only authenticated callers may read RPC V3 or sign an exact active object.
- The private Storage bucket must never become public.
- A canary pass is evidence for activation; it is not activation authority.
- Client rollout and scheduled freshness must remain separate, observable
  gates with rollback.

## What Must Never Be Broken

Do not expose provider image URLs, grant direct Storage listing, permit
arbitrary signing paths, publish stale prices, let anonymous access satisfy a
signed-in gate, or enable clients before durable visibility and rollback plans
are independently frozen and verified.

## Verification

- New canary contracts: `5/5` passed.
- Complete MTG sealed contract family: `183/183` passed.
- Full repository shipcheck: passed, including `657/657` Flutter tests.
- Live canary validation findings: `0`.
- Generated execution artifact hash mismatches: `0`.
- Permanent audit artifacts: `8` files plus aggregate hash manifest.
- Aggregate artifact manifest SHA-256:
  `1f46d2e9e089819ef879495af44cadd6ae31b930662db64e128c371eb5121975`

## Permanent Evidence

- Contract:
  `docs/contracts/MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_V1.md`
- Audit:
  `docs/audits/pricing/mtg_sealed_signed_in_visibility_canary_v1/2026-09-05T16-16-43Z_canary/`

## Exact Next Gate

Prepare a separately fingerprinted durable MTG sealed `signed_in` visibility
activation plan with fresh price/image authority, exact before-state,
compare-and-swap behavior, immediate readback, and one-step rollback. Do not
enable web or Flutter clients in that activation. After durable backend
visibility is independently verified, enable the signed-in web and Flutter
clients through a bounded beta rollout, then add governed price-refresh and
image-refresh scheduling. Anonymous publication remains out of scope.
