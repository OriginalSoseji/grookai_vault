# MTG Sealed Image-Backed Pricing RPC V3 Candidate

**Status:** Offline candidate; unapplied

**Date:** 2026-09-04

## Purpose

Define the bounded signed-in read model required after the MTG sealed image
schema, self-hosted objects, image assertions, and governed price refresh have
all been separately applied. This contract creates no current production
authority.

## Read Contract

`get_active_sealed_product_pricing_v3` returns a sealed variant only when:

- the requested game is exactly `mtg`;
- the requested game has both catalog and sealed-product visibility;
- the request role is `authenticated` or `service_role`;
- the active price release is frozen;
- the variant is English and its exact mapping is TCGPlayer;
- the price member is `qualified_exact`, USD, from exactly the `normal` source
  lane, and its market price is positive;
- the price observation is not future-dated and is no older than seven days at
  serving time;
- the active image release is frozen and bound to that exact price release;
- the same variant and source mapping have an `exact_verified` image assertion;
- the assertion traces to the exact source price member;
- image evidence is `exact_image_ready` or `shared_bytes_exact_variant`;
- the self-hosted object hash, MIME, dimensions, byte count, and Storage
  readback hash exactly match the retrieval evidence.

Missing images, stale prices, release mismatch, source mismatch, incomplete
readback, hidden visibility, or anonymous access return no row. The function
does not relax to a lower-quality result.

## Image Boundary

The result exposes only the self-hosted Storage bucket, content-addressed
object path, content hash, MIME, dimensions, and byte count. External source
image URLs are never returned. Storage access and URL construction remain a
client adapter concern.

## Query Boundary

The function requires an explicit game, supports a bounded optional text
query, clamps limits to 1 through 100, and normalizes negative offsets to zero.
It does not expose tables directly and grants execution only to
`authenticated` and `service_role`.

## Dependencies

The candidate depends on:

- `20260903130000_sealed_product_per_game_release_v2.sql`;
- `20260903143000_sealed_product_visibility_boundary_v1.sql`;
- the still-unapplied MTG sealed image evidence and release schema candidate;
- one active frozen price release and one active frozen image release bound to
  the same price release.

## Boundaries

The SQL remains outside `supabase/migrations`. This work authorizes no
migration promotion or apply, database or Storage write, object upload,
assertion, release or pointer change, pricing publication, visibility
activation, client deployment, anonymous access, Vault write, or scheduler.

## Exact Next Gate

After image and pricing gates are proven, promote this candidate in its own
migration, apply it with exact schema/RLS/grant readback, and smoke-test stale,
missing-image, signed-in, and anonymous behavior before enabling any client.
