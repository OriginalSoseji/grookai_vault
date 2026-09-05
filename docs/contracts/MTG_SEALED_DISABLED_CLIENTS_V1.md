# MTG Sealed Disabled Clients V1

**Status:** Prepared; hard-disabled

**Date:** 2026-09-04

## Purpose

Prepare typed web and Flutter consumers for the future MTG sealed RPC V3
without making MTG sealed reachable in either product. This removes client
implementation from the later production cutover while preserving the serial
image, pricing, API, and visibility gates.

## Hard Disable

The web and Flutter source flags are literal `false` values. They do not read
environment variables, remote configuration, entitlements, or database state.
No route, screen, navigation item, page, component, or app shell imports either
adapter.

Changing an environment variable therefore cannot activate this feature. A
later reviewed code change is required.

## Typed Read Boundary

Both clients read the catalog only through
`get_active_sealed_product_pricing_v3`, request image URLs only through
`mtg-sealed-sign-image-v1`, and require:

- authenticated user context;
- `game_key=mtg`;
- TCGPlayer source authority;
- English identity;
- positive USD market price;
- observation date from current day through seven days prior;
- the private `user-card-images` bucket;
- a content-addressed `sealed/mtg/sha256/...` object path;
- a matching SHA-256 in the path and response;
- supported MIME, positive dimensions, and positive byte count;
- no external or source image URL fields.

Rows fail closed as a whole when unsupported evidence appears. The adapters do
not silently display a partial result set.

## State Model

Both clients model:

- disabled;
- loading;
- signed out;
- empty;
- ready;
- missing image;
- stale;
- offline;
- error.

The missing-image and stale states are defense in depth. RPC V3 should already
exclude those rows, but the clients withhold any malformed response rather
than trusting it.

## Image Handling

The private self-hosted object path is exchanged for a one-hour signed Storage
URL only after a row passes validation. Clients call the trusted
`mtg-sealed-sign-image-v1` Edge Function and never receive direct
`storage.objects` SELECT or list authority. The function validates the caller
and exact object through an authenticated RPC before the service role signs one
path. Clients never construct a public `user-card-images` URL and never consume
the original provider URL.

The existing Storage policies do not authorize collector JWTs to read
`sealed/mtg/sha256/...`. The authenticated image-signing authorization
predicate is applied, and the trusted signer was deployed and smoke-tested in
GitHub Actions run `33971178286`. Hidden-state authorization remains denied and
collector JWTs still have no direct Storage access. A separate signed-in
visibility canary must pass before either client can leave its hard-disabled
state.

## Boundaries

This contract authorizes no route or UI, environment flag, deployment,
migration, database or Storage write, object upload, pricing publication,
release or pointer change, visibility activation, anonymous access, Vault
write, or scheduler.

## Exact Next Gate

Do not enable these clients until a separately authorized signed-in visibility
canary proves RPC V3 rows and exact signed image delivery through a real user
session, then returns to hidden with zero residue. Client activation remains a
later code and deployment gate.
