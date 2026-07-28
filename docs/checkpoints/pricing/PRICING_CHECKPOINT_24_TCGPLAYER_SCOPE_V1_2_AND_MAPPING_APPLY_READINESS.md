# Pricing Checkpoint 24: Scope V1.2 And Mapping Apply Readiness

## Context

The first exact-mapping plan passed structurally with `274` candidates. Review
of the candidate payload before building an apply command found an explicit
special printing:

`Champions Festival - XY27 (2014 Staff)`

Production V1 excludes Staff printings. Product Scope V1.1 recognized plain
`(Staff)` and `[Staff]`, but not a year-qualified marker inside the same suffix.
No mapping had been applied.

## Problem

A passing aggregate coverage result and collision-free mapping plan were not
enough. The active scope classifier could still admit a source row that
contained the same prohibited evidence in an unrecognized textual form.

The mapping writer also needed to fit the existing canon-maintenance boundary
and prove live state again rather than trusting a stale JSONL plan.

## Risk

- mapping an explicit Staff printing to an ordinary canonical promo
- silently changing the meaning of historical Scope V1.1 evidence
- trusting a candidate artifact after source, identity, or mapping state changes
- applying a mapping that overlaps the frozen 100-printing canary
- running an unbounded or directly executable canonical writer
- producing mappings without durable method and artifact provenance

## Decision

Product scope advances to `TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2`.
Publication and coverage advance to their corresponding V1.2 policies.

V1.2 adds a narrow evidence rule for decorated event/distribution suffixes,
including `(2014 Staff)`. It does not broadly exclude Worlds or e-League promo
identities without Staff, Winner, Prerelease, Stamped, or equivalent explicit
print evidence.

The mapping plan advances to
`TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1`.

`TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1` governs a new maintenance-only
writer:

- registered in `run_canon_maintenance_v1.mjs`
- dry-run by default
- maximum batch size `25`
- exact candidate artifact hash required
- exact clean candidate-plan commit required and separately pinned
- exact clean producing commit required for apply
- explicit confirmation token required for apply
- serializable transaction plus advisory lock
- live source, observation, target, identity, mapping, scope, and publication
  overlap revalidation
- insert-only `external_mappings` authority
- no publication or customer-state writes
- exact post-commit readback and rollback manifest

## Alternatives Rejected

- silently broadening the V1.1 regex
- removing only the observed Staff candidate from the JSONL file
- excluding all Worlds and e-League identities
- applying all candidates directly from the read-only plan
- adding a free-standing writer outside the maintenance launcher
- allowing a dirty worktree or uncommitted code to produce an apply
- mapping more than `25` rows in the first gate

## Validation

The complete TCGPlayer pricing contract set passes `85/85`.

The corrected read-only coverage audit replayed the same `45,082` source rows:

- denominator: `32,676`
- numerator: `31,123`
- gaps: `1,553`
- exclusions: `12,406`
- coverage: `95.247%`
- coverage threshold: passed
- unclassified gaps: `0`

Compared with V1.1, `24` former gap rows moved to deterministic special-variant
exclusions. The numerator did not change.

The integrated gate remains failed only because the frozen active canary still
contains the same two Trainer Kit rows identified in Checkpoint 22.

The pre-commit corrected mapping plan:

- reviewed source products: `1,042`
- exact candidates: `276`
- blocked: `766`
- projected covered gap rows: `445`
- special-marker candidates: `0`
- active-canary candidate overlap: `0`
- findings: `0`

The first complete pre-commit writer dry run passed:

- selected: `25`
- active-publication overlap: `0`
- inserted: `0`
- database writes: `0`
- batch fingerprint:
  `431cfbba5acc81e4c13475369b8a4a90ee71bc81667383bf61d7447826a4cd64`

One preceding dry run failed on a PostgreSQL `DISTINCT` ordering expression.
It committed nothing. That failure is preserved beside the passing readiness
artifact.

These artifacts prove the proposed classifications and writer behavior, but
they were produced while the V1.2 implementation was not yet committed.
Accordingly, they are permanent readiness evidence and cannot authorize a
production apply. The apply command rejects any plan that does not explicitly
record a clean tracked worktree and a separately pinned ancestor commit.

## Current Truths

- active production coverage remains unchanged until a new shadow publishes
- the same frozen source shadow passes V1.2 aggregate coverage at `95.247%`
- the active canary remains unchanged
- no exact-mapping candidate has been applied
- the bounded writer is ready for a clean-commit replay
- a real apply is forbidden until this code is committed and the exact clean
  planner and apply commit SHAs are supplied
- broader signed-in rollout remains blocked

## Invariants

1. Explicit Staff, Winner, Prerelease, Stamped, and equivalent print evidence
   remains outside ordinary Product V1.
2. Identity-bearing event context is not itself sufficient to exclude a promo.
3. Historical V1.1 artifacts remain immutable evidence.
4. Mapping apply revalidates live state; it never trusts the plan alone.
5. The first apply is bounded to `25` one-to-one mappings.
6. The frozen canary and current publication cannot overlap the selected batch.
7. Mapping repair cannot write pricing, publication, scheduler, or customer
   state.

## What Must Never Be Broken

- exact card, language, printing, and finish authority
- special-print quarantine
- one-to-one source/target mapping ownership
- dry-run-default canon maintenance
- artifact and commit provenance
- active publication isolation
- preservation of failed and passing audit evidence

## Evidence

Scope V1.2:

`docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_2/2026-07-28T10-49-27-107Z`

Exact Mapping Plan V1.1:

`docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1_1/2026-07-28T10-50-02-909Z`

Passing apply readiness:

`docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_apply_v1_readiness/2026-07-28T10-58-37-790Z_dry_run_8131edf8-8afc-41bc-88ac-b6e9f706a73e`

Preserved failed readiness:

`docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_apply_v1_readiness/2026-07-28T10-56-32-360Z_dry_run_821a0a94-fc03-41d1-a842-651f1d0f15c8`

## Explicit Next Gate

Commit and push the V1.2 scope repair, bounded writer, tests, and pre-commit
readiness evidence.

From that exact clean commit:

1. replay Coverage V1.2 from the same frozen source shadow;
2. regenerate the exact-mapping plan and require the same classifications;
3. rerun the same `25`-mapping dry run;
4. require the same batch fingerprint;
5. apply once through the canon-maintenance launcher;
6. read back all `25` inserted rows and provenance fields;
7. prove no source/target collision and no active-publication change;
8. rerun coverage read-only and report the actual result.

Stop and use the rollback manifest if any post-commit readback fails. Do not
deploy Publication Policy V1.2 or start a corrected full shadow before the
current 72-hour canary observation window completes.
