# One Piece Sealed Automated Evidence Review V1

## Purpose

Replace blanket human image review with deterministic online source evidence
for exact One Piece sealed catalog identities. Human review is an exception
path for contradictory or incomplete evidence, not a prerequisite when exact
source identity is reproducible.

This contract changes review policy only. It does not change the sealed schema,
write production data, activate a release, qualify pricing, or expose sealed
products to clients.

## Evidence Authority

TCGCSV documents that its TCGPlayer data is exported from TCGPlayer API
endpoints. A fresh group-products response may therefore prove exact TCGPlayer
source identity when all of these fields reproduce the frozen candidate:

- category ID;
- group ID;
- product ID;
- normalized exact product name;
- product-specific canonical TCGPlayer URL;
- product-specific TCGPlayer image URL;
- absence of card-number, rarity, and card-type metadata;
- package form derived deterministically from the exact product name.

The response URL, response SHA-256, retrieval time, transport, exact source
fields, and per-row evidence fingerprint must be retained. Raw response bodies
are not permanent audit artifacts.

Official Bandai records remain manufacturer and family-support evidence. They
are not required to prove that a TCGPlayer product ID exists as the exact
source-listed package variant. A Bandai family page still cannot invent box,
case, display, wave, or bundle details omitted from that page.

## Automated Adjudication

An exact current English source match may produce an append-only
`confirmed_sealed` review proposal with:

- review contract
  `ONE_PIECE_SEALED_AUTOMATED_EVIDENCE_REVIEW_V1`;
- a deterministic automation reviewer UUID;
- complete decision evidence fingerprints;
- `human_judgment_used = false`;
- exact source mapping eligibility;
- no database apply, pricing, publication, release, or app authority.

This is evidence adjudication, not name similarity. Any failed identity check
routes the row to review and produces no canonical plan row.

## Scope Holds

Freshly matched rows remain outside the current apply plan when they are:

- explicitly non-English;
- future releases;
- presale products.

These are scope holds, not identity-review failures. They retain their exact
source evidence and can enter a later release-specific gate.

## Identity Rules

- The exact TCGPlayer source tuple maps to at most one sealed variant.
- Package form must come from the exact product name, not an image guess.
- Unknown region, edition, wave, UPC, SKU, quantity, and contents remain null.
- Official contents cannot be inherited by boxes, cases, displays, or bundles
  unless the official record explicitly proves that exact configuration.
- An unavailable source image is an evidence gap for visual inspection, not an
  identity failure when exact catalog identity is otherwise reproduced.
- Source price lanes do not grant pricing-publication authority.
- Canonical sealed data remains separate from cards and card printings.

## No-Write Boundary

The online resolution artifact may contain deterministic proposed family,
variant, review, mapping, and evidence rows. The artifact always records
`apply_authority = false`. Production writes require a separate read-only
collision/schema preflight, rollback proof, frozen apply fingerprint, and
post-apply readback.
