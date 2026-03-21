# PRICING_CHECKPOINT_10_REFERENCE_LANE_STRATEGY

## Severity

L3

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- live eBay proof was still constrained by upstream throttle behavior
- Grookai still needed ways to preserve utility and coverage without violating market-truth doctrine
- JustTCG had already been audited as a potential external source
- projection work had already made it clear that external reference value and current market truth must not occupy the same lane

This checkpoint records the strategic boundary for the reference lane.

## What Problem This Checkpoint Solves

This checkpoint solves a strategic drift problem.

Once a secondary pricing source exists in the conversation, future work can easily start treating that source as “close enough” to truth.

That is exactly the kind of quiet drift that would damage Grookai’s pricing architecture.

The repo needed a checkpoint that locks what the reference lane is for and, more importantly, what it is not allowed to become.

## Why We Needed A Reference Lane At All

Grookai still needs coverage and utility while live eBay density remains constrained.

That does not mean Grookai should surrender market truth to a vendor.

It means external sources can still provide value if they are isolated correctly.

The need is:

- reference
- comparison
- bootstrap utility

The need is not:

- replacement of market truth
- replacement of explainable comps
- replacement of Grookai-controlled identity

That is why a reference lane exists at all.

## What The JustTCG Audit Actually Proved

The JustTCG audit proved:

- final recommendation = `WEAK FIT`
- Identity Fit = `PARTIAL`
- Pricing Fit = `PARTIAL`
- Explainability Fit = `FAIL`
- Dependency Risk = `FAIL`
- Product Fit = `PARTIAL`
- no live API probing was performed
- conclusions were doc-based, not runtime-proven

That is not a soft endorsement.

It is a constrained-use conclusion.

## The Reference Lane Rule We Locked

The reference lane rule now locked is:

JustTCG is allowed only as:

- internal comparison
- optional pricing reference
- optional bootstrap/reference input for non-authoritative analysis
- projection/reference support

JustTCG is NOT allowed to become:

- canonical identity authority
- primary user-facing market truth
- replacement for `pricing_observations`
- replacement for `accepted + mapped`
- silent fallback source when Grookai has no explainable comps

This is invariant-strength language because the architectural risk here is architectural, not cosmetic.

## Why This Decision Mattered

This decision mattered because JustTCG is useful enough to be tempting and weak enough to be dangerous.

Its utility can create the illusion that it should be promoted.

But the audit already proved the opposite:

- it is not observation-first
- it is not explainable enough
- it carries real dependency risk
- its IDs and vendor-controlled shape must not be allowed to define Grookai truth

This checkpoint prevents convenience from becoming authority.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- using JustTCG as raw market truth
  - rejected because it is not Grookai’s observation-backed market lane

- blending JustTCG into Grookai comp-backed price
  - rejected because that would contaminate explainable market truth with vendor aggregate data

- using JustTCG to hide empty/no-market states
  - rejected because honest empty states are part of Grookai’s trust posture

- making Grookai dependent on JustTCG for explainable pricing
  - rejected because JustTCG does not satisfy Grookai’s explainability standard

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- JustTCG remains reference-only unless a new audit and contract say otherwise
- reference sources must never be silently promoted into truth lanes
- `accepted + mapped` remains sacred regardless of what external vendor data is available
- empty market truth must stay honestly empty even if reference value exists
- Grookai must not let vendor convenience override control of its own truth layer

If future work weakens these boundaries without new evidence, it will directly violate the strategic decision this checkpoint exists to lock.
