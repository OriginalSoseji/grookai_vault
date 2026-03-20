# PRICING_CHECKPOINT_01_READINESS_AND_RISK

## Date / Phase Context

Date context: `2026-03-19`

Phase context:

- public raw pricing reads had already been unified on the `raw_*` contract
- the production pricing runner, budget guard, and founder pricing ops dashboard were in place
- broader eBay-driven pricing expansion was still under consideration
- the repository had already accumulated enough pricing code and documentation drift that scaling without a full readiness audit would have been guesswork

This checkpoint captures the moment pricing work changed from implementation momentum to architectural caution.

## What Triggered This Checkpoint

The trigger was not a single syntax bug. It was the accumulation of repo-proven signals that the pricing system could produce numbers, but could not yet defend those numbers strongly enough to justify broader eBay connection.

The immediate triggers were:

- split product pricing semantics between public raw reads and vault effective-price reads
- queue semantics that stored priority metadata but still claimed jobs FIFO by `requested_at`
- active-listing pricing logic that still depended on heuristics rather than a persisted evidence layer
- incomplete mapping boundaries around eBay-derived data
- stale or partially superseded pricing docs that no longer matched current runtime reality

Those conditions made continued scale-up unsafe because they created the possibility of shipping more pricing volume before proving the integrity of the pipeline.

## Repo-Proven Findings

The readiness and contamination audits established several facts that materially changed direction:

- `docs/audits/PRICING_READINESS_AUDIT_V1.md` correctly classified overall readiness as `NOT READY`
- truth surface status was only `PARTIAL` because public raw reads were unified, but vault still used a different effective-price semantic
- queue / runner status was only `PARTIAL` because the authoritative runner in `backend/pricing/pricing_job_runner_v1.mjs` stored priority but still claimed FIFO
- source boundary / mapping status was `FAIL` because eBay-derived observations could still exist outside a strict mapping-first canonical boundary
- user trust status was `FAIL` because the product could still show a number without surfacing enough freshness, source, or evidence context
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md` classified the system as `AT RISK`, not `CONTAMINATED`
- `AT RISK` was driven by missing listing-level persistence and missing explicit eBay listing mappings, not by a proven cross-card pollution event

That distinction mattered: the repo did not prove that current prices were already corrupted, but it also could not prove that they were clean.

## Why The Original Direction Was Unsafe

The original instinctive direction was to keep broadening eBay usage, because the system already had:

- a working runner
- a working scheduler
- active-price tables
- a public raw-price surface
- a founder ops dashboard

That direction was unsafe because it confused surface functionality with trustworthiness.

The unsafe assumptions were:

- if the worker writes prices successfully, the architecture must be ready for more listings
- if the queue drains, the source boundary must be good enough
- if a price looks plausible, explainability can wait

Repo evidence disproved those assumptions. The system could produce aggregate pricing outputs, but it lacked the evidence layer required to defend those outputs against contamination, ambiguity, or manipulation claims.

## Key Decision: Do Not Scale eBay Yet

The first major decision locked in this checkpoint was simple:

- do not connect broader eBay-driven pricing until the system can prove what listings were used, why they were accepted, and why they belong to the targeted canonical print

This decision was driven directly by `PRICING_READINESS_AUDIT_V1` and `PRICING_CONTAMINATION_AUDIT_V1`.

The repo had enough infrastructure to continue building, but not enough proof to justify scale. That meant the correct move was to stop broadening eBay ingestion and instead harden the trust boundary first.

## Key Decision: Build Trust Before Coverage

The second major decision was that pricing trust had to become a first-class system goal, not a later polish pass.

That meant:

- explainability had to move into the architecture itself
- mapping-first boundaries had to become explicit
- persisted listing-level evidence had to exist before aggregation could be trusted
- public pricing needed a visible path from displayed number back to persisted market evidence

This is why the workstream moved from “connect more market data” to “build a defensible observation layer and comps surface.”

## Why This Decision Mattered

This checkpoint mattered because it prevented Grookai from scaling a pricing lane that could not yet prove its own correctness.

Without this stop-and-audit moment, the likely outcome would have been broader eBay usage layered on top of incomplete traceability. That would have increased coverage while making future contamination audits harder, not easier.

This checkpoint changed pricing from an output problem into a systems-trust problem.

## What We Deliberately Rejected

The repo evidence justified explicit rejection of these paths:

- broad eBay scaling before proof
  - rejected because the system lacked listing-level persistence and could not prove what a price was built from

- relying on opaque aggregate prices
  - rejected because aggregate tables alone could not answer “which listings were used?” or “why was this listing filtered out?”

- assuming current prices were clean without evidence
  - rejected because `AT RISK` is not the same as `CLEAN`

- treating trust as a later UI problem
  - rejected because missing explainability was already an architectural blocker, not a styling gap

## What Became True After This Checkpoint

After this checkpoint, the pricing workstream had a different standard of progress:

- broader eBay connection was explicitly paused
- mapping-first ingestion became the primary blocker to solve
- explainability became part of pricing correctness
- trust and evidence became first-class architectural requirements
- fail-closed behavior became preferable to silent low-confidence coverage

This checkpoint also established that future pricing work had to be judged not just by whether it produced a number, but by whether that number could be defended from persisted evidence.

## What Future Maintainers Must Preserve

Future maintainers must preserve these conclusions:

- `NOT READY` was not pessimism; it was the correct verdict for the repo state at the time
- `AT RISK` must never be flattened into “probably fine”
- scaling source coverage before proving traceability is the wrong order
- pricing trust is a system property, not a cosmetic layer
- if repo evidence cannot prove cleanliness, the correct classification is uncertainty, not optimism
- broader eBay connection must remain blocked until the system can defend prices from persisted, queryable evidence

