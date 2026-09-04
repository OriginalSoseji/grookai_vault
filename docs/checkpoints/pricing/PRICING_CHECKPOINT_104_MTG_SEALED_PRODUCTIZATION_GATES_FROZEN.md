# Pricing Checkpoint 104: MTG Sealed Productization Gates Frozen

## Context

The durable MTG sealed catalog was applied and independently read back in
checkpoint 102. Checkpoint 103 repaired the operator's aggregate write-count
telemetry without changing production data. Pull request `#405` merged that
repair into `main` as
`a9a384cb4085a5369e73ebd7039ab6ddcffb2a47`.

## Merged-Main Verification

GitHub Actions run
[`33834897002`](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33834897002)
performed one `readback` operation from that exact commit.

- Status: `mtg_sealed_readback_passed`
- Database writes: `0`
- Plan fingerprint:
  `0411d7debc8d4348040f678a90c5e2c3f7fd3c11c7fd8d8dc4630de037d45357`
- Source fingerprint:
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`
- Exact projections: `9/9`
- Release ID: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Release state/member count: `frozen` / `2,182`
- One Piece boundary unchanged: `true`
- Hidden RPC rows: `0`

Permanent summary evidence is under
`docs/audits/pricing/mtg_sealed_merged_main_readback_v1/`. The full compressed
plan remains attached to the workflow run and its exact hash is preserved in
that directory.

## Problem

The catalog is durably correct but is not yet a customer-ready product. MTG
sealed does not yet have a sealed-specific self-hosted image contract, an
unattended price-release refresh proven over time, or signed-in client
visibility and rendering proof.

Treating those as one activation would combine Storage, schema, pricing,
release-pointer, deployment, and security authority. That would recreate the
convergence risk the repository cleanup and serial integration policy were
designed to prevent.

## Risk

- External source URLs could be mistaken for permanent client images.
- Package images could be forced into card-image identity.
- A one-time price release could be mistaken for a sustainable pricing system.
- An old frozen release could continue serving stale values because the current
  `v2` RPC does not enforce freshness at request time.
- The current `v2` RPC has no sealed-image evidence or pointer in its response.
- The release pointer could be mistaken for visibility authority.
- Signed-in activation could expose rows before images, pricing freshness, or
  clients are ready.
- A client-only beta flag could be mistaken for a database access boundary.

## Decision

Freeze `MTG_SEALED_PRODUCTIZATION_GATES_V1` with three serial, independently
authorized gates:

1. self-hosted images and exact sealed-image evidence;
2. governed immutable pricing refresh and operational soak;
3. signed-in visibility and cross-client proof.

No gate inherits mutation authority from another. This checkpoint and contract
are planning evidence only.

## Alternatives Rejected

- Activate signed-in visibility now because a frozen release exists: rejected;
  the release has no completed image/client readiness proof.
- Hotlink TCGPlayer images: rejected; source URLs are acquisition evidence, not
  Grookai-hosted product media.
- Put package images on card rows: rejected; sealed and card identities are
  separate domains.
- Combine image upload, price refresh, and visibility in one PR/apply: rejected;
  rollback ownership and evidence would become ambiguous.
- Treat one successful readback as unattended pricing proof: rejected; release
  operations must survive scheduled cycles and fail safely.

## Current Truths

- MTG sealed catalog data is durably present and exact.
- The current release has `2,182` exact, fresh TCGPlayer market-price members.
- `480` qualifications are blocked for missing market price and `117` are
  blocked as stale.
- The merged telemetry helper reports actual insert resources and the pointer
  separately; diagnostic holds cannot inflate write totals.
- MTG sealed visibility is `hidden` and client RPC readback returns zero rows.
- No self-hosted image or productization activation occurred in this gate.
- No database or Storage write occurred after the checkpoint 102 durable apply.

## Invariants

- The consumed durable-apply authority cannot be reused.
- Anonymous visibility remains denied.
- One Piece, cards, Vault, and existing release data remain protected.
- Images, pricing, and visibility remain separate authority domains.
- Signed-in activation requires a versioned successor to the current `v2` RPC
  that joins exact self-hosted images and fails closed on expired prices.
- The database control's `signed_in` state applies to all authenticated users;
  a narrower security cohort requires a separately designed boundary.

## What Must Never Be Broken

- Exact source-product-to-variant ownership.
- Append-only identity, evidence, qualification, release, and membership rows.
- Frozen release manifest/member reconciliation.
- Game-scoped release pointer and visibility controls.
- Source-to-price-to-release provenance.
- Zero anonymous access before a separately governed public-release decision.

## Explicit Next Gate

Produce only a zero-write Gate A image-source coverage plan for the current
`2,182` release members and define the sealed-specific image evidence/pointer
contract. Stop before migration creation, Storage upload, database writes,
pricing refresh, deployment, or visibility activation.
