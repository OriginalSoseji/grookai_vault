# PRICING_CHECKPOINT_07_JUSTTCG_SOURCE_DECISION

## Severity

L2

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- Grookai pricing had already moved to observation-first architecture
- `accepted + mapped` had already been locked as the promotion boundary
- comps and trust surfaces had already been built on persisted evidence
- queue policy had already been narrowed to demand-driven behavior under real Browse throttling

This checkpoint records the decision about whether JustTCG can play a meaningful role in Grookai without violating those architectural gains.

## What Problem This Checkpoint Solves

This checkpoint solves a source-governance problem:

- JustTCG looks useful on the surface because it offers condition-specific TCG pricing data, variant objects, and historical/statistical fields
- but usefulness is not the same as architectural fit

Grookai needed a durable answer to:

- is JustTCG usable
- usable for what
- and what must it never become inside the system

## Why We Audited JustTCG

We audited JustTCG because it occupies the exact category of source that can speed up product work while also creating hidden long-term risk.

It offers:

- multi-game pricing coverage
- Pokémon support
- condition and printing-aware variants
- current price and history/statistics

Those are attractive capabilities.

But Grookai’s pricing architecture is now explicitly trust-first and evidence-first.

That means every external source has to be judged not only on convenience, but on:

- identity compatibility
- explainability compatibility
- dependency risk
- whether it preserves Grookai control over truth

## What The Audit Proved

The audit proved:

- JustTCG is a pricing-oriented API, not a canonical identity system
- it provides useful identity-assist structure such as game, set, set name, number, rarity, and variant attributes
- it provides condition-specific and printing-specific pricing at the variant level
- it exposes historical/statistical fields and update timestamps
- it has had meaningful ID and shape changes in 2025
- its public docs do not prove listing-level comp explainability compatible with Grookai’s observation-first pricing
- its public plan limits and vendor-controlled change cadence create meaningful dependency risk

The audit did not prove:

- live API behavior under authentication
- Pokémon edge-case mapping safety at runtime
- comp-grade explainability

No JustTCG key was present in repo/env, so runtime API probing remained UNVERIFIED in this audit.

## The Decision We Made

The decision is:

- JustTCG is a `WEAK FIT`
- it is allowed only as a constrained secondary source
- it is not allowed to become primary truth infrastructure

This is not a soft “maybe primary later” decision by default.

The current decision is intentionally strict.

## Why This Decision Mattered

This decision mattered because Grookai has already done difficult work to move away from black-box pricing and toward defended, persisted evidence.

If JustTCG were allowed to slide into a stronger role without a new audit and contract, Grookai could undo that progress by accident:

- vendor IDs could start substituting for canonical identity
- vendor aggregates could start substituting for explainable comps
- trust surfaces could become dependent on values Grookai cannot defend from its own evidence layer

This checkpoint exists to stop that drift before it starts.

## What Role JustTCG Is Allowed To Play

JustTCG is allowed to play only these roles:

- internal comparison source
- pricing reference only
- optional bootstrap/reference input for non-authoritative analysis
- optional operator/developer sanity-check lane

All of those roles are secondary and non-authoritative.

## What Role JustTCG Is Not Allowed To Play

JustTCG is not allowed to play these roles:

- canonical identity authority
- canonical print-definition authority
- primary user-facing Grookai price source
- replacement for `pricing_observations`
- replacement for `accepted + mapped`
- silent fallback source when Grookai has no explainable comps
- default truth layer for trust surfaces

If future work wants any of those roles, it must begin with a new audit and a new contract, not implementation.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- treating JustTCG as “close enough” to canonical identity
- using vendor aggregate prices as if they were observation-backed comps
- adopting it as a primary price lane because it is faster to integrate
- letting convenience outweigh explainability and truth control

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- JustTCG is not canonical identity authority
- JustTCG is not primary pricing truth
- observation-first pricing remains the core Grookai direction
- `accepted + mapped` remains sacred
- any future JustTCG use must stay explicitly secondary unless a new audit proves otherwise
- vendor convenience must not override Grookai’s control-your-own-truth-layer philosophy
