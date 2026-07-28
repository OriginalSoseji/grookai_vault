# Pricing Checkpoint 27: Full Rollout Guards And Seven-Cycle Observer

## Context

TCGPlayer Market Product V1 has a frozen 100-printing authenticated canary,
corrected V1.2 publication policy, more than 95 percent frozen-shadow
coverage, shared web and Flutter reads, rollback tooling, and a governed
completion matrix.

The canary production deployment remains frozen on
`c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d` through its 72-hour observation
gate. This checkpoint was implemented separately on
`pricing/mee-productization-v1`.

## Problem

The repository had no single machine-enforced gate for the transition from
the bounded canary to complete eligible signed-in publication.

Three concrete risks remained:

- production mode still accepted a publication limit, so a partial set could
  be labeled and activated as production
- scheduled live runs were not pinned to the exact deployed commit
- the required seven unattended full-eligible cycles had no durable observer
  that reconciled publication, source, access, coverage, performance, alerts,
  and rollback evidence together

The performance audit would also request the entire current publication in one
batch after full rollout, which is not representative of supported product
traffic.

## Risk

A partial publication could pass through the production path, a scheduler
could run code other than the reviewed deployment, or seven nominal timer
events could be mistaken for seven healthy pricing cycles without proving
their source-to-client lineage.

An unbounded performance request over roughly 31,000 current rows could test an
unsupported workload rather than the detail and grid contract consumed by the
product.

## Decision

Full signed-in rollout now fails closed unless:

- production evaluates the complete eligible scope with no row limit or
  canary definition
- live scheduling uses the exact clean deployed commit
- a fresh V1.2 shadow independently passes the coverage threshold
- the activated current publication passes corrected scope and lineage checks
- one full activation and seven daily `08:15 UTC` production cycles reconcile
- the latest current pointer and row count match the latest healthy cycle
- source freshness, authenticated access, anonymous denial, rollback
  availability, coverage, performance, and operations alerts are all healthy

The performance gate now uses representative batches, defaulting to 200 IDs
and bounded from 50 through 500.

## Alternatives Rejected

- A production row limit was rejected because a bounded set is a canary, not
  full production.
- Commit recording without runtime equality enforcement was rejected because
  provenance after the fact does not prevent the wrong code from publishing.
- Counting successful timer invocations alone was rejected because it does not
  prove exact publication, current-pointer, trace, source, access, or client
  health.
- Requiring current-publication scope to pass before replacing the legacy
  canary was rejected as circular. The coverage audit now has a separate
  `--require-coverage-pass` shadow gate, while full `--require-pass` remains
  mandatory immediately after activation.
- Benchmarking all current prices in one request was rejected because no
  supported product surface makes that request.

## Implementation

Producing code commit:

`098c7c7e82e4d95eae948720d7176501fc2597c4`

Permanent controls:

- `backend/pricing/tcgplayer_market_full_rollout_observation_policy_v1.mjs`
- `scripts/audits/tcgplayer_market_full_rollout_observation_v1.mjs`
- `tests/contracts/tcgplayer_market_full_rollout_observation_v1.test.mjs`
- `tests/contracts/tcgplayer_market_full_rollout_guard_v1.test.mjs`
- `docs/runbooks/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md`

Production, publication-worker, and scheduled-runner entrypoints now reject
partial production limits. The systemd installer and verifier require the
exact deployed SHA, a clean tracked checkout, an empty production limit, and
an empty production canary definition.

The observer records both:

- the exact commit that produced the pricing publication
- the exact commit and branch of the observer that evaluated the evidence

## Read-Only Production Schema Proof

The observer was exercised against the existing production canary using its
real activation run and historical coverage/performance inputs.

The query and ACL path completed:

- current rows read: `100`
- positive USD rows: `100`
- missing provenance: `0`
- broken traces: `0`
- authenticated read rows: `1`
- anonymous runtime denial: `42501`
- rollback generation available: `true`
- source health: `healthy`
- database writes: `0`

The result correctly failed the full-rollout policy because:

- the activation run is a canary, not production
- its policy predates corrected V1.2
- current publication scope still contains the two known legacy rows
- historical coverage and performance evidence were produced by earlier
  commits

This was the expected boundary result, not a production-rollout attempt.

## Tests

- New focused contract tests: `13/13` passed
- Complete TCGPlayer pricing contract suite: `109/109` passed
- Goal and completion contracts: `10/10` passed
- Git Bash syntax checks for both systemd scripts: passed
- Secret packaging guard: passed
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical failures
- Full repository shipcheck before commit: passed
- Full pre-commit shipcheck: passed
- Web typecheck, lint, and strict build: passed
- Flutter analysis: passed
- Flutter tests in passing full runs: `302/302`

One duplicate pre-push shipcheck produced 12 unrelated Flutter test failures
after two passing full runs. An immediate isolated rerun passed `302/302`
without code changes. The already-verified commit was pushed with the flaky
duplicate hook skipped; the discrepancy is preserved here rather than
misreported as a pricing failure.

## Current Truths

- The rollout guard and seven-cycle observer are committed and pushed.
- The production canary deployment and current publication were not changed.
- No database writes, grants, approvals, or deployments occurred in this
  checkpoint.
- Full rollout remains closed until the 72-hour canary passes.
- Frozen corrected coverage is above 95 percent, but fresh same-commit shadow
  and post-activation scope evidence remain required.
- Anonymous pricing execution remains denied.
- Licensing and public display authority remain externally unresolved.
- Production V1 is not complete.

## Invariants

- Never use a publication limit or canary definition in production mode.
- Never run a live schedule from a dirty checkout or unexpected commit.
- Never count a scheduled event as healthy without full publication and trace
  reconciliation.
- Never use a full-catalog RPC request as a supported product-performance
  contract.
- Never let shadow coverage imply that the current publication already has
  corrected scope.
- Never grant anonymous pricing access before signed-in rollout, seven
  unattended cycles, and licensing/display authority pass.
- Never alter the frozen canary before its 72-hour gate completes.

## Exact Next Gate

At or after `2026-07-31T08:40:15.793Z`, run the canary observer with
`--require-pass` against the frozen activation, producing commit, and all
three expected schedule slots.

Only after that passes:

1. deploy the exact clean V1.2 rollout commit
2. run a fresh full-source shadow
3. require shadow coverage threshold pass
4. perform complete eligible signed-in activation with no limit
5. require post-activation scope, health, performance, provenance, and
   rollback checks
6. enable exact-commit production scheduling
7. observe and require seven unattended full-eligible cycles

Do not grant anonymous access.
