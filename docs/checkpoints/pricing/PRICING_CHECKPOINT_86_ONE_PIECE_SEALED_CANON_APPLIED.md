# Pricing Checkpoint 86: One Piece Sealed Canon Applied

## Context

Checkpoint 85 froze an insert-only plan for 390 current English One Piece
sealed products. The source warehouse retained 403 exact TCGPlayer candidates;
three Japanese products and ten future or presale products remained explicit
scope holds.

## Problem

The online evidence, schema preflight, and rollback canary proved that the
payload was safe, but production still contained no canonical sealed families,
variants, reviews, source mappings, or variant evidence. Downstream sealed
pricing could not be designed against durable canonical identities.

## Risk

A durable writer could have collided with an existing identity, accepted stale
candidate lineage, inserted a partial payload, changed a protected table,
enabled One Piece visibility, or combined canonical identity with pricing or
publication authority.

## Decision

Apply the exact frozen English-current payload in one repeatable-read,
insert-only transaction. Require a fresh read-only collision and lineage
preflight, transaction-local exact payload readback, transaction-local write
attribution, hidden release status, and an independent read-only post-commit
verification.

No upsert, update, delete, conflict bypass, partial retry, pricing write,
publication write, Storage write, card write, Vault write, or release-control
change was permitted.

## Frozen Authority

- Durable writer producer commit:
  `0fea3b661f4ce94211901b6eb84ad59a39f79b29`
- Apply-plan fingerprint:
  `93189f92e9cfea5db9eabb22b1de0062938b29a4491204f8b81e88c14d81db10`
- Canonical payload fingerprint:
  `d70fc8b74ebd84ff8da19170e7ccc49d55ab362eb212c3438a3ee68050476e41`
- Mutation-contract hash:
  `259cef61e3efccbe5df168b0cb9bb654f36da148dead482a979113b4b2817c0d`
- Fresh preflight fingerprint:
  `b9e7db56f49b8213662e7c5013c1f4caece257caacf17ebda5e7db81d22e44c3`
- Apply execution fingerprint:
  `a57f9f79c1337b517d5cf211eabf2d0ce37b4f78537bbd16ff82028deca77445`
- Exact stored-payload readback hash:
  `69c27e4b22aefc2779f3a9b6bd22646920dd5690e9efd30bdae2058f4769ca75`

## Fresh Preflight

- Status: `production_read_only_preflight_passed`
- Candidate lineage: 390 / 390 exact
- Candidate lineage mismatches: 0
- Identity collisions: 0 across all 12 lanes
- Canonical sealed baseline before apply: 0 / 0 / 0 / 0 / 0
- Candidate warehouse baseline: 403
- Database writes: 0

## Durable Apply

The transaction committed exactly:

- 242 `sealed_product_families`
- 390 `sealed_product_variants`
- 390 `sealed_product_candidate_reviews`
- 390 `sealed_product_source_mappings`
- 1,731 `sealed_product_variant_evidence`

Transaction-local write attribution named only those five tables. Every table
reported the exact insert count and zero updates, deletes, or hot updates.
Expected and actual normalized payload hashes were identical before commit.

## Independent Readback

- Status: `independent_post_apply_readback_passed`
- Families / variants / reviews / mappings / evidence:
  242 / 390 / 390 / 390 / 1,731
- Candidate lineage: 390 / 390 exact
- Expected payload hash equals production payload hash: true
- Verification transaction read-only: true
- Verification writes: 0
- Artifact hash mismatches: 0

## Security And Visibility

- One Piece release status remains `hidden`.
- Anonymous game visibility remains false.
- Authenticated game visibility remains false.
- Service-only RLS and grant boundaries remain unchanged.
- No app-facing read model or release control was changed.

## Current Truths

- The 390 current English One Piece sealed source products now have durable,
  evidence-backed canonical family and variant identities.
- The 403 source candidates remain intact as the immutable source warehouse.
- Three Japanese and ten future or presale products remain scope holds.
- No pricing or publication authority has been granted to sealed identities.
- No sealed object is visible to anonymous or authenticated clients.
- No sealed images were uploaded and no image pointers were changed.
- Existing numbered-card, DON, child-printing, and card-image state was not
  modified by this transaction.

## Invariants

- Canonical sealed identity is separate from source candidate evidence.
- Canonical identity does not authorize pricing or publication.
- Source-distinct variants remain distinct.
- Unknown package attributes remain unknown.
- Scope holds are not promoted implicitly.
- One Piece remains hidden until a separately reviewed release gate.
- Pricing, publication, Storage, cards, Vault, and app visibility require their
  own bounded plans and proofs.

## Tests

- New durable-writer contract tests: 5 / 5 passed.
- Targeted sealed canonical gate tests: 11 / 11 passed.
- Full repository shipcheck passed before freezing the writer.
- Commit hook shipcheck passed from the frozen producer commit.
- Flutter tests: 614 / 614 passed in both full shipchecks.

## Permanent Artifacts

- `docs/audits/pricing/one_piece_sealed_canonical_preflight_v1/fresh_execution_preflight_v1/`
- `docs/audits/pricing/one_piece_sealed_canonical_apply_v1/durable_apply_v1/`
- `docs/audits/pricing/one_piece_sealed_canonical_apply_v1/independent_post_apply_v1/`

## Exact Next Gate

Design and run a read-only One Piece pricing-lineage readiness audit. It must
reconcile the 390 canonical variants to current warehouse price evidence,
separate exact variant pricing from unresolved package or language scope, and
produce a zero-write publication plan. Do not publish, enable app visibility,
or mutate release controls in that gate.
