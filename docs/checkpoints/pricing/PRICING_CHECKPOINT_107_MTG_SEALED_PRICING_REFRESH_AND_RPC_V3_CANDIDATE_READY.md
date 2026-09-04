# Pricing Checkpoint 107: MTG Sealed Pricing Refresh And RPC V3 Candidate Ready

## Context

Checkpoint 106 preserved the reviewed but unapplied exact-byte sealed-image
schema and deterministic 17-object transient canary plan. The next safe work
was to prove that current production price evidence could sustain the image-
eligible sealed release, then define the read boundary clients may eventually
use after the image and pricing write gates are separately completed.

## Problem

The active hidden MTG sealed release is historically valid, but a production
client must never receive a row merely because it once belonged to that
release. It needs a current exact price, exact self-hosted image evidence, and
matching frozen price/image release authority at serving time.

The prior V2 RPC exposes pricing without an exact-image dependency and does not
repeat the seven-day freshness check when read. Activating that interface for
MTG sealed would allow stale or image-less rows to appear.

## Risk

- A stopped source warehouse could leave apparently active but stale prices.
- An image release could be paired with a different price release.
- A variant could receive another variant's object through a loose join.
- An external acquisition URL could escape into a customer response.
- A generic sealed function could unintentionally expose another game.
- An offline SQL candidate could be mistaken for an applied client API.

## Decision

The governed pricing refresh remains read-only. Its merged-main workflow proof
is permanently preserved, and a new RPC V3 remains outside active migrations.

The RPC candidate requires all of the following together:

- exact `mtg`, English, TCGPlayer, USD, `normal`-lane price evidence;
- positive market price observed from current date through seven days prior;
- one active frozen price release;
- one active frozen image release bound to that exact price release;
- exact variant, source mapping, source price member, image evidence, image
  assertion, release member, and self-hosted object lineage;
- hash, MIME, width, height, byte-count, and Storage readback parity;
- both catalog and sealed-product visibility controls;
- authenticated or service-role execution only;
- a clamped result limit of 1 through 100.

The RPC candidate SQL SHA-256 is
`5e3872f8d433d0e360a3039ba62a5a6d009c6a36ad0112479cb298220450a5a2`.

## Alternatives Rejected

- Reuse RPC V2: rejected because it does not require exact images or serving-
  time freshness.
- Trust refresh construction without read-time checks: rejected because the
  publication boundary must independently fail closed.
- Return the source image URL: rejected because acquisition provenance is not
  a client media endpoint.
- Permit image and price releases to advance independently: rejected because
  mixed authority is not reproducible.
- Make V3 cross-game immediately: rejected because this candidate proves the
  bounded MTG release only.
- Promote the SQL directly into migrations: rejected because image and pricing
  apply gates have not executed.

## Merged-Main Read-Only Proof

Permanent artifacts are under:

`docs/audits/pricing/mtg_sealed_pricing_refresh_v1/2026-09-04_live_33847669050/`

- Producer merge SHA: `d5741ac71f555ee3f104d9a2230d85a26534f021`
- GitHub run: `33847669050`
- Workflow conclusion: `success`
- GitHub artifact archive digest:
  `sha256:8b1d8851746a39ed70ae5c555c3552a242d1a9968e3fa7d83850de6d2648c61d`
- Source price release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Source coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Refresh plan fingerprint:
  `674dfcbbd9c690b68672c4373b326c5cec4145ae1233a96be36f633aa6d3d7a6`
- Canonical exact mappings: `2,904`
- Latest source price rows: `2,779`
- Image-eligible variants: `2,149`
- Fresh exact qualified variants: `2,149`
- Explicit held or removed rows: `722`
- Missing observations: `125`
- Missing positive market price: `480`
- Stale prices: `117`
- Image coverage gaps: `33`
- Orphan current members: `0`
- Findings: `0`
- Reconciliation mismatches: `0`
- Provider, database, Storage, pricing, pointer, visibility, and Vault writes:
  `0`

The workflow ran the database audit inside one repeatable-read read-only
transaction and verified that it closed.

## Current Truths

- The 2,182-member MTG sealed price release remains active internally.
- Exactly 2,149 variants currently pass the strict refresh plan.
- The refresh implementation is merged, manual, and read-only.
- The image schema and RPC V3 are review-only candidates and are not applied.
- No transient or durable image upload has executed.
- No image evidence, assertion, release, or pointer exists from this gate.
- No refreshed price release has been written or activated.
- MTG sealed remains hidden from clients.
- RPC V2 remains the production database function; V3 is not callable.

## Invariants

- Current exact price and exact self-hosted image evidence are both mandatory.
- Every served image must trace to the same variant and source mapping as its
  price member.
- Price and image releases must share one frozen authority.
- Missing or stale evidence removes a row; it never triggers a fallback.
- External image URLs never become client image URLs.
- Anonymous access remains denied.
- Candidate SQL cannot be treated as an applied migration.
- Cards, One Piece, Vault, public pricing, and other games remain unchanged.

## What Must Never Be Broken

- The permanent merged-main run provenance and artifact hashes.
- Repeatable-read read-only refresh planning.
- Exact TCGPlayer `normal` USD market-price authority.
- Seven-day serving-time freshness, including rejection of future dates.
- Exact byte and release lineage for every returned image.
- Separate catalog, sealed visibility, image, price, and client gates.
- Zero implicit promotion from hidden internal data to signed-in visibility.

## Explicit Next Gate

Prepare hard-disabled typed web and Flutter adapters for the future RPC V3,
including loading, empty, missing-image, stale, offline, and error states. The
adapters must remain unreachable by default and must not be deployed or
activated. After that preparation, the production sequence remains: image
schema promotion/apply and readback, transient Storage canary, durable image
upload and exact release, governed pricing write/release, RPC V3 promotion and
apply, disabled client deployment, signed-in visibility canary, and later
scheduler soak.
