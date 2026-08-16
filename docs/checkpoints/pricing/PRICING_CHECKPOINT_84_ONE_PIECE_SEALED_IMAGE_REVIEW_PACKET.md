# Pricing Checkpoint 84: One Piece Sealed Image Review Packet

## Context

Checkpoint 83 attached official Bandai product-family evidence to 215 of the
403 service-only One Piece sealed candidates without granting exact variant or
source-mapping authority. This gate assembled every candidate into one
read-only image-assisted review packet and verified whether its referenced
TCGPlayer and Bandai images were available before human review.

The packet was generated from the exact clean producer commit
`b06c8206251dad589a10d41d37adef0d24895cbd`. The image-availability probe ran
from the exact clean producer commit
`b52311d1f10901f319dfedd66302505242afa483`.

## Problem

Official family support does not prove that a TCGPlayer row is an exact pack,
box, case, display, wave, bundle, or language variant. A reviewer needs the
source identity, proposed family and package form, source image, official
reference evidence, and unresolved blockers in one traceable view.

Image references can also fail independently of candidate quality. An
unavailable image must remain an explicit evidence gap; it cannot be treated as
proof that a product or variant is absent.

## Decision

- Preserve all 403 candidates exactly once in a standalone local review packet.
- Show the exact TCGPlayer source-image reference for every candidate and the
  official Bandai page and image where available.
- Keep reviewer decisions in browser-local state only.
- Allow JSON export only as non-authoritative review evidence.
- Require all four exact-visual checks plus a note before the packet recommends
  exact visual confirmation.
- Probe only the referenced URLs, persist no image response bodies, and retain
  every failed reference as a review gap.
- Grant no canonical, mapping, image-pointer, pricing, publication, release, or
  app authority from either artifact.

## Result

### Review Packet

- 403 review items
- 403 unique candidate IDs
- 403 unique source product IDs
- 403 TCGPlayer source-image references
- 215 candidate references to official images
- 215 candidates with official family support
- 204 official-supported visual-review rows
- 1 ambiguous official-family review row
- 185 residual source-only review rows
- 13 held-scope review rows
- 403 rows defaulted to `unreviewed`
- 0 rows with promotion authority

### Image Availability

- 618 candidate-image references
- 487 unique image URLs
- 476 available URLs
- 11 unavailable URLs
- 403 unique TCGPlayer source URLs: 392 available, 11 unavailable
- 84 unique Bandai official URLs: 84 available, 0 unavailable
- 0 rejected redirect hosts
- 0 non-image responses
- 0 request errors
- 0 response bodies persisted

All 11 unavailable references returned HTTP 403 from the TCGPlayer CDN:

- `657215` Premium Card Collection -Best Selection Vol. 5-
- `657218` One Piece Tin Pack Set Vol. 2 Display
- `657219` One Piece Tin Pack Set Vol. 2 Display Case
- `672894` Starter Deck 29: Egghead Bonus Pack
- `679503` Extra Booster: One Piece Heroines Edition Sleeved Booster Pack
- `686290` Adventure on Kami's Island - Dash Pack
- `694893` Set Sail Deck Set
- `694894` Set Sail Deck Set Display
- `704755` The World's Strongest Warriors Sleeved Booster Pack
- `704757` Double Pack Set Vol. 12
- `704878` Double Pack Set Vol. 12 Display

These rows remain reviewable through other available evidence where present,
but their inaccessible source-image references are not considered reviewed.

## Proof

- Packet fingerprint:
  `a66df06f1189b7242b29f5c163aef3e3a57a8259af4609919b983b1b801ea798`
- Review-items SHA-256:
  `54d552cbd63f5b5ca50d629a70ef6bbe83bedbe07b2eac648102b00873a8417e`
- Review-packet HTML SHA-256:
  `cfdc2536c93a514b2474c67f55d97bbd6b8666a37482f93840c53c1e288af1e7`
- Probe-results SHA-256:
  `fe8794591125f2e33dba321dc5f46fa8896402922f505f1a0be161917743e9ed`
- Unavailable-images SHA-256:
  `ca6d75148aa59954cdab506de26e39f0ab29e97fc93a2f91065a5d9bec8420b6`
- Packet producer commit:
  `b06c8206251dad589a10d41d37adef0d24895cbd`
- Availability-probe producer commit:
  `b52311d1f10901f319dfedd66302505242afa483`

All four packet artifact hashes and all four probe artifact hashes were
recomputed successfully. The probe reconciled 487 records to 487 unique URLs,
with 476 `available` and 11 `http_error` results.

The embedded review-packet JavaScript passed a static `vm.Script` syntax check.
Controlled browser automation did not open the local `file:` URL because of
browser policy, so no automated browser screenshot is claimed.

## Current Truths

- Production still has 403 service-only One Piece sealed candidates.
- Production still has zero One Piece sealed canonical families, variants,
  source mappings, evidence promotions, pricing qualifications, releases,
  members, or pointers.
- The complete hidden One Piece card and DON canon remains unchanged.
- The review packet is complete and read-only; its decisions are not database
  state and confer no authority.
- All official Bandai image references are currently available.
- Eleven TCGPlayer source-image references remain explicit evidence gaps.

## Invariants

- Human image review cannot be inferred from image availability.
- An inaccessible image is `not observed`, not evidence of absence.
- Family support cannot prove exact package form, wave, language, or source
  mapping.
- Browser-local or exported review decisions do not mutate active identity.
- No canonical sealed apply plan may include a row without sufficient reviewed
  exact evidence.
- No sealed pricing or publication may precede exact canonical mapping.
- No public or app visibility is enabled by this checkpoint.

## Evidence

- `docs/audits/pricing/one_piece_sealed_image_review_packet_v1/frozen_review_packet_v1/`
- `docs/audits/pricing/one_piece_sealed_review_image_availability_v1/live_probe_v1/`

The standalone review application is:

- `docs/audits/pricing/one_piece_sealed_image_review_packet_v1/frozen_review_packet_v1/REVIEW_PACKET.html`

## Explicit Next Gate

Complete the human image review and export its decision JSON. Validate that
export against the frozen packet fingerprint, reconcile all 403 candidate IDs
exactly once, preserve unavailable references as evidence gaps, and produce a
no-write review result. Do not construct or execute a canonical sealed apply
until row-specific exact identity and package-form evidence has passed that
review boundary.
