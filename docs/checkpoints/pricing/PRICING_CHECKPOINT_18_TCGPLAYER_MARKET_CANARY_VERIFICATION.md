# Pricing Checkpoint 18: TCGPlayer Market Canary Verification

## Context

TCGPlayer Market Product V1 had completed production migration, source
ingestion, qualification, snapshot, and no-exposure shadow proof. The next gate
required a genuine stratified sample rather than a first-100 query or an
operator-selected list.

The canary had to prove exact canonical identity, child printing, finish,
source product, market headline, provenance, and image/data agreement before
any signed-in customer could receive a price.

## Problem

The original shadow lock was technically deterministic but its eligible set
contained one stale identity assignment:

- TCGplayer product `84191`, Charizard from Arceus #1, was assigned to Arceus
  instead of Charizard
- the stale assignment existed in both TCGplayer and JustTCG mapping paths

The first 100-printing visual/data verification then found a second independent
data defect:

- `GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET` pointed to a Venusaur image
- both the external canonical URL and prior self-hosted object contained the
  wrong card
- the canonical name, number, set, source product, finish, and mapping were
  otherwise correct

Neither defect was active or customer-visible when found.

## Risk

- a deterministic pipeline could publish a deterministically wrong identity
- a correct source price could appear beside the wrong card image
- a first-N canary could miss important finish, era, branch, value, promo, and
  multi-finish strata
- replacing a failed sample could conceal a real production defect
- regenerating a sample after repair could silently substitute easier rows
- canary activation could expose more than the verified allowlist

## Decision

The Gate 2 canary is an immutable exact allowlist:

- exactly `100` printing/source-subtype tuples
- no first-N selection
- no substitutions after a failed row
- deterministic selection from the corrected eligible shadow set
- runtime resolution by exact `card_printing_id`, source product, and subtype
- definition allowed in dry-run and canary modes only
- every row requires provenance and visual/data status `passed`
- activation is impossible while the definition status is not `verified`

Identity and image defects are repaired through guarded, append-only or
pointer-only tools before verification resumes. They are never patched inside
the pricing publication result.

## Alternatives Rejected

- activating an unverified first 100 rows
- replacing failed sample rows
- accepting canonical text without inspecting the image
- changing historical assignment rows in place
- copying the sibling Arceus price or identity
- retaining the known-wrong Venusaur image as representative art
- adding a new unconstrained image-source value
- treating successful shadow execution as sufficient customer evidence

## Corrections Applied

### Charizard assignment

The correction preserved the original `V1` assignment rows and added two
higher-precedence `V1_1` assignments:

- `GV-PK-AR-1-HOLO` -> TCGplayer product `84191`, `Holofoil`
- `GV-PK-AR-1-RH` -> TCGplayer product `84191`, `Reverse Holofoil`

Corrected shadow truth:

- selected: `45,082`
- mapped: `33,394`
- eligible: `31,528`
- quarantined: `11,422`
- excluded: `2,132`
- snapshots per cycle: `31,528`
- active publication references: `0`

Three corrected cycles produced the same counts and reconciled successfully.

### Here Comes Team Rocket image

The guarded repair changed only canonical image evidence:

- card print: `c267755e-9f4a-4ed5-a6aa-190dd42ae977`
- source product: `250323`
- image source: `identity`
- image SHA-256:
  `381290a0efb413914a9a05512c1894c34c15f6c0dc448b0ffe1018538c1266b5`
- immutable storage object:
  `warehouse-derived/image-truth-v1/pricing-canary-100-v1/c267755e-9f4a-4ed5-a6aa-190dd42ae977/381290a0efb413914a9a05512c1894c34c15f6c0dc448b0ffe1018538c1266b5.jpg`

The failed first apply was rejected by the existing image-source constraint and
rolled back. The accepted repair used the governed `identity` source value.
Independent readback confirmed one active source mapping, unchanged historical
pricing snapshots, and zero current-publication references.

## Canary Composition

The verified sample contains:

- finish: `38` holo, `31` reverse, `31` normal
- era: `20` vintage, `37` middle, `43` modern
- branch: `80` Pokemon, `20` Trainer
- value band: `32` low, `36` medium, `32` high
- promos: `20`
- multi-finish families: `64`

Required corrected and edge rows are retained in the allowlist, including both
Arceus Charizard finishes and the repaired Here Comes Team Rocket printing.

## Verification Result

- canary ID: `TCGPLAYER_MARKET_CANARY_100_V1`
- definition status: `verified`
- selected rows: `100`
- provenance passed: `100`
- visual/data verification passed: `100`
- failed rows: `0`
- substitutions: `0`
- selected-ID/order drift after image repair: `0`
- current publication rows: `0`

Definition:

`backend/pricing/canaries/tcgplayer_market_canary_100_v1.json`

Definition SHA-256:

`9e4893a8f5e9b22a5ad894358274ea9171584a1a098fb5e388405470c066b7f3`

Verification report:

`docs/audits/pricing/TCGPLAYER_MARKET_CANARY_100_V1_VERIFICATION.json`

Verification report SHA-256:

`9b831caa36d361bd11f940851fedf1d734c8eb4a0c6cc933bdfbf3acabf752a9`

Image repair apply result SHA-256:

`8a23de8ffcce9091ea935d2944c20d40d6515412ce5d05c49532113f5e2d81fe`

## Tests

- full Node contract suite: `741/741` passed
- repository pre-commit shipcheck: passed
- web typecheck, lint, and strict build: passed
- Flutter analyze: passed
- Flutter tests: `302` passed
- canary definition and repair contracts: passed
- syntax and diff checks: passed

## Current Truths

- no TCGplayer Market price is active or customer-visible
- the exact 100-printing canary is verified and immutable
- all rows resolve to exact English Pokemon child printings and source finishes
- TCGplayer `marketPrice` remains the only Production V1 headline
- the two discovered data defects are repaired and preserved in audit evidence
- the shared app read model is implemented across supported web and Flutter
  consumers
- anonymous pricing remains gated

## Invariants

1. The canary may resolve only the 100 exact allowlisted tuples.
2. Failed rows are repaired or rejected; they are never substituted.
3. Exact child printings never inherit sibling prices.
4. Image evidence does not redefine canonical identity.
5. Publication workers never mutate canonical identity or image fields.
6. Qualification decisions and publication snapshots remain append-only.
7. Every displayed value retains source-row and artifact provenance.
8. Dry-run and shadow modes never activate customer pricing.
9. Anonymous pricing remains unavailable during the signed-in canary.
10. Rollback must be atomic and independently readable.

## What Must Never Be Broken

- exact card, printing, language, and finish qualification
- exact allowlist selection and no-substitution behavior
- visual/data verification before activation
- source artifact lineage and deterministic reconciliation
- separation of canonical repair from pricing publication
- one shared read model for every client
- signed-in versus anonymous rollout boundary

## Explicit Next Gate

Commit this verified definition and checkpoint, then run three final same-SHA
shadow cycles from that commit so the complete canary runtime and audit code
share one frozen provenance boundary.

After those cycles reconcile, run the exact verified 100-printing definition in
dry-run mode. Only a `100/100` dry-run with zero substitutions, zero write
boundaries, and zero reconciliation mismatches may proceed to authenticated
canary activation. Anonymous pricing remains gated.
