# MTG Sealed Authenticated Image Read V1 Candidate

**Status:** Unapplied candidate

**Date:** 2026-09-04

## Purpose

Close the authenticated image-read dependency for the prepared MTG sealed
clients without granting collector JWTs direct `storage.objects` access. The
clients call a trusted signing Edge Function. That function validates the
collector JWT, evaluates one exact object through an authenticated authorization
RPC, and only then uses the service role to create a one-hour signed URL.

## Evidence Boundary

The authorization candidate returns true only when the requested object:

- is in `user-card-images` at the exact content-addressed MTG sealed path;
- matches its stored SHA-256, MIME, dimensions, bytes, and readback hash;
- belongs to an exact verified assertion and exact source evidence;
- is a member of the active frozen image release;
- is bound to the same active frozen price release;
- has current-through-seven-days exact English TCGPlayer `normal` USD market
  evidence with a positive market price; and
- passes both catalog and sealed-product visibility controls.

The RPC grants only `EXECUTE` to `authenticated` and `service_role`. It grants
no `storage.objects` access. The Edge Function has no list or download operation
and signs only the exact authorized path. It grants no anonymous access,
listing authority, insert, update, delete, release activation, or visibility
mutation.

## Fail-Closed Behavior

A hidden catalog or sealed release, stale/future/missing price, release-pointer
drift, non-English identity, non-TCGPlayer mapping, missing image lineage,
metadata mismatch, wrong hash prefix, or unsupported path returns `false`.
Existing owner and public-Vault policies remain unchanged.

## Deployment Boundary

The SQL remains under `docs/sql/` and is not an active migration. The Edge
Function source is prepared but not deployed. Both must be promoted, deployed
serially, and read back before the disabled clients can be activated.

Candidate SQL SHA-256:
`46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0`.

## Exact Next Gate

Promote the base image schema and this authenticated-read addendum into a
versioned migration package and prepare a separately pinned signer deployment.
Apply or deploy nothing until both have frozen hashes, clean production
preflight, explicit authority, and exact schema, function, grant, RLS,
authentication, no-listing, and cross-game readback requirements.
