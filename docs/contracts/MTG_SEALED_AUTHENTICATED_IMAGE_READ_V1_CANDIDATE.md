# MTG Sealed Authenticated Image Read V1 Candidate

**Status:** Unapplied candidate

**Date:** 2026-09-04

## Purpose

Close the authenticated Storage-read dependency for the prepared MTG sealed
clients without making the private `user-card-images` bucket public. Creating a
signed URL under a collector JWT requires a matching `storage.objects` SELECT
policy; the existing owner and public-Vault policies do not cover governed
`sealed/mtg/sha256/...` objects.

## Evidence Boundary

The candidate permits an authenticated request only when the requested object:

- is in `user-card-images` at the exact content-addressed MTG sealed path;
- matches its stored SHA-256, MIME, dimensions, bytes, and readback hash;
- belongs to an exact verified assertion and exact source evidence;
- is a member of the active frozen image release;
- is bound to the same active frozen price release;
- has current-through-seven-days exact English TCGPlayer `normal` USD market
  evidence with a positive market price; and
- passes both catalog and sealed-product visibility controls.

The policy grants only `SELECT` to `authenticated`. It grants no anonymous
access, listing authority, insert, update, delete, release activation, or
visibility mutation.

## Fail-Closed Behavior

A hidden catalog or sealed release, stale/future/missing price, release-pointer
drift, non-English identity, non-TCGPlayer mapping, missing image lineage,
metadata mismatch, wrong hash prefix, or unsupported path returns `false`.
Existing owner and public-Vault policies remain unchanged.

## Deployment Boundary

The SQL remains under `docs/sql/` and is not an active migration. It must be
promoted with the reviewed image schema, hash-frozen, applied serially, and
read back before the disabled clients can be activated.

Candidate SQL SHA-256:
`ca58dc3e99c4b1925a730cc811e823f27a06b0ce29ae30b9a9c3891fbd4e5186`.

## Exact Next Gate

Promote the base image schema and this authenticated-read addendum into a
versioned migration package. Apply nothing until that package has a frozen
hash, clean production preflight, explicit authority, and exact schema,
function, grant, RLS, policy, and cross-game readback requirements.
