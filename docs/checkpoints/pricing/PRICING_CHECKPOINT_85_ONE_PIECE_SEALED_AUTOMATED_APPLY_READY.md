# Pricing Checkpoint 85: One Piece Sealed Automated Apply Ready

## Context

The One Piece complete-source ingestion preserved 403 TCGPlayer products as
service-only sealed candidates. The prior gate required blanket human image
review before those candidates could become canonical sealed identities.

That review requirement was disproportionate to the evidence available. Each
candidate already retained an exact TCGPlayer category, group, product ID,
product name, canonical URL, product-specific image reference, source payload
hash, language classification, release state, and package-form proposal.

## Problem

The system treated every sealed candidate as if source identity were ambiguous.
That would require 403 manual judgments even when a fresh authoritative catalog
export reproduced the exact frozen source tuple. Manual review should remain an
exception for conflicting or incomplete evidence, not a mandatory step for an
exact machine-verifiable identity.

## Risk

Automating the decision could have created false sealed identities, collapsed
distinct package variants, accepted individual cards as sealed products,
overstated image availability, collided with production uniqueness constraints,
or written canonical rows without a rollback and readback proof.

The first live artifact exposed two fail-closed defects before any database
mutation:

- catalog image identity incorrectly required `imageCount >= 1`, even though an
  unavailable binary does not invalidate an exact product-specific image URL;
- two distinct `Box Promotion Pack` families shared a proposed family key across
  different product lines, which would violate the production
  `(game_key, family_key)` uniqueness constraint.

Both defects were repaired and covered by contract tests before the final live
evidence run.

## Decision

Fresh TCGCSV group exports may replace blanket human review only when they
reproduce every exact TCGPlayer identity field required by
`ONE_PIECE_SEALED_AUTOMATED_EVIDENCE_REVIEW_V1`. TCGCSV documents these rows as
direct TCGPlayer API exports.

An unavailable image binary is recorded as an availability limitation, not an
identity failure, when the exact product-specific catalog URL is preserved.
Image evidence grants no Storage or pointer authority.

Same-named families from different product lines receive deterministic,
schema-safe family keys. The resolver validator now mirrors the production
family, variant, source-mapping, and evidence uniqueness constraints.

## Alternatives Rejected

- Manual review of all 403 rows: rejected because exact source evidence is
  deterministic and complete.
- Name-only matching: rejected because it cannot prove source identity or
  package form.
- Reusing source image availability as identity authority: rejected because CDN
  availability and catalog identity are separate facts.
- Merging same-named promotion families across product lines: rejected because
  the source product lines are distinct.
- Writing pricing, releases, publication, or app visibility with identity rows:
  rejected because those are separate downstream gates.

## Automated Source Result

- Producer commit: `05f804751fba6d5aeed71cc01d1bce15411c8dba`
- Resolution fingerprint:
  `f4232cbdd644b8b8b89a0b1be7fbf59507dc20f2b7f971282ac27d08615c841d`
- Canonical-plan SHA-256:
  `c4c4fa550ed38c16610599abb534cdc89ba4e3c3cae1d9a7e00cb13f5be7f59b`
- Source groups fetched: 81
- Source fetch failures: 0
- Exact source identities: 403 / 403
- Current English auto-resolutions: 390
- Non-English scope holds: 3
- Future or presale scope holds: 10
- Human-review residual: 0
- Database and Storage writes: 0

## Production Preflight

- Producer commit: `afc93703d65ea6e617201eb1031475788603d81c`
- Preflight fingerprint:
  `b9e7db56f49b8213662e7c5013c1f4caece257caacf17ebda5e7db81d22e44c3`
- Candidate lineage: 390 / 390 exact
- Production collisions: 0 across all 12 checked identity lanes
- Schema and service-only security findings: 0
- Transaction mode: repeatable-read and read-only
- Protected baseline changes: 0
- Database writes: 0

The production baseline remained:

- sealed candidates: 403
- canonical sealed families: 0
- canonical sealed variants: 0
- sealed reviews: 0
- sealed source mappings: 0
- sealed variant evidence: 0

## Rollback Proof

- Producer commit: `8eb7ea83f1d928bdbaa4378d8740c8c4bd7decb5`
- Sample fingerprint:
  `57a3f62dd22be933443c90ca4805c16ad04d90309ce5bb0886ec975b0fdc2590`
- Package forms covered: 12 / 12
- Transient rows: 13 families, 18 variants, 18 reviews, 18 mappings,
  79 evidence rows
- Transaction-local readback: exact
- Write attribution: only the five expected sealed tables
- Updates and deletes: 0
- Transaction committed: false
- Independent post-rollback residue: 0
- Protected baseline changes: 0

## Frozen Apply Plan

- Producer commit: `7d27cc16ed3ce6bd4b23c9cf2fe42b60d3b9c3e6`
- Apply-plan fingerprint:
  `93189f92e9cfea5db9eabb22b1de0062938b29a4491204f8b81e88c14d81db10`
- Canonical payload fingerprint:
  `d70fc8b74ebd84ff8da19170e7ccc49d55ab362eb212c3438a3ee68050476e41`
- Mutation-contract hash:
  `259cef61e3efccbe5df168b0cb9bb654f36da148dead482a979113b4b2817c0d`
- Planned inserts: 242 families, 390 variants, 390 reviews, 390 exact
  source mappings, and 1,731 evidence rows
- Planned updates and deletes: 0
- Candidate, card, Storage, pricing, release, publication, Vault, and app
  visibility writes: 0
- Apply executed: false

## Current Truths

- Blanket human review is no longer required for these 403 candidates.
- All 403 source identities are proven online with exact preserved evidence.
- Exactly 390 current English products are canonical-apply eligible.
- The 3 Japanese and 10 future/presale products are scope holds, not failures.
- The production candidate warehouse still contains all 403 source rows.
- Production canonical sealed tables still contain zero rows.
- One Piece remains hidden from clients.
- No sealed pricing or publication authority exists.
- No Storage object or image pointer was changed.
- Every permanent artifact hash reconciles with zero mismatches.

## Invariants

- Source identity and image-binary availability remain separate.
- A candidate must remain an exact TCGPlayer source tuple.
- Individual card metadata blocks sealed auto-resolution.
- Package form comes from exact source text, not image inference.
- Unknown region, edition, UPC, SKU, quantity, and contents remain unknown.
- Family and variant identities never collapse source-distinct products.
- Candidate, review, mapping, and evidence foreign-key lineage remains exact.
- Canonical sealed identity does not authorize pricing or publication.
- Service-only RLS remains in force.
- One Piece remains hidden until a separate release gate.
- No update, delete, cleanup, quarantine, or overwrite is permitted.

## Tests

- One Piece sealed contract suite: 52 / 52 passed before the final source run.
- Evidence, preflight, canary, and apply-plan targeted tests passed.
- Repository shipcheck passed on every frozen producer commit.
- Final shipchecks included web typecheck, web lint, strict web build, Flutter
  analyze, and 614 / 614 Flutter tests.

## Permanent Artifacts

- `docs/audits/pricing/one_piece_sealed_online_evidence_resolution_v1/frozen_live_resolution_v1/`
- `docs/audits/pricing/one_piece_sealed_canonical_preflight_v1/production_read_only_v1/`
- `docs/audits/pricing/one_piece_sealed_canonical_rollback_canary_v1/production_rollback_v1/`
- `docs/audits/pricing/one_piece_sealed_canonical_apply_plan_v1/frozen_apply_plan_v1/`

## Exact Next Gate

Implement and test the durable writer against the frozen apply plan. Immediately
before execution, rerun the exact zero-collision and candidate-lineage preflight.
The writer must require the apply-plan fingerprint, payload fingerprint, and
mutation-contract hash; use one insert-only transaction; prove exact
transaction-local readback and write attribution; commit only on zero findings;
then perform an independent read-only post-commit readback.

The next gate must not write candidates, cards, Storage, image pointers,
pricing, releases, publication, Vault rows, or app visibility. One Piece remains
hidden after canonical sealed identity is applied.
