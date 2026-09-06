# Pricing Checkpoint 106: MTG Sealed Image Schema Candidate Completed

## Context

Checkpoint 105 permanently preserved the complete zero-write image coverage
audit for all 2,182 members of the active hidden MTG sealed price release. Gate
A proved 2,149 exact image-eligible variants, 33 explicit gaps, and 2,144 unique
valid image byte objects.

**Later accounting correction:** the durable-plan reconciliation proved that
the 2,144 valid image signatures included three excluded placeholder hashes.
The exact durable upload scope is 2,141 eligible objects. The immutable source
evidence remains unchanged.

This checkpoint records the next bounded gate: an unapplied sealed-image schema
candidate and a deterministic transient Storage canary plan. The candidate was
repaired after review before merge or promotion.

## Problem

Coverage evidence alone cannot safely become client media. Grookai needed a
design that could prove all of the following independently:

- exact source retrieval evidence belongs to one sealed variant and mapping;
- a self-hosted object contains the exact bytes described by that evidence;
- an image release is bound to one immutable price release;
- activation is game-scoped, atomic, reversible, and independent of product
  visibility.

The first candidate draft also allowed an assertion to select another object's
bytes within the same game and did not fully enforce that the source price
release was frozen.

## Risk

- A service row-selection error could pair exact evidence with the wrong image.
- A mutable price release could change after an image release was assembled.
- A stale or mismatched compressed coverage file could be stamped with the
  trusted coverage fingerprint.
- An offline design artifact could be mistaken for an applied migration,
  completed upload, active pointer, or client-visible feature.

## Decision

Keep the schema outside `supabase/migrations` and therefore unapplied. The
candidate now requires:

- exact content SHA-256, MIME type, width, height, and byte-count parity between
  retrieval evidence and the selected self-hosted object;
- an already-frozen source price release when an image release is inserted,
  populated, and frozen;
- append-only evidence, object, assertion, and release-member rows;
- one immutable game-scoped image release and compare-and-swap pointer;
- forced RLS, service-role ownership, and no client RPC;
- verification of compressed bytes, uncompressed bytes, summary bytes, file
  sizes, release identity, member count, and the recomputed logical coverage
  fingerprint before canary selection.

The candidate SQL SHA-256 is
`6a8143719633193c6d6f0d1ee3da2e95cb933f37194203cb95c7fc5314c5a735`.

## Alternatives Rejected

- Trust same-game object ownership: rejected because it does not prove exact
  image bytes.
- Validate byte bindings only during release construction: rejected because an
  invalid assertion should never be accepted.
- Bind to a draft price release: rejected because mutable membership breaks
  release reproducibility.
- Trust only the summary fingerprint: rejected because the summary and coverage
  payload could be mismatched.
- Place the candidate in the active migration directory: rejected because this
  gate does not authorize schema application.

## Offline Canary Proof

Permanent artifacts are under:

`docs/audits/pricing/mtg_sealed_image_schema_candidate_v1/2026-09-04_offline/`

- Source price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Selected exact variants: `17`
- Selected unique objects: `17`
- Canary plan fingerprint:
  `37054e8a5e66e7f7aeb5d04e3b4d476deb0809a6019297c19e1cb9cc7c9e8a7d`
- Canary plan file SHA-256:
  `6972314777f7c376e191a03e3ddb76d1ec9c8073cbffa125426a1a09a5f1f6cd`
- Preserved source validation: `valid`
- Provider, database, Storage, pricing, pointer, visibility, and Vault writes:
  `0`

The package-form sample includes booster boxes, bundles, cases, collections,
decks, displays, kits, packs, promo packs, sleeved packs, and tins. It includes
one shared-byte case while preserving independent variant evidence.

## Current Truths

- Gate A remains complete for exactly 2,182 frozen release members.
- The sealed-image schema is a reviewed candidate, not an active migration.
- No MTG sealed image has been uploaded by this gate.
- No image evidence, object, assertion, release, or pointer row has been written.
- The transient 17-object canary has been planned but not executed.
- MTG sealed visibility remains hidden.
- The current signed-in sealed RPC remains unchanged.

## Invariants

- Source URLs are acquisition evidence and never client image URLs.
- Exact variant evidence cannot transfer through shared image bytes.
- Every accepted assertion binds exact evidence to exact self-hosted bytes.
- Image releases bind only to frozen price releases.
- Excluded Gate A rows remain excluded until new exact evidence is produced.
- Image, pricing refresh, API visibility, and client visibility remain serial
  gates.
- One Piece, cards, Vault, pricing publication, and public access are untouched.

## What Must Never Be Broken

- The 2,149 eligible / 33 excluded Gate A partition.
- Full source-artifact hash and logical-fingerprint verification.
- Content-addressed Storage paths and exact readback requirements.
- Service-only image evidence and release administration.
- Compare-and-swap pointer behavior.
- Zero anonymous sealed access until separately authorized.

## Explicit Next Gate

Review and promote the exact candidate into a versioned migration without
applying it, then prepare a separately authorized transient 17-object Storage
execution. Migration apply, Storage calls, durable image upload, evidence or
pointer writes, pricing refresh, RPC replacement, deployment, and visibility
activation each remain separate later gates.
