# One Piece OP16/OP17 Production Closure V1

## Result

OP16 and OP17 are complete for the governed signed-in parent-card catalog
boundary covered by this checkpoint.

- OP16: 226/226 identities, evidence rows, exact TCGPlayer mappings, and exact
  self-hosted images; 226 signed-in visible; 0 anonymous visible.
- OP17: 169/169 identities, evidence rows, exact TCGPlayer mappings, and exact
  self-hosted images; 169 signed-in visible; 0 anonymous visible.
- OP16 suppressed rows: 0.
- OP17 suppressed rows: 0.
- One Piece actionable discovery gaps after closure: 0.
- One Piece shadow promotion candidates after closure: 0.

This does not assert complete exact child-printing coverage or complete One
Piece pricing publication. It closes canonical parent identity, exact source
mapping, self-hosted image, and signed-in visibility for these two release
cohorts.

## Context

The scheduled catalog automation found one remaining actionable One Piece gap
after the original OP16 and OP17 release work. TCGPlayer product `712603` used
the title `Crone Oil`, while Bandai's official card and the printed card image
use `Crone Oli`, number `OP17-021`.

The product image and official image proved that the source title contained one
adjacent-character transposition. The canonical name had to remain `Crone Oli`.
The source typo could be accepted only under the exact official card-number
authority; product-name similarity alone was not sufficient.

OP16 also had one image that required a separately governed, hash-pinned exact
product source because the ordinary official and TCGPlayer image paths did not
provide usable exact evidence.

## Problem

Three separate conditions had to be resolved without weakening catalog safety:

1. Admit one source-title transposition only when exact official number and
   printed identity independently prove the card.
2. Allow an already-active set to receive one new suppressed row, close its
   image, and unsuppress exactly that row without republishing or changing the
   set release state.
3. Ensure activation cannot publish a cohort that changed after the frozen
   preflight snapshot.

## Risk

An overly broad typo rule could attach the wrong TCGPlayer product to a
canonical card. An active-set incremental writer could make an incomplete row
visible. A race between preflight and activation could publish drifted identity,
mapping, evidence, or image data. An image-source exception could become an
unbounded external-host bypass.

## Decision

- Canonical names remain governed by Bandai official number/name evidence.
- One adjacent transposition is accepted only under exact card-number authority
  and is recorded as
  `single_adjacent_transposition_with_exact_card_number`.
- Incremental rows for active sets are inserted suppressed.
- Image acquisition and exact pointer readback complete before visibility.
- Activation locks the applicable release state, recaptures the full closure
  snapshot inside the serializable transaction, and aborts before mutation if
  the fingerprint changed.
- Active-set audit uses actual anonymous/authenticated visibility evidence and
  the active-increment readiness evaluator.
- Governed external image authority is allowlisted, identity-bound, and
  expected-hash-bound.

## Alternatives Rejected

- Renaming the canonical card to the TCGPlayer typo.
- Matching on card number alone without bounded name support.
- Making the new OP17 row visible in the canonical apply transaction.
- Copying the source image URL directly into the app-facing pointer.
- Reusing the existing OP17 activation evidence without a new snapshot.
- Skipping the Storage canary or independent visibility readback.
- Treating an active set as hidden merely to reuse the original release path.

## Code And Review

- PR 305 governed the exact external image source used by OP16.
- PR 306 added independent readback support for a proven legacy active set.
- PR 307 added bounded adjacent-transposition authority and safe active-set
  incremental closure.
- Final production producer merge SHA:
  `b1a4ef369edef1bd6569c9a3292a3f17c53c32a7`.
- PR 307 passed repository CI and two Codex review findings were repaired:
  in-transaction snapshot revalidation and active-set audit readiness.
- Targeted One Piece contracts: 32/32 passed.

## OP16 Proof

### Image Source Governance

- Migration dry run: GitHub Actions run `33199304632`.
- Migration apply/readback: GitHub Actions run `33199398804`.
- Migration:
  `20260828180000_one_piece_verified_external_image_source_v1.sql`.
- Constraint readback: exactly one matching constraint.
- Rollback-only label proof: exactly one
  `self_hosted_verified_external_exact_product_v1` candidate.
- Durable target rows before/after migration: 0/0.

### Image Closure

- Fresh audit: run `33199553202`.
- Audit fingerprint:
  `cf7aca0a5bd99e18704c746af8524ab760f9ff5c8ce540576d9556f4a91c3acd`.
- Cohort: 226.
- Exact images before: 150.
- Remaining candidates: 76.
- Storage canary: run `33199658862`; 10 created, 10 removed, 10
  verified absent, zero residue.
- Durable image apply: run `33199773216`; 76 objects created and 76 exact
  pointers written.
- Post-image fingerprint:
  `1690a3376bfc12b824a7c6fc9cfebeb72028dad2f8038a9c9a1a44a33b3b4058`.

The initial verify run `33199973401` failed closed because OP16 is a legacy
active set without a release-control row. No OP16 data failure occurred. PR 306
added the narrowly bounded independent readback mode, and run `33200615348`
then proved:

- cohort rows: 226;
- active identities/evidence/exact mappings: 226/226/226;
- self-hosted exact images: 226;
- suppressed rows: 0;
- signed-in visible cards: 226;
- anonymous visible cards: 0;
- release mode: `legacy_active_without_release_control`;
- database writes: 0;
- Storage writes: 0.

## OP17 Final Gap Closure

### Frozen Canonical Payload

- Plan: run `33203369723`.
- Rollback-proven dry run: run `33203483345`.
- Durable apply: run `33203569635`.
- Payload fingerprint:
  `26cb6991fa7a670da01fa071d405d43df996a6fbfc793ab08362237bddefeaed`.
- Source product: TCGPlayer `712603`, source title `Crone Oil`.
- Canonical identity: `Crone Oli`, `OP17-021`.
- Card print: `GV-OP-TCGP-712603` /
  `7babc0fd-ef0b-5af3-8d34-16aff102adf4`.
- Durable authorized writes: one parent card, one active identity, one active
  source-evidence row, and one exact TCGPlayer external mapping.
- Set/control writes: 0.
- Image, pricing, publication, child-printing, Vault, update, and delete writes:
  0.
- The new row remained suppressed after canonical apply.

### Image And Visibility Closure

- Fresh active-increment audit: run `33203685849`.
- Pre-image fingerprint:
  `ef362856e3a041a8ee15cb14883bd108d0025da3cf92fe46094e146ab8f0f8b4`.
- Audit state: 169 cohort rows, 168 exact images, 1 suppressed row,
  authenticated visibility 168, anonymous visibility 0.
- Storage canary: run `33203790559`; one object created, read back, removed,
  and verified absent; database writes 0; fingerprint unchanged.
- Durable image apply: run `33203889732`; one object created and one exact
  image pointer written.
- Post-image fingerprint:
  `42d59d54058f00c92414fb11e6554b1a68a1284e3edf74e83a5dafbb521056d7`.
- Activation canary: run `33203981872`; release rows 0, one row temporarily
  unsuppressed, authenticated visibility 168 to 169, anonymous visibility 0,
  rollback complete, fingerprint unchanged.
- Durable activation: run `33204077705`; release rows 0, exactly one row
  unsuppressed, authenticated visibility 169, anonymous visibility 0.
- Independent verify: run `33204170056`.
- Final fingerprint:
  `e99458f5b62725fcda889c39b450125c06bde3f2501ce4e2f415abf43a52a0cd`.

The final OP17 independent readback proved:

- cohort rows: 169;
- target-set rows: 158;
- cross-set rows with retained printed-set ownership: 11;
- active identities/evidence/exact mappings: 169/169/169;
- duplicate mappings: 0;
- self-hosted exact images: 169;
- suppressed rows: 0;
- signed-in visible cards: 169;
- anonymous visible cards: 0;
- database writes: 0;
- Storage writes: 0.

### New Image Evidence

- Storage path:
  `one-piece/card-prints/tcgplayer/712603/5365885f2795f7039d4d48634a4f905f.jpg`.
- SHA-256:
  `5365885f2795f7039d4d48634a4f905f521fed8209763823f4d88fe45a20a3fe`.
- Dimensions: 600 x 838.
- Size: 94,703 bytes.
- Public HTTP readback: `200 OK`, `image/jpeg`, 94,703 bytes.

## Automation Readback

Fresh automation ran after final activation from merge SHA `b1a4ef36`:

- Universal Catalog Discovery: run `33204340076`.
- Catalog Shadow Reconciliation: run `33204342256`.
- One Piece actionable gaps: 0.
- One Piece canonical promotion candidates: 0.
- One Piece shadow promotion candidates: 0.
- Global shadow promotion candidates: 0.
- Canonical writes: false.
- Database writes: false.
- Storage/image-pointer/pricing/publication/Vault writes: false.
- Child-writer dispatches: false.

The discovery report still contains non-actionable One Piece classifications
(`source_behind`, `present_unverified`, and `ambiguous_source_identity`). These
do not represent missing OP16/OP17 launch rows and were not silently promoted.

## Current Truths

- OP16 and OP17 parent-card identity/image signed-in release cohorts are closed.
- All images in both closure cohorts are exact and self-hosted.
- Anonymous One Piece catalog visibility remains denied.
- OP17 is governed by a signed-in release-control row.
- OP16 remains a proven legacy active set without a release-control row.
- The source typo `Crone Oil` is preserved as source evidence; canonical truth
  is `Crone Oli`.
- The universal automation no longer identifies a One Piece canonical write
  candidate.

## Invariants

- Official printed number/name authority controls canonical identity.
- Source-title tolerance requires exact official card-number support.
- New rows for active sets stage suppressed and cannot become visible through
  canonical or image promotion.
- Activation may unsuppress only the exact fingerprint-bound suppressed cohort.
- Activation revalidates the full cohort inside the serializable transaction.
- Image objects must be self-hosted, hash-read-back, and identity-bound before
  app-facing pointers are written.
- Signed-in activation never authorizes anonymous visibility.
- Parent-card closure never implies exact child-printing completion.
- Image closure never authorizes pricing, Vault, or publication writes.

## What Must Never Be Broken

- Do not normalize a source typo into canonical truth without official evidence.
- Do not use external image URLs directly as active card-image pointers.
- Do not unsuppress an incomplete or drifted row.
- Do not infer anonymous release from signed-in visibility.
- Do not treat cross-set artwork/product rows as owned by OP17 when their
  printed-set evidence assigns them elsewhere.
- Do not claim that 169 parent rows prove every finish or printing is modeled.

## Deferred Scope

- Complete exact child-printing and finish expansion remains separate.
- One Piece singles MEE qualification/publication remains separate.
- Non-actionable ambiguous source identities remain evidence/review work.
- Public anonymous One Piece catalog rollout remains a separate product and
  licensing gate.

## Next Gate

No additional OP16/OP17 canonical parent or image write is required now.
Continue scheduled read-only discovery and shadow reconciliation. If automation
finds a new evidence-backed One Piece gap, stage it suppressed and repeat the
same plan, rollback, exact-image, activation-canary, and independent-readback
sequence. Treat exact child-printing coverage and One Piece singles pricing as
separate governed projects.
