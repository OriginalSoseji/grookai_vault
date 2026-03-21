# PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL

## Severity

L3

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- market truth had already been locked to eBay observation-backed pricing
- a constrained reference strategy had already been established for JustTCG
- a projection lane had already been introduced to answer PSA 10 upside questions without corrupting market truth

This checkpoint records the formal three-lane pricing model that now shapes the product.

## What Problem This Checkpoint Solves

This checkpoint solves a semantic-collapse problem.

Grookai now needs to represent more than one class of value:

- current market truth
- external reference context
- future or modeled projection

If those values are collapsed into one displayed number or one implicit lane, user trust breaks immediately.

The repo needed a checkpoint that makes the lane separation impossible to misread.

## Why One Pricing Number Was No Longer Enough

One pricing number was no longer enough because Grookai is now answering materially different questions:

- what is the current raw market value
- what does an external non-authoritative source say for reference
- what could this card be worth in a modeled PSA 10 scenario

Those are not interchangeable values.

Collapsing them into one number would destroy the core trust posture Grookai has already built:

- explainable market truth
- honest empty states
- explicit non-authoritative reference use
- clearly labeled modeled output

## The Three Lanes We Locked

### Lane 1 — Market Truth

- eBay only
- accepted + mapped only
- observation-backed
- explainable comps only
- current raw market value only

### Lane 2 — Reference

- external non-authoritative reference only
- optional
- clearly labeled
- never blended into market truth

### Lane 3 — Projection

- modeled estimate only
- may use reference inputs
- must be visibly labeled as projected / modeled
- must never feed back into market truth

## The Invariants We Locked

The invariants now locked are:

- eBay = only market-truth lane
- JustTCG/reference never influences Grookai raw market price
- projection never influences Grookai raw market price
- projection is not current price
- trust/comps lane remains tied to market truth only
- empty market must remain honestly empty even if reference/projection exists

These are not presentation preferences.

They are product-truth invariants.

## Why This Decision Mattered

This decision mattered because it protects Grookai from a very common pricing-system failure:

- showing different kinds of value as if they were one thing

The three-lane model keeps each value class honest:

- market truth remains defendable
- reference remains clearly secondary
- projection remains useful without pretending to be present-market fact

Without this checkpoint, future work could easily reintroduce ambiguity at the exact point the system is becoming more capable.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- blending lanes into one displayed price
  - rejected because it would destroy truth semantics

- showing projected PSA 10 as current value
  - rejected because modeled future value is not present-market truth

- using reference value as silent fallback for market truth
  - rejected because empty market truth must remain visible

- feeding projection/reference back into trust/confidence for raw pricing
  - rejected because trust/confidence must stay anchored to observation-backed market truth only

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- three-lane separation is structural, not optional wording
- market truth remains observation-backed and explainable
- reference remains non-authoritative
- projection remains modeled and visibly labeled
- trust summary and comps remain attached only to the market-truth lane
- no later UI convenience may collapse the lanes back into one ambiguous price surface

If future work blends these lanes without a new audit and contract, it will undo the core semantic clarity this checkpoint is designed to preserve.
