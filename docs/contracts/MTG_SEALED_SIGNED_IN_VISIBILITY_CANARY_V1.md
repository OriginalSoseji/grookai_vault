# MTG Sealed Signed-In Visibility Canary V1

## Purpose

Prove that the active frozen MTG sealed price and image releases can serve an
authenticated collector through RPC V3 and the trusted image signer without
granting anonymous access or leaving production visibility enabled.

## Frozen Authority

- Price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Image release: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Image manifest: `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`
- Signer: `mtg-sealed-sign-image-v1`
- Read model: `get_active_sealed_product_pricing_v3`

## Execution Contract

The operator must start from the exact clean producer commit and a fresh
production preflight. The preflight must prove:

- MTG card-catalog visibility is `signed_in`;
- MTG sealed visibility is `hidden`;
- active price and image pointers match the frozen authority;
- the selected self-hosted object belongs to both active releases;
- RPC V3 returns no row while hidden;
- image signing is denied while hidden;
- anonymous RPC execution is denied; and
- web and Flutter MTG sealed clients are hard-disabled.

The execution creates one disposable, email-confirmed Supabase Auth user and
obtains a real user access token. It then proves the hidden boundary, commits a
temporary `hidden -> signed_in` transition for only the MTG sealed release
control, and performs live HTTP checks.

The signed-in window must prove:

- RPC V3 returns at least one row;
- the frozen image candidate is present in the RPC result;
- the signer returns one signed URL;
- downloading that URL produces the exact expected image SHA-256; and
- anonymous RPC and signer requests remain denied.

## Zero-Residue Rule

The complete original release-control row is captured before execution. The
operator must restore every column, including evidence and timestamps, within
five minutes. It may restore only a row carrying this canary's frozen plan
fingerprint and must refuse to overwrite an unrelated concurrent mutation.

The disposable user is signed out and deleted. Readback must prove zero rows
remain in `auth.users`, Auth user-reference columns, or foreign-key references
to `auth.users`. Provider audit logs may retain normal immutable security
telemetry; no email, password, access token, signed URL, or raw user ID may be
written to repository artifacts.

## Boundaries

This canary authorizes only:

- one disposable Auth-user lifecycle;
- one temporary update to make MTG sealed `signed_in`;
- one exact update restoring the original MTG sealed release-control row;
- authenticated and anonymous HTTP probes; and
- read-only production verification.

It authorizes no durable visibility activation, client activation, pricing or
pointer write, Storage mutation, Vault mutation, anonymous publication,
cross-game mutation, scheduler, or cleanup.

## Pass Condition

The gate passes only when the authenticated RPC and exact signed-image readback
succeed, anonymous access remains denied, the control row and protected state
are exactly restored, the Auth fixture is absent, and the signed-in window is
no more than 300 seconds.

The next gate after a pass is a separately governed durable signed-in
activation and disabled-client rollout. This canary does not authorize either.
