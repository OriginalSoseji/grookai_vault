# Pricing Checkpoint 25: TCGPlayer Exact Mapping Apply V1

## Context

Checkpoint 24 established Product Scope V1.2 and a bounded, insert-only
mapping command. Its first artifacts were intentionally classified as
pre-commit readiness evidence. Production apply required replaying the same
coverage, mapping plan, and 25-row dry run from a clean committed SHA.

## Decision

Commit `2e1a3f5f8884df0aa46352372dabf4674f881df6` became the exact planner and
apply authority. The first batch was limited to 25 collision-free TCGPlayer
source products and was applied once through the canon-maintenance launcher.

## Clean Replay

The clean coverage replay reproduced the prior frozen result:

- selected source price rows: `45,082`
- denominator: `32,676`
- numerator: `31,123`
- gaps: `1,553`
- coverage: `95.247%`
- unclassified gaps: `0`

The clean exact-mapping plan reproduced:

- source products: `1,042`
- candidates: `276`
- blocked: `766`
- projected covered gap rows: `445`
- candidate SHA-256:
  `a179937025ab0c06a8df0b184a204027a70648bc328b47e0644c575644cc8584`
- tracked worktree clean: `true`
- producing commit:
  `2e1a3f5f8884df0aa46352372dabf4674f881df6`

The final dry run selected the same 25 rows with batch fingerprint
`431cfbba5acc81e4c13475369b8a4a90ee71bc81667383bf61d7447826a4cd64`.
It found zero canary or active-publication overlap and wrote nothing.

## Migration Applied

No schema migration was required.

Maintenance run `f215e3b1-65b5-4d08-bfb3-b3ef98a0da77`:

- selected: `25`
- inserted: `25`
- exact readback: `25`
- committed: `true`
- active-publication overlap: `0`
- publication writes: `0`
- customer-state writes: `0`

Each inserted `external_mappings` row retains the candidate fingerprint,
batch fingerprint, source run, candidate artifact hash, candidate-plan commit,
apply commit, mapping method, confidence, canonical GV-ID, and maintenance run.

## Post-Apply Proof

The immutable historical shadow coverage remains `95.247%`. This is expected:
its qualification decisions predate the mapping apply and are append-only.
The apply did not rewrite historical decisions or current publication.

A fresh read-only mapping plan over the same old gap evidence now reports:

- candidates: `251`
- blocked: `791`
- `source_product_already_mapped`: `25`
- projected gap rows remaining in candidates: `404`

The exact 25-row reduction proves the applied sources are now governed
mappings without introducing source or target collisions.

## Current Truths

- Product Scope V1.2 code is committed and pushed.
- Exactly 25 new TCGPlayer mappings are active.
- The current canary and app-facing publication are unchanged.
- The frozen historical shadow remains immutable evidence.
- The active canary still contains the two known Trainer Kit rows.
- The 72-hour canary observation window is not complete before
  `2026-07-31T08:40:15.793Z`.
- Broader signed-in rollout remains blocked.

## Invariants

1. Exact mapping repair remains insert-only and bounded.
2. Special printings remain outside ordinary Product V1.
3. Mapping authority never activates pricing by itself.
4. Historical qualification and publication ledgers remain append-only.
5. Any future mapping batch must regenerate and revalidate live evidence.
6. The scheduler remains frozen on its canary-producing commit until the
   canary observation gate completes.

## Evidence

- Clean coverage:
  `docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_2_clean_replay/2026-07-28T11-09-03-274Z`
- Clean mapping plan:
  `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1_1_clean_replay/2026-07-28T11-09-23-301Z`
- Clean dry run:
  `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_apply_v1_clean_replay/2026-07-28T11-09-42-315Z_dry_run_5ee5010c-3f2e-416b-80bb-b4beb4d1ca07`
- Apply and exact readback:
  `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_apply_v1/2026-07-28T11-10-00-900Z_apply_f215e3b1-65b5-4d08-bfb3-b3ef98a0da77`
- Post-apply coverage:
  `docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_2_post_mapping_apply/2026-07-28T11-11-15-894Z`
- Post-apply mapping plan:
  `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1_1_post_apply/2026-07-28T11-11-33-622Z`

## Explicit Next Gate

Preserve the current publication and scheduler while the frozen canary reaches
72 hours. At or after `2026-07-31T08:40:15.793Z`, require all scheduled slots,
health checks, provenance, access checks, and rollback checks to pass.

Only then deploy Product Scope and Publication Policy V1.2 to the scheduler,
run a corrected full read-only shadow from the exact deployed SHA, and measure
the 25 mappings in fresh qualification decisions before any broader signed-in
activation.
