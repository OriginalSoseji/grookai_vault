# PRICING_CHECKPOINT_02_OBSERVATION_LAYER_DECISION

## Date / Phase Context

Date context: `2026-03-19`

Phase context:

- pricing readiness had already been audited
- contamination risk had been classified as `AT RISK`
- the active Browse worker in `backend/pricing/ebay_browse_prices_worker.mjs` still aggregated listings directly into canonical active-price tables
- there was no durable listing-level truth layer that could explain how a displayed price had been produced

This checkpoint records the decision that changed pricing architecture from aggregate-first to evidence-first.

## The Architectural Problem We Had

Before `PRICING_OBSERVATION_LAYER_V1`, the active Browse lane could:

- fetch listings
- classify them in memory
- aggregate them into medians, floors, and sample counts
- write those outputs to canonical active-price tables

What it could not do was prove, after the fact:

- which listings were used
- which listings were rejected
- why a listing was rejected
- whether a displayed price could be defended from persisted market evidence

That made the system operationally functional but architecturally weak. An aggregate-only system can produce numbers, but it cannot provide auditability, explainability, or contamination proof.

## Why A Listing-Level Truth Layer Was Required

A listing-level truth layer was required because the system needed durable evidence before any broader eBay scaling could be considered safe.

The contamination audit established the core problem:

- canonical active-price tables persisted aggregates
- they did not retain listing identity, title, or classification evidence
- therefore they could not prove cleanliness or explainability after the fact

`pricing_observations` solved that by making every pricing input persistable before aggregation.

That changed the system from:

- black-box query -> filter -> aggregate -> price

to:

- query -> persist listing observations -> classify -> expose accepted lane -> aggregate from persisted truth

## Why Showing Comps Became A Core Product Requirement

Showing comps is not a nice-to-have on top of pricing. It is the visible expression of whether the pricing system is defensible.

If a user, founder, or future maintainer cannot answer:

- “which listings were used?”
- “which listings were filtered out?”
- “why was this listing rejected?”

then the system is still operating as a black box.

That is why the observation layer and the future comps surface belong to the same architectural story. The moment Grookai decided pricing needed to be explainable, persisted comps stopped being a UI feature and became core trust infrastructure.

## The Decision We Made

The key decision was to create a source-agnostic listing-level intake layer and make it the trusted entry point for pricing evidence.

The non-negotiable rule became:

- only `classification = accepted` and `mapping_status = mapped` may influence pricing

Everything else still had to be persisted, because rejected or staged listings are also part of the truth. They show what the system saw, what it filtered out, and why.

## Why This Decision Mattered

This decision mattered because it changed the system’s center of gravity.

Before the observation layer, the center of gravity was the aggregate price output.

After the observation layer, the center of gravity became the persisted evidence that justifies the output.

That shift is what makes later pricing trust, comps UX, contamination audits, and source hardening possible without rewriting the architecture again.

## What Was Added

`PRICING_OBSERVATION_LAYER_V1` added these canonical objects:

- `public.pricing_observations`
  - the durable listing-level truth table for pricing inputs

- `public.v_pricing_observations_accepted`
  - the clean pricing input lane where only `accepted + mapped` rows remain

- `public.v_pricing_observation_audit`
  - the debug / ops surface for summarizing listing counts, confidence, and price spread by classification and mapping state

It also added the supporting write/read paths:

- `backend/pricing/pricing_observation_layer_v1.mjs`
- observation persistence inside `backend/pricing/ebay_browse_prices_worker.mjs`
- observation-based reads through `getAcceptedPricingObservationsForBatch(...)`

Two fields were especially important:

- `condition_bucket`
  - required so persisted observations could still rebuild the same bucketed aggregation inputs

- `raw_payload`
  - required so the system retained trace context instead of discarding it at the time of persistence

## Why `accepted + mapped` Is Sacred

`accepted + mapped` is sacred because it is the exact point where pricing evidence becomes eligible to influence market output.

If that boundary is weakened, the system immediately reverts toward the same trust failures the observation layer was created to solve.

This boundary protects against:

- unmapped listings influencing canonical prices
- ambiguous listings silently entering the raw lane
- future source integrations bypassing identity proof

Future work can change classifier sophistication, source coverage, or display surfaces. It must not weaken `accepted + mapped`.

## Why We Persist Filtered Rows Too

Persisting only accepted listings would recreate a subtler black box.

Filtered rows matter because they preserve:

- what the system saw
- what it rejected
- why it rejected it

This is necessary for:

- audits
- trust surfaces
- classifier debugging
- manipulation resistance

If bad or ambiguous listings are silently dropped, the system becomes harder to defend precisely when market behavior gets messy.

## Alternatives We Rejected

The observation layer decision explicitly rejected these alternatives:

- direct worker-to-aggregate-only flow
  - rejected because it could not provide durable evidence or post-hoc explainability

- silent discard of bad listings
  - rejected because discarded rows are part of the truth and are necessary for audit and trust

- relying on eBay response shape as system truth
  - rejected because vendor payloads are not Grookai’s canonical model and should never become the long-term source of truth by accident

- treating “show comps later” as acceptable
  - rejected because lack of persisted evidence was already the blocker, not the absence of a UI surface

## What This Checkpoint Changed About Grookai Pricing

After this checkpoint:

- pricing had a listing-level persistence layer
- aggregation could be explained from persisted rows
- filtered rows became visible system knowledge rather than discarded noise
- contamination could be reasoned about from durable evidence instead of inference alone
- future comps surfaces became technically honest, not synthetic

This was the point where Grookai pricing stopped being merely a calculation pipeline and became an evidence-backed pricing system.

## What Future Maintainers Must Preserve

Future maintainers must preserve these architectural rules:

- `pricing_observations` is the listing-level truth intake layer
- `v_pricing_observations_accepted` is the only observation lane allowed to influence pricing
- `accepted + mapped` is sacred
- filtered rows must remain queryable and explainable
- `condition_bucket` and `raw_payload` are trust infrastructure, not incidental fields
- aggregation must remain explainable from persisted observations

If a future change bypasses observation persistence or weakens the accepted boundary, it undoes the core trust decision that justified this checkpoint.

