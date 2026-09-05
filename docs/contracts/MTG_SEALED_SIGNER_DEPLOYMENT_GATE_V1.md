# MTG Sealed Signer Deployment Gate V1

**Status:** Execution-ready

**Date:** 2026-09-05

## Purpose

Deploy and prove the trusted `mtg-sealed-sign-image-v1` Edge Function without
publishing MTG sealed products or enabling either client. The function is only
an authenticated, exact-object exchange from a governed private Storage object
reference to a one-hour signed URL.

## Frozen Scope

The deploy target is exactly one function in production project
`ycdxbpibncqcchqiihfz`. Its frozen source bundle contains:

- `supabase/functions/mtg-sealed-sign-image-v1/index.ts`
- `supabase/functions/mtg-sealed-sign-image-v1/config.toml`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/key_resolver.ts`

The workflow requires the exact producer commit, bundle SHA-256, and deployment
plan fingerprint before deployment.

## Authorization Boundary

The Edge Function must:

1. reject missing or invalid bearer credentials;
2. accept only `POST` and the private `user-card-images` bucket;
3. accept only content-addressed `sealed/mtg/sha256/...` image paths;
4. ask `mtg_sealed_image_object_signing_authorized_v1` about that exact object;
5. return no signed URL when MTG sealed visibility is `hidden`;
6. create at most one one-hour signed URL after authorization;
7. expose no object listing, downloading, public URL, or provider URL path.

The function-level JWT gateway remains disabled because the function performs
its own current-user validation through `requireAuthUser`. This preserves
consistent error handling while still failing closed.

## Deployment Proof

Before deployment, the gate captures:

- the source bundle and plan fingerprints;
- MTG catalog and sealed visibility;
- current price and image pointers;
- immutable sealed/image row counts;
- MTG private Storage object count and bytes from database metadata;
- Vault row counts;
- an authenticated-role authorization result for one active image path.

After deploying only the signer, it requires:

- anonymous `POST` returns `401 unauthorized`;
- invalid bearer `POST` returns `401 unauthorized`;
- `GET` returns `405 method_not_allowed`;
- authenticated-role authorization remains false while sealed visibility is
  hidden;
- every protected state value exactly matches the pre-deployment baseline;
- the deployed function appears in the production function list.

The authenticated-role proof uses an existing user identity inside a read-only
transaction, records no user identifier, and rolls the transaction back.

## Prohibited Work

This gate authorizes no migration, database row mutation, Storage upload or
deletion, image-evidence change, price refresh, pointer change, visibility
change, Vault write, client activation, route, scheduler, or cross-game action.

## Failure Behavior

Any source, commit, project, plan, visibility, endpoint, authorization, or
protected-state mismatch fails the workflow. It must not enable clients or
visibility and must not substitute another function or project.

## Exact Next Gate

After successful deployment and readback, prepare a separately reviewed
signed-in visibility canary. The web and Flutter MTG sealed clients remain
literal hard-disabled until that later gate.
