# Pricing Checkpoint 81: One Piece Sealed Candidates Applied

## Context

The complete One Piece source manifest contains 403 exact sealed source
products. The current English numbered and DON card lanes were already applied
as hidden canonical parents, while sealed families, variants, mappings,
pricing qualifications, and releases remained empty.

Sealed products cannot safely use the card-parent promotion policy. Source
product identity is sufficient warehouse evidence, but it does not prove the
canonical family, package variant, language, included contents, image
equivalence, or pricing lane needed for product publication.

## Decision

Preserve all 403 exact sealed source products in the existing service-only
`sealed_product_candidates` table. Every row remains a review candidate with:

- `promotion_eligible = false`
- `canonical_authority = false`
- `publication_authority = false`
- source images retained as reference-only evidence

Do not create sealed families, variants, reviews, source mappings, evidence,
pricing qualifications, releases, release members, or an active release
pointer through this gate.

## Source Coverage

The candidate warehouse contains:

- 403 exact source products
- 400 English products
- 3 explicitly Japanese products
- 393 current products
- 10 future or presale products
- 363 products with source price lanes
- 40 products without source price lanes

No row was omitted because it was non-English, future, missing a price lane,
or not yet reconciled to a family. Those distinctions are retained as review
evidence rather than converted into canonical claims.

## Applied Rows

- 403 inserts into `sealed_product_candidates`
- 0 inserts into the other nine sealed-domain tables
- 0 updates
- 0 deletes
- 0 HOT updates
- 0 card-table writes
- 0 Storage writes
- 0 pricing or publication writes

The transaction-local and fresh durable readbacks both returned:

- 403 rows
- row fingerprint
  `2c6e55657a61ae55b51152d2b1adbe00fc59ffc9828fa8165ac01f8ad290c11f`

## Failed-First Preflight

The first production read-only preflight stopped before any write because it
found two proof-policy mismatches:

- the release pointer correctly denied direct service-role inserts because it
  may only be changed through its guarded function;
- durable staging returned 406 physical rows because three legacy ST-01 rows
  duplicated source facts also present in complete staging.

The gate was repaired to verify the actual release-pointer mutation boundary
and to read 403 distinct exact source facts. The failed evidence was preserved.
The corrected preflight then passed with zero collisions and all sealed tables
empty.

## Proof Chain

- Candidate-plan fingerprint:
  `32188b31a64abe81635e2c6133f17eff9c38628dbdc7cdd21b9d64a9dba325bd`
- Payload fingerprint:
  `ff26c514511b9184d8ba91c793b40a249818c2bc5b3ca4778f6b253b6a27cbb2`
- Corrected read-only preflight fingerprint:
  `8a10f9a1e127ebabb345527a3f40427b37b9b28fbc39d6c1b21c02bbb84416d2`
- Ten-product rollback-canary fingerprint:
  `2889bcd450ea4465696af16f30217215fbef0cdb01fb16d4f587b2ce2cf88b02`
- Durable apply-plan fingerprint:
  `5730c567bb61e5499e759e580fcb36640d876a59c19d5525c6755d8c8a426c1c`
- Candidate-ID fingerprint:
  `0ddbc388fce3a00823f39e9c45f6baf0d02058bb9c0c947b2e5870ba1ed19bbb`
- Source-product-ID fingerprint:
  `9dd719f60099363250203e156ef08e08c6547504e6f7742dedf10138b0db5fcf`
- Durable row fingerprint:
  `2c6e55657a61ae55b51152d2b1adbe00fc59ffc9828fa8165ac01f8ad290c11f`
- Exact apply producer commit:
  `b63d7edc83d9b4ecb528816bb13cd8179a8cbb08`

The rollback canary covered decks, packs, boxes, promo and gift products,
premium products, double packs, special DON products, explicit Japanese
products, and future products. It inserted ten candidate rows, rolled the
transaction back, and independently verified zero residue.

The durable writer then inserted exactly 403 rows and reproduced the same
candidate row count and fingerprint in transaction and after commit. A
separate read-only verifier reproduced the full readback with zero findings.

## Current Truths

- `sealed_product_candidates` contains 403 One Piece source candidates.
- `sealed_product_families` and `sealed_product_variants` remain empty.
- Candidate reviews, source mappings, variant evidence, pricing lane
  qualifications, releases, release members, and the release pointer remain
  empty.
- The One Piece card baseline remains 60 sets/groupings, 6,730 parents,
  identities, evidence rows, and mappings, plus 14 ST-01 child printings and
  printing mappings.
- One Piece remains hidden from anon, authenticated, and request-path service
  visibility checks.
- No sealed product is canonical, priced, published, or app-visible because of
  this candidate apply.
- The complete 7,261-product source manifest is now accounted for across
  hidden card canon, explicit holds, quarantine, and sealed candidates.

## Invariants

- A source product candidate is not a canonical sealed family or variant.
- Do not collapse products by title, packaging resemblance, or price lane.
- Do not infer language, included contents, release membership, or exact
  variant identity without evidence.
- Do not reuse source image URLs as public product pointers before acquisition,
  self-hosting, hash verification, and exact variant binding.
- Do not qualify pricing before exact source-to-variant mapping exists.
- Do not activate a sealed release pointer until an immutable reviewed release
  passes security, reconciliation, and client-read verification.
- Do not expose hidden One Piece card or sealed data through client fallbacks.

## Evidence

- `docs/audits/pricing/one_piece_complete_sealed_candidate_v1/frozen_plan_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_preflight_v1/attempt_1_failed_policy_and_duplicate_staging_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_preflight_v1/production_read_only_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_rollback_canary_v1/production_rollback_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_apply_v1/frozen_apply_plan_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_apply_v1/durable_apply_v1/`
- `docs/audits/pricing/one_piece_complete_sealed_candidate_apply_v1/independent_post_apply_v1/`

## Explicit Next Gate

Reconcile candidate products into proposed sealed families and variants using
official or human-reviewed evidence. Then acquire and self-host exact variant
images, create reviewed source mappings and variant evidence, qualify pricing,
construct an immutable hidden release, and verify client read models. Public
activation remains a separate explicit release gate.

For the broader One Piece catalog, exact child printings and finishes, image
coverage, the numbered authority holds, pricing qualification, app read models,
and release activation also remain separate downstream gates.
