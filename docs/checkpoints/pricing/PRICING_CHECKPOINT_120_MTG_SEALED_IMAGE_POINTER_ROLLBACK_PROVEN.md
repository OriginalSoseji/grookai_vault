# Pricing Checkpoint 120: MTG Sealed Image Pointer Rollback Proven

## Context

Checkpoint 119 made the complete MTG sealed image evidence release durable but
left it inactive. The next gate had to prove the compare-and-swap pointer path
without changing client visibility or leaving a production pointer behind.

## Problem

The first pointer canary from producer
`5629990277cc4f389790cd2804eb30e1253de047` failed when PostgreSQL invoked
`sealed_product_set_active_image_release_v1`. The function returns an output
column named `game_key` and used `on conflict (game_key)`, making the conflict
target ambiguous inside PL/pgSQL.

## Risk

Bypassing the function with a direct pointer insert would have skipped its
manifest, frozen-release, active-price-release, and compare-and-swap checks.
Editing the already-applied historical migration would have created false
migration history. Combining repair, durable activation, signer, RPC, and
visibility changes would have obscured the trust boundary.

## Decision

Preserve the failed-safe run, add a new forward-only migration, and replace only
the ambiguous conflict target with the named primary-key constraint:

```sql
on conflict on constraint sealed_product_image_release_pointer_pkey
```

The complete repair migration was first installed and read back in a production
transaction, rolled back, and independently proven absent. It was then applied
under exact authority from producer
`afc812779e495e24cc1ec1c0521a450ada4d232d`.

## Alternatives Rejected

- Direct pointer insertion: rejected because it bypasses governed checks.
- Historical migration modification: rejected because migration history must
  remain forward-only and truthful.
- Renaming the function output column: rejected because it would change the
  deployed function contract unnecessarily.
- Combining activation and visibility: rejected because pointer authority must
  not itself grant client access.

## Migration Applied

- Migration:
  `20260905040000_sealed_product_image_pointer_conflict_repair_v1.sql`
- SHA-256:
  `195e104b60d7a356a49b131800074455636a4cde946c04dc94aabf036ff8f818`
- Apply plan:
  `273cc2511fd0f84c3026d13f7c18792c30f1791a7d47105c1f35a876c27297c3`
- Migration-ledger rows: `1`
- Function replacements: `1`
- Pointer writes: `0`
- Protected-state drift: `0`
- Independent readback findings: `0`

## Pointer Canary Proof

- Canary fingerprint:
  `a49bf02d128e4a5221a31922d2fc71900c6737c37c76cb209b83f652795ab60a`
- Transition inside transaction:
  `null -> 86b207e6-4f73-5d9a-af40-864c47256c38`
- Required active price release:
  `25626032-7d72-5542-a8e0-7a6532c2f776`
- Release/price binding: valid
- Candidate structural eligibility: valid
- Authenticated catalog visibility: allowed
- Authenticated sealed visibility: denied
- Signing while sealed visibility was hidden: denied
- Transaction committed: `false`
- Pointer after rollback: `null`
- Durable writes: `0`
- Findings: `0`

## Current Truths

- The frozen image release remains durable and immutable.
- The compare-and-swap function is repaired in production.
- The image pointer remains absent.
- MTG catalog visibility remains `signed_in`.
- MTG sealed visibility remains `hidden`.
- Pointer presence alone does not authorize image signing.
- RPC V3 remains an undeployed migration candidate.

## Invariants

- Activation must use the governed compare-and-swap function.
- The expected current pointer for first activation must remain `null`.
- The image release must remain bound to the active frozen price release.
- Image signing requires both catalog and sealed visibility in addition to the
  exact image, release, pricing, language, source, and freshness chain.
- Durable pointer, RPC, signer, client, visibility, and scheduler changes remain
  independently reviewable gates.

## What Must Never Be Broken

Do not bypass compare-and-swap, infer authority for the 33 image exclusions,
expose raw Storage paths, or treat image-pointer activation as permission to
make MTG sealed products visible.

## Verification

- MTG sealed image contract suite: `90/90` passed.
- Repair contract tests: `7/7` passed.
- Repair rollback artifact hashes: `6/6` valid.
- Durable repair artifact hashes: `6/6` valid.
- Pointer canary artifact hashes: `5/5` valid.
- Syntax checks and `git diff --check`: passed.

## Permanent Evidence

- Failed-safe original canary:
  `docs/audits/pricing/mtg_sealed_image_pointer_rollback_canary_v1/2026-09-05T03-36-08Z_production_rollback/`
- Repair rollback proof:
  `docs/audits/pricing/mtg_sealed_image_pointer_function_repair_v1/2026-09-05T03-48-56Z_production_rollback/`
- Durable repair and independent readback:
  `docs/audits/pricing/mtg_sealed_image_pointer_function_repair_v1/2026-09-05T04-12-17Z_apply/`
- Successful pointer rollback proof:
  `docs/audits/pricing/mtg_sealed_image_pointer_rollback_canary_v1/2026-09-05T04-12-38Z_production_rollback/`
- Repair contract:
  `docs/contracts/MTG_SEALED_IMAGE_POINTER_FUNCTION_REPAIR_V1.md`
- Pointer canary contract:
  `docs/contracts/MTG_SEALED_IMAGE_POINTER_ROLLBACK_CANARY_V1.md`

## Exact Next Gate

Build a separately guarded durable image-pointer activation executor and
generate a fresh, fingerprinted, read-only activation plan. Do not activate the
pointer until that exact executable plan receives separate authority. Do not
deploy RPC V3, signer changes, clients, visibility, or scheduling in that gate.
