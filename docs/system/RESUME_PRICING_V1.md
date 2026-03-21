# RESUME_PRICING_V1

## Purpose

This file exists to restart pricing work in a new chat without relying on conversational memory.

It is an operational resume artifact, not a changelog. It captures the current checkpointed state of Grookai pricing, the invariants that now govern the system, what is complete, what is still blocked, and what the next logical step is.

## Governing Sources

High-authority sources a future session must anchor to:

- `AXIOM_EXECUTION_INTERFACE_V4_FULL.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_01_READINESS_AND_RISK.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_02_OBSERVATION_LAYER_DECISION.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_03_CLASSIFIER_HARDENING_AND_OFFLINE_CERTIFICATION.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_04_COMPS_TRUST_SURFACE.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_05_TRUST_SYSTEM_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_06_QUEUE_MODEL_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_07_JUSTTCG_SOURCE_DECISION.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_08_PROJECTION_SYSTEM_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_09_LIVE_SOURCE_CONSTRAINTS.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_10_REFERENCE_LANE_STRATEGY.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL.md`
- `docs/audits/PRICING_READINESS_AUDIT_V1.md`
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md`
- `docs/audits/PRICING_OBSERVATION_OFFLINE_VALIDATION_V1.md`
- `docs/audits/PRICING_OBSERVATION_LIVE_VALIDATION_V1.md`
- `docs/audits/JUSTTCG_SOURCE_AUDIT_V1.md`

## Current Pricing State

Current pricing state in plain language:

- the raw market-truth lane exists and is eBay-only
- the observation layer exists and is the basis for persisted pricing evidence
- classifier hardening passed offline certification
- the card-detail comps surface exists
- the card-detail trust system exists
- the projection lane exists structurally
- JustTCG is reference-only and non-authoritative
- live eBay validation is still blocked by upstream throttle
- the queue model is demand-driven and no longer broad-backfill by default

## What Is Complete

Completed and locked work:

- pricing observation layer
- accepted-lane and audit views
- classifier hardening
- offline certification harness and audit
- comps trust surface on card detail
- trust system on card detail
- queue model with vault-first demand policy and cooldown semantics
- JustTCG source audit
- reference-lane strategy checkpoint
- projection system lane contract
- live source constraints checkpoint
- three-lane pricing model checkpoint

## What Is Still Blocked Or Unproven

What remains blocked or unproven:

- repeated first-call eBay Browse `429` continues to block a successful live proof run
- live comp density is still unproven under normal source conditions
- live accepted comp persistence is still unproven in a non-throttled window
- JustTCG runtime integration may still be pending
- full slab-truth pricing remains future work

## Pricing Lanes (Authoritative Summary)

### Market Truth

- eBay only
- accepted + mapped only
- observation-backed
- explainable comps only
- current raw market value only

### Reference

- external non-authoritative reference only
- optional
- clearly labeled
- never blended into market truth

### Projection

- modeled estimate only
- may use reference inputs
- clearly labeled as projected / modeled
- never feeds back into market truth

## Invariants That Must Never Break

The following invariants are locked:

- eBay = only market-truth lane
- accepted + mapped only for pricing
- JustTCG/reference never influences raw market price
- projection never influences raw market price
- empty market stays honestly empty
- fail-closed under throttle
- no silent fallback pricing
- checkpoints must be respected before new changes

## Current Operational Reality

Current operational reality:

- source availability is the main blocker, not pricing architecture
- fail-closed behavior under throttle is correct and must remain so
- demand-driven pricing is the correct operating model for this phase
- broad backfill is not the current strategy

## Next Logical Step

Primary next step:

- `REFERENCE_PRICING_LAYER_V1`

That next step should:

- wire `getReferencePricing.ts` safely
- keep the reference lane isolated from market truth
- support the projection system
- optionally support clearly labeled reference display only where allowed

That next step must not:

- re-litigate truth / reference / projection separation
- reopen broad backfill as the next move

## Resume Prompt Block

Use this block to restart pricing work in a new chat:

```md
Pricing is operating under AXIOM Execution Interface V4. Anchor to `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`, pricing checkpoints 01 through 11, and the key pricing audits. Current state: eBay is the only market-truth lane; pricing is observation-backed and `accepted + mapped` only; offline classifier hardening passed; comps and trust surfaces exist; projection exists as a separate modeled lane; JustTCG is reference-only; queue policy is demand-driven and vault-first; live eBay proof is still blocked by repeated first-call Browse 429s and must be treated as source constraint, not pricing-logic failure. Invariants: no silent fallback pricing, no reference/projection contamination of raw market truth, empty market stays honestly empty, fail closed under throttle, respect existing checkpoints before changes. Next objective: `REFERENCE_PRICING_LAYER_V1`. Do not drift, do not re-litigate lane separation, and do not reopen broad backfill as the next move.
```

## Why This File Matters

This file matters because pricing has accumulated enough architectural decisions and invariants that restarting from conversational memory is now unsafe.

Repo-backed resume state is part of operating discipline. It prevents reset-to-zero reasoning, protects checkpointed decisions from drift, and lets future sessions start from the correct current state instead of re-deriving it imperfectly.
