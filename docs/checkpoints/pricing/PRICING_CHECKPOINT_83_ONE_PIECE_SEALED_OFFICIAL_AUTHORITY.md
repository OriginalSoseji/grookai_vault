# Pricing Checkpoint 83: One Piece Sealed Official Authority

## Context

Checkpoint 82 created proposal-only identity reviews for all 403 One Piece
sealed source products. Those proposals intentionally lacked manufacturer and
official product-family authority. This gate acquired the current English
Bandai One Piece Card Game product catalog directly from the official product
site and bound compatible official family evidence to the existing proposals.

The crawl ran from the exact clean producer commit
`3355ea8e1218135893d53723b4c387521febe7e9`. Raw HTML was retained only in the
ignored local cache. Permanent audit artifacts contain parsed source records,
page hashes, candidate bindings, residual review rows, and artifact hashes.

## Problem

TCGPlayer product names can identify boxes, cases, displays, waves, language
editions, and bundles that the official Bandai product page does not enumerate
as separate variants. Name similarity can support a common product family, but
it cannot prove exact source-to-variant ownership.

The official site also contains combined legacy pages, nested index fields,
and newer marketing headings. The parser had to preserve individual product
names from combined pages and prevent broad source-group labels from creating
false family support.

## Decision

- Treat Bandai's English One Piece product site as official family,
  manufacturer, release-date, contents, and reference-image evidence.
- Preserve every official page URL, response hash, parsed record fingerprint,
  and candidate binding.
- Bind only by the candidate's proposed canonical name and exact source product
  name. Broad source group labels are not matching evidence.
- Treat combined official pages as one source record with multiple explicit
  official product-name aliases.
- Keep every binding review-only.
- Grant no exact box, case, display, wave, language, source mapping, pricing,
  publication, or app authority from this evidence.

## Result

- 17 official product-index pages read
- 176 official product detail records parsed
- 0 detail-page failures
- 403 candidate review rows reconciled exactly once
- 215 unique official family-support candidates
- 1 ambiguous family-support candidate
- 187 residual candidates without official family support
- 0 exact variant authorities
- 0 exact source-mapping authorities
- 0 database connections or writes
- 0 Storage writes
- 0 source-image downloads
- 0 pricing, publication, release, pointer, or app writes

The one ambiguous row is TCGPlayer source product `525294`, `Premium Card
Collection -Best Selection Vol. 1-`. It remains in review and has no official
record attached as authority.

Representative family-support checks passed:

- ST-04 deck and display candidates bind to the combined official ST-01 through
  ST-04 page, with the individual ST-04 product name preserved.
- Romance Dawn pack, booster box, and case candidates bind to the official
  OP-01 product family without asserting packaging or wave authority.
- Double Pack Set Volume 2 binds to the official DP-02 page rather than the
  related OP-05 booster page.
- Premium Card Collection Best Selection Volumes 2 through 6 bind to their
  matching official product pages; Volume 1 remains ambiguous.
- Starter Deck 27 binds to the official ST-27 page.

## Proof

- Review-plan fingerprint:
  `ea4a5f2281b78bf71bcbb6fcebcbb37754d4c126ba7a3fa20e94920126fbbc90`
- Official-authority fingerprint:
  `b2a8119e448ebd637d8f447c5aad8575b0e6a56a25e38f58d1d3f7b4b2a5ebae`
- Candidate-bindings SHA-256:
  `b065fa046312dd01689d43862f850891480fea21204b88e34405f51eb38488f2`
- Official-records SHA-256:
  `7a47818ea293858a797e3b88ce9e35e46b6dcb2b94ed3d87bae66fb8253fa6bd`
- Residual-review SHA-256:
  `e94daf4f46f4ac9167bdb22d233031b80a3ecbedf2fc7cfc504a47b3a39b1456`
- Producer commit:
  `3355ea8e1218135893d53723b4c387521febe7e9`

Targeted parser, identity-review, authority-boundary, and tamper tests passed
`16/16`. The producer commits also passed the complete repository shipcheck,
including `614/614` Flutter tests from a clean generated state.

## Current Truths

- Production still has 403 service-only One Piece sealed candidates.
- Production still has zero One Piece sealed canonical families, variants,
  source mappings, evidence promotions, pricing qualifications, releases,
  members, or pointers.
- Official family evidence now reduces the manual review surface for 215 rows.
- The 188 ambiguous or unsupported rows remain candidates, not failures.
- A unique family-support candidate still does not prove its exact TCGPlayer
  package form, wave, language, or distribution unit.
- The complete One Piece card baseline remains hidden and unchanged.

## Invariants

- Official family support is not exact source mapping authority.
- Name similarity cannot promote a sealed product.
- A booster page cannot prove a box, case, display, or wave.
- A reference image cannot prove a source variant unless exact image ownership
  and product equivalence are separately confirmed.
- Ambiguous and unsupported rows remain held without being collapsed.
- No sealed pricing or publication may precede reviewed exact mapping.
- No public or app visibility is enabled by this checkpoint.

## Evidence

- `docs/audits/pricing/one_piece_sealed_official_authority_v1/official_english_snapshot_v1/`

## Explicit Next Gate

Build an image-assisted residual review packet for the 403 candidates. Show the
source product identity, proposed family and package form, official reference
page and image where available, source image where already licensed and
available, exact blockers, and immutable review controls. Promote nothing.
Exact source-to-variant confirmation must be completed before constructing any
sealed canonical apply plan.
