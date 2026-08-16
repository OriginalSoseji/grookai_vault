# Pricing Checkpoint 82: One Piece Sealed Identity Review Plan

## Context

Checkpoint 81 preserved all 403 One Piece sealed source products in the
service-only candidate warehouse. The sealed-domain contract still requires
reviewed family, variant, and source-mapping evidence before promotion.

Reviewing raw source rows without structure would make it easy to collapse a
deck into its display, a box into its case, or one language or wave into
another. This gate creates deterministic review proposals without granting
authority to those proposals.

## Decision

Derive an offline review row for every candidate containing:

- the exact source identity and payload hash;
- a proposed family name and key;
- a proposed package form;
- a product-specific proposed variant key;
- source-supported language, wave, and set-of quantity cues;
- explicit blockers for missing authority, contents, region, future state, or
  non-English scope;
- immutable row and plan fingerprints.

All proposed values remain `proposal_only`. No proposal is a confirmed fact,
review decision, canonical family, canonical variant, source mapping, pricing
qualification, release member, or client-visible product.

## Result

- 403 candidate rows preserved exactly once
- 403 review rows
- 246 proposed family keys
- 0 unresolved package-form proposals
- 390 current English structured-first review rows
- 13 non-English, future, or presale holds
- 0 canonical rows
- 0 source mappings
- 0 pricing rows
- 0 release rows

Proposed package forms:

- 21 packs
- 20 sleeved packs
- 23 booster boxes
- 15 displays
- 51 cases
- 40 decks
- 42 deck displays
- 1 kit
- 5 tins
- 32 collections
- 28 bundles
- 125 promotional packs

## Proof

- Candidate-plan fingerprint:
  `32188b31a64abe81635e2c6133f17eff9c38628dbdc7cdd21b9d64a9dba325bd`
- Candidate-payload fingerprint:
  `ff26c514511b9184d8ba91c793b40a249818c2bc5b3ca4778f6b253b6a27cbb2`
- Review-plan fingerprint:
  `ea4a5f2281b78bf71bcbb6fcebcbb37754d4c126ba7a3fa20e94920126fbbc90`
- Review-payload fingerprint:
  `808c8f5a5870394a168447e6ab70d576b8832316146207c1015aeadbc2de8b3b`
- Producer commit:
  `d502e483d0ff8810e688e15bf34148b252f89b6b`

The contract tests cover booster pack, sleeved pack, box, case, deck, deck
display, generic display, kit, tin, bundle, collection, promotional pack,
booster waves, set-of quantities, language holds, future holds, tampering, and
the offline-only execution boundary.

## Current Truths

- The package-form proposal covers all 403 source rows.
- Source-derived wave and set-of values remain proposals pending review.
- Manufacturer `Bandai` is proposed at family level but explicitly blocked
  until official authority is bound to the candidate.
- Contents remain unobserved for rows whose source title does not state them.
- Region remains unobserved for every proposal.
- Product-specific variant keys preserve every source row and prevent an
  accidental many-to-one collapse during review.
- Production still contains 403 candidates and zero sealed families, variants,
  reviews, mappings, evidence, pricing qualifications, releases, members, or
  pointer rows.

## Invariants

- Deterministic parsing accelerates review; it does not replace review.
- Do not convert a proposed family key into canonical identity without official
  or human-confirmed family evidence.
- Do not treat a package-form proposal as exact mapping authority.
- Do not infer contents, region, SKU, UPC, release date, or image equivalence.
- Do not collapse product-specific rows merely because their proposed family
  keys match.
- Non-English and future products remain separate held lanes.
- No sealed pricing or publication may precede exact reviewed source mapping.

## Evidence

- `docs/audits/pricing/one_piece_sealed_identity_review_v1/frozen_offline_review_v1/`

## Explicit Next Gate

Crawl the official English One Piece product catalog into a hashed read-only
authority artifact, bind official product pages to compatible review
proposals, and produce a residual image-assisted human review queue. Official
family support may reduce review effort, but exact source-to-variant mapping
still requires the contract's review evidence before any database promotion.
