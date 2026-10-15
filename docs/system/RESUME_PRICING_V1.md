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
- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
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
- future free-provider, free-tier API, CSV/export, user-uploaded, and manual/admin pricing evidence is governed by `PRICING_EVIDENCE_ENGINE_V1`
- the reference lane is implemented as a read-only non-authoritative helper
- Market Evidence Engine warehouse ingestion, internal review lanes, local Ollama evidence review, slab identity, and founder queue are implemented on PR #687
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
- JustTCG runtime reliability remains unproven at scale
- PR #687 still needs merge and an unattended scheduled-worker success receipt from the merged commit
- raw internal candidates still require governed review before any public-pricing decision
- slab pricing remains founder-gated; no slab row can auto-approve or publish

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
- free-provider pricing can expand the reference evidence layer only; it cannot silently become market truth
- demand-driven pricing is the correct operating model for this phase
- the Pokémon TCGPlayer completion agent owns the separate catalog and missing-price backlog under its exact-identity gates

## Next Logical Step

Primary next step:

- merge PR #687, then prove one unattended `Grookai Market Evidence Ollama` run from the merged commit

That next step should:

- retain the scheduled worker log and automation summary
- verify its page checkpoint advances
- independently read back both internal review-event tables
- prove every public-price boundary field remains false
- route slab rows only to the founder review queue

That next step must not:

- treat Ollama output as mapping or publication authority
- auto-approve slab rows
- write `pricing_observations` or bypass the publication gate

## Resume Prompt Block

Use this block to restart pricing work in a new chat:

```md
Pricing is operating under AXIOM Execution Interface V4. Anchor to `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`, the key pricing audits, `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`, and `docs/audits/MARKET_EVIDENCE_ENGINE_OLLAMA_REVIEW_20261015.md`. Current state: eBay is the only market-truth lane; pricing is observation-backed and `accepted + mapped` only; Market Evidence Engine warehouse ingestion and internal review are implemented on PR #687; the local Ollama worker is advisory and writes only internal raw or slab review events; slab rows remain founder-gated and cannot auto-approve or publish; JustTCG and other reference sources remain non-authoritative. Invariants: no silent fallback pricing, no reference/projection contamination of raw market truth, empty market stays honestly empty, and fail closed under throttle. Next objective: merge PR #687 and retain one successful unattended scheduled-worker receipt from the merged commit, including independent proof that all public-price boundary fields remain false.
```

## Why This File Matters

This file matters because pricing has accumulated enough architectural decisions and invariants that restarting from conversational memory is now unsafe.

Repo-backed resume state is part of operating discipline. It prevents reset-to-zero reasoning, protects checkpointed decisions from drift, and lets future sessions start from the correct current state instead of re-deriving it imperfectly.
