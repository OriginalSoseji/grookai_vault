# Pricing Checkpoint 26: Operational Controls And Completion Matrix

## Context

TCGPlayer Market Product V1 has a production schema, deterministic
qualification and publication model, shared client read contract, three full
shadow cycles, a verified 100-printing canary, guarded daily scheduling, and
the first 25 exact mapping repairs.

The authenticated canary remains intentionally frozen on producing commit
`c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d` until its 72-hour observation
window ends. Repository development continued separately on
`pricing/mee-productization-v1`.

## Problem

The implementation had strong bounded-gate evidence, but ordinary production
operations were not yet complete enough to call the platform finished:

- rollback depended on a database function without a guarded operator worker
- exact GV-ID provenance inspection required manual database reasoning
- incident recovery guidance did not cover all ordinary failure classes
- completion truth was spread across checkpoints and audit directories
- no machine-enforced rule prevented an early completion claim

## Risk

Without these controls, a healthy pricing endpoint could be mistaken for a
finished product while rollback, traceability, unattended operation, coverage,
or public display authority remained unproven.

An operator could also restore the wrong publication generation, inspect only
the current price without closing its source lineage, or broaden rollout before
the authenticated and licensing gates passed.

## Decision

Production V1 completion is now governed by
`TCGPLAYER_MARKET_COMPLETION_POLICY_V1`.

The policy requires exactly 30 represented requirements. A completion claim is
allowed only when every row is `passed`. `pending`, `blocked_external`,
missing evidence, duplicate requirements, unknown requirements, or invalid
status values fail closed.

Operational tooling now includes:

- a dry-run-default, exact-generation publication rollback worker
- a read-only GV-ID or provenance-ID trace diagnostic
- a repository completion evaluator with hashed artifacts
- incident instructions for acquisition, artifacts, mappings, duplicates, API
  disagreement, operations notifications, rollback, and historical work

## Alternatives Rejected

- Treating the 100-row canary as product completion was rejected because its
  72-hour window and full-eligible rollout are still open.
- Treating aggregate coverage above 95 percent as launch proof was rejected
  because corrected V1.2 coverage still needs a fresh full shadow.
- Exposing the service-only provenance RPC directly to clients was rejected
  because product clients need stable price/status fields, not warehouse
  lineage internals.
- Providing an unguarded rollback command was rejected because stale set IDs,
  dirty code, or an unverified restore generation could corrupt incident
  response.
- Marking unresolved licensing as an ordinary engineering pass was rejected.

## Implementation

Producing code commit:

`7c6150decb228a8256386f50820cf374e8b38b18`

New permanent controls:

- `backend/pricing/tcgplayer_market_completion_policy_v1.mjs`
- `backend/pricing/tcgplayer_market_provenance_policy_v1.mjs`
- `scripts/audits/tcgplayer_market_completion_v1.mjs`
- `scripts/audits/tcgplayer_market_provenance_lookup_v1.mjs`
- `scripts/workers/tcgplayer_market_rollback_v1.mjs`
- `docs/runbooks/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md`

## Production Readback

Clean-SHA canary observation at `2026-07-28T11:36:54.601Z`:

- status: `observing`
- observed: `2.944` of `72` required hours
- current exact prices: `100`
- positive USD prices: `100`
- missing provenance: `0`
- stale prices: `0`
- broken traces: `0`
- source status: `healthy`
- authenticated execution: granted
- anonymous execution: denied
- terminal alerts: `0`
- findings: `0`

The first scheduled slot occurs after this checkpoint. The required canary end
remains `2026-07-31T08:40:15.793Z`.

## Provenance Proof

Read-only lookup for `GV-PK-HP-101-HOLO` passed:

- card: Mightyena
- market close: `$69.88 USD`
- source label: `TCGPlayer Market`
- provenance:
  `3cead092-0e5a-473d-893d-10bbfbe7a5ff`
- relationship: `current`
- complete artifact, source row, mapping, assignment, decision, snapshot, and
  publication lineage
- database writes: `0`

Historical provenance validation is deliberately independent of the current
read-model pointer. A valid historical trace is reported as historical rather
than failed merely because a later publication is current.

## Rollback Readiness

The guarded rollback dry run passed without applying rollback:

- current publication set:
  `ad858441-036d-4ec5-ad06-42d9936c7534`
- prior restore set:
  `94731fe5-5522-40f5-89b4-d07b8b08c149`
- current snapshots: `100`
- prior snapshots: `100`
- committed: `false`
- database writes: `false`
- publication events written: `0`

Apply mode additionally requires the exact current and restore UUIDs, a factual
reason, the exact clean 40-character commit, and
`TCGPLAYER_MARKET_PUBLICATION_ROLLBACK_V1` confirmation. Postconditions are
read back before commit inside one serializable transaction.

## Completion Matrix

The first governed evaluation reports:

- required: `30`
- represented: `30`
- passed: `23`
- pending: `6`
- blocked externally: `1`
- findings: `0`
- completion allowed: `false`

Pending requirements:

- authenticated 72-hour canary
- seven unattended full-eligible cycles
- corrected fresh proof of at least 95 percent exact mapping coverage
- deterministic launch-state classification of every remaining gap
- final pricing checkpoint closeout
- public rollout gates before anonymous access

External blocker:

- source licensing, attribution, and public display authority

## Tests

- TCGPlayer pricing contract suite: `96/96` passed
- completion-policy tests: `5/5` passed
- provenance-policy tests: `3/3` passed
- secret packaging guard: passed
- full pre-commit shipcheck: passed
- web typecheck, lint, and strict build: passed
- Flutter analysis: passed
- Flutter tests: `302/302` passed

## Current Truths

- The 100-printing authenticated canary is healthy but incomplete.
- Anonymous pricing RPC access remains denied.
- The current canary intentionally retains two known legacy Trainer Kit scope
  rows; it is an operations proof, not corrected V1.2 full-launch proof.
- Twenty-five exact mappings were applied and read back through the
  canon-maintenance boundary.
- Corrected V1.2 frozen replay coverage was `95.247%`, but launch coverage
  awaits a fresh full shadow.
- Rollback readiness is proven; rollback was not applied.
- Exact current provenance is inspectable from a printing GV-ID without writes.
- Production V1 is not complete.

## Invariants

- Do not modify or redeploy the frozen canary before its 72-hour gate ends.
- Do not treat canary rows as corrected full-eligible scope.
- Do not publish ambiguous identity, language, finish, freshness, or duplicate
  evidence.
- Do not let active asks or supporting metrics change market close.
- Do not expose raw pricing tables, internal views, or service-only provenance
  to product clients.
- Do not grant anonymous access before signed-in rollout, seven cycles, and
  licensing/display authority pass.
- Do not execute rollback without the exact generation IDs and clean producing
  commit.
- Do not mark the goal complete while the completion matrix is not complete.

## Audit Artifacts

- `docs/audits/pricing/mee_pricing_platform_production_v1/canary_observation_progress/2026-07-28T11-38-04-675Z/`
- `docs/audits/pricing/mee_pricing_platform_production_v1/provenance_lookup_v1_readiness/2026-07-28T11-36-54-825Z/`
- `docs/audits/pricing/mee_pricing_platform_production_v1/publication_rollback_v1_readiness/2026-07-28T11-36-54-826Z_dry_run_4a3d93d2-9f02-4c06-9f04-d65776ad65a2/`
- `docs/audits/pricing/mee_pricing_platform_production_v1/production_completion_matrix_v1/runs/2026-07-28T11-36-54-775Z/`

## Exact Next Gate

Leave the production scheduler and current canary unchanged.

After each expected daily `08:15 UTC` slot, run the read-only canary observer
with the frozen activation run, start time, and expected canary commit. At or
after `2026-07-31T08:40:15.793Z`, require all three scheduled slots, source
continuity, freshness, trace, access, alert, and rollback checks to pass.

Only then deploy the already-tested V1.2 scope, run a fresh full-eligible shadow
that includes the 25 new exact mappings, reconcile corrected coverage and every
remaining gap, and prepare the bounded full signed-in activation. Do not grant
anonymous access.
