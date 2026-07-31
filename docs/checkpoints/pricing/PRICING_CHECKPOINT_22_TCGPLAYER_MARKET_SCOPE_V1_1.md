# Pricing Checkpoint 22: TCGPlayer Market Scope V1.1

## Context

The first fixed coverage audit measured `90.712%` over `45,082` source
product/subtype rows. Investigation of its `3,191` gaps found that the
implemented scope classifier did not fully enforce the already-approved
Production V1 boundary.

The denominator included sealed products and explicit V1.1 print treatments
such as Poke Ball Pattern, Master Ball Pattern, Energy Symbol Pattern, Staff,
Prerelease, special holo treatments, and distribution variants.

## Problem

Coverage and publication each used a narrow, duplicated product-name regular
expression. It missed common packaged products and did not classify explicit
special-print markers. A broad replacement could also have excluded legitimate
numbered cards whose names contain words such as `Box` or `Tin`.

The failed V1 baseline could not be rewritten or discarded. Any correction had
to be a versioned scope-enforcement repair over the exact same source
population.

## Risk

- changing the denominator merely to manufacture a passing percentage
- publishing V1.1 special printings as ordinary Production V1 singles
- excluding legitimate cards such as `Suspicious Food Tin`
- allowing coverage and publication scope to drift apart
- changing the active 100-printing canary during its observation window
- losing the original failed baseline and its gap evidence

## Decision

`TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1` is the shared deterministic scope
classifier for coverage and future publication runs.

It returns:

- `in_scope`
- `unsupported_product_kind`
- `special_variant_v1_1`

Product-object terms require missing printed-number evidence. Explicit
special-print and distribution markers remain out of V1 even when a printed
number exists. Every result preserves the matched rule and source evidence.

Coverage is versioned as `TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1`.
Future publication runs use
`TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_1`. The frozen canary scheduler remains
on its original producing SHA until the observation window completes.

## Alternatives Rejected

- silently changing the meaning of the V1 policy constant
- deleting or replacing the failed `90.712%` baseline
- excluding every unmapped modern card
- treating all product names containing `Box` or `Tin` as sealed
- mapping Poke Ball, Master Ball, Staff, or stamped variants to ordinary cards
- deploying the new policy into the active canary scheduler

## Validation

Targeted policy tests pass `49/49`.

The complete TCGPlayer market contract group passes `74/74`.

Syntax checks and `git diff --check` pass.

The read-only coverage audit replayed the exact same:

- source shadow run:
  `TCGPLAYER-MARKET-SHADOW-FINAL-SHA-CYCLE3-20260728T0720Z-publication`
- source-producing commit:
  `958b14eaff091919d344d39517890f7a1fcb57e4`
- selected source rows: `45,082`

## Read-Only Result

- denominator: `32,700`
- numerator: `31,123`
- gaps: `1,577`
- exclusions: `12,382`
- coverage: `95.177%`
- required: `95%`
- rows needed: `0`
- unclassified gaps: `0`

The fixed-denominator coverage threshold passes.

Gap reasons:

- missing active source mapping: `1,416`
- variant assignment not exact child finish: `149`
- missing mapping method: `9`
- legacy unsupported-product decision: `3`

The last three rows are ordinary `Suspicious Food Tin` rows. They remain gaps
only because the frozen source shadow was produced by the old publication
policy. V1.1 classifies them in scope; the next full shadow will evaluate them
under the repaired publication policy.

## Baseline Reconciliation

Compared with the permanent V1 baseline:

- denominator decreased by `1,656`
- numerator decreased by `42`
- gaps decreased by `1,614`
- exclusions increased by `1,656`
- coverage increased from `90.712%` to `95.177%`

The numerator reduction proves the repair did not merely remove gap rows. It
also removed already-covered V1.1 special rows that should never have counted
as ordinary Production V1 coverage.

## Current Publication Boundary

The integrated live boundary correctly fails. Of the `100` current canary rows,
`2` are outside V1.1 scope:

- Bagon, source product `83694`
- Electrike, source product `85131`

Both come from `EX Trainer Kit 1: Latias & Latios`, which the original coverage
contract already classified as a deck-exclusive special-variant group. The
earlier product-name-only check missed them because neither card name contains
a special-print marker.

The existing canary remains untouched so its scheduled operational evidence is
not rewritten. Its 72-hour result can prove scheduler, freshness,
reconciliation, access, and rollback behavior, but it is no longer sufficient
as the final V1.1 scope proof.

No database, mapping, publication pointer, customer access, scheduler, or
client state was changed.

## Current Truths

- Production V1 fixed-scope coverage now exceeds the `95%` threshold
- the integrated V1.1 rollout gate remains failed because two legacy canary
  rows are outside the repaired scope
- the original failed coverage baseline remains preserved
- remaining ordinary gaps stay visible and governed
- modern coverage remains weaker than vintage and middle eras
- high-value coverage remains below the aggregate threshold
- mapping repair is still valuable even though the aggregate gate now passes
- the 72-hour canary time gate remains active and incomplete
- broader signed-in rollout remains blocked

## Invariants

1. Missing ordinary canonical mappings remain in the denominator.
2. Scope exclusions require deterministic source evidence and a versioned
   reason.
3. Coverage and publication use the same product-scope classifier.
4. Special variants cannot count as ordinary V1 numerator rows.
5. Legitimate numbered card names cannot be excluded by packaging words alone.
6. Historical failed baselines remain immutable audit evidence.
7. Scope repair cannot alter the frozen canary scheduler or publication
   pointer.

## What Must Never Be Broken

- exact card, language, printing, and finish authority
- the ordinary V1 versus special-print V1.1 boundary
- deterministic and reproducible denominator membership
- source-to-publication provenance
- truthful preservation of both failed and passing coverage results
- signed-in versus anonymous access boundaries

## Evidence

Permanent V1.1 scope audit:

`docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_1/2026-07-28T10-25-50-424Z`

Permanent failed V1 baseline:

`docs/audits/pricing/mee_pricing_platform_production_v1/coverage_gate/2026-07-28T09-21-08-086Z`

Both directories preserve complete row-level evidence and SHA-256 artifact
hashes.

## Explicit Next Gate

Commit and push the fail-closed policy repair. Keep the current canary and
frozen scheduler unchanged through its observation window.

After the canary window, run a new full V1.1 shadow. It must:

- preserve at least `95%` fixed-scope coverage
- exclude both Trainer Kit rows from the eligible publication
- contain zero active-publication scope mismatches
- reconcile every selected, qualified, and snapshot row

In parallel, build a dry-run exact mapping repair planner for strong evidence
lanes.

Do not apply mappings or run a new full shadow until the planner proves:

- one unambiguous active canonical target per source product
- no source or target collisions
- special variants and product objects are excluded
- before/after fingerprints reconcile
- apply mode is explicit, append-only, and rollback-auditable

Do not deploy V1.1 to the frozen production scheduler before the 72-hour canary
window completes.
