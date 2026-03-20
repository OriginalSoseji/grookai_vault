# PRICING_CHECKPOINT_INDEX

## Purpose

This checkpoint pack preserves the pricing workstream’s architectural memory in durable repo-native form.

Its purpose is not to restate task history. Its purpose is to explain:

- what problems forced major pricing decisions
- why the obvious shortcuts were unsafe
- what decisions are now locked
- what future work must preserve to avoid undoing trust and correctness gains

These checkpoints should be read as institutional memory for the pricing system.

## Why This Decision Mattered

The decision to create a dedicated pricing checkpoint pack mattered because the pricing workstream had crossed into architectural territory where chat history and scattered audits were no longer sufficient institutional memory.

Without this index and the linked checkpoint sequence, future maintainers would have to reconstruct why the system was shaped this way from partial artifacts:

- readiness audits
- contamination audits
- observation-layer implementation files
- offline and live validation notes
- the first comps trust surface

That would make it too easy to preserve the code while accidentally forgetting the reasons the code was shaped this way. This index exists to stop that drift.

## Checkpoint Sequence

### `PRICING_CHECKPOINT_01_READINESS_AND_RISK.md`

This checkpoint records the moment pricing work stopped being “keep building” and became “audit before scale.” It explains why `NOT READY` and `AT RISK` were the correct classifications, why mapping-first ingestion became the main blocker, and why broader eBay connection was intentionally paused.

Decision locked there:

- do not scale broader eBay-driven pricing until trust, explainability, and mapping boundaries are stronger

Unresolved risk afterward:

- current prices were not proven contaminated, but they were also not provably clean

### `PRICING_CHECKPOINT_02_OBSERVATION_LAYER_DECISION.md`

This checkpoint explains why aggregate-only pricing was no longer defensible and why Grookai needed a canonical listing-level truth layer. It preserves the architectural rationale for `pricing_observations`, `v_pricing_observations_accepted`, and `v_pricing_observation_audit`.

Decision locked there:

- `accepted + mapped` is the non-negotiable boundary for pricing evidence

Unresolved risk afterward:

- the classifier above the observation layer still needed hardening before the evidence lane could be considered trustworthy

### `PRICING_CHECKPOINT_03_CLASSIFIER_HARDENING_AND_OFFLINE_CERTIFICATION.md`

This checkpoint preserves why offline certification became necessary, what the first `PARTIAL` result revealed, and why the final `PASS` mattered. It locks the slab-signal tiers, condition normalization ordering, and the role of the fixture harness as a repeatable certification gate.

Decision locked there:

- classifier changes must be certified offline against production logic, not debugged through ad hoc live API spend

Unresolved risk afterward:

- offline certification proved logic behavior, but live eBay end-to-end proof still remained pending

### `PRICING_CHECKPOINT_04_COMPS_TRUST_SURFACE.md`

This checkpoint explains why the comps panel was built before live pricing was fully proven and why trust surfaces belong to pricing correctness, not polish. It preserves the rationale for showing accepted evidence, filtered rows, and honest empty states on card detail.

Decision locked there:

- pricing evidence must be visible near the displayed price, even when data is sparse or still incomplete

Unresolved risk afterward:

- live accepted comps and live price explainability were still unproven because the first live validation slice failed closed on a real `429`

## Current Pricing State Summary

Current pricing state in plain language:

- readiness is still not fully proven for broader eBay expansion
- the system is much stronger than it was before the audits
- offline, the observation layer and classifier path are now proven
- live, the architecture failed closed correctly, but real accepted comp proof is still pending because source throttling blocked the first live slice

What is already built:

- public raw pricing seam unification
- pricing quota guard and founder pricing ops visibility
- observation-layer persistence
- accepted-lane and audit views
- classifier hardening with offline certification
- signed-in card detail comps trust surface

What is proven offline:

- accepted observations stay mapped
- rejected and staged observations stay out of accepted aggregation
- raw vs slab separation is materially hardened
- condition normalization regressions found in fixtures are fixed

What is still pending live:

- proof that real eBay listings persist into `pricing_observations`
- proof that live accepted comps remain fully mapped under actual source traffic
- proof that live downstream prices can be defended from persisted accepted comps in normal runtime conditions

The next logical step is:

- a second tightly controlled live validation pass once eBay throttling allows a clean run, using the existing tagged live-validation wrapper and the current comps / observation trust surfaces to inspect actual persisted live evidence

## Reading Order Recommendation

Recommended reading order for future maintainers:

1. `PRICING_CHECKPOINT_01_READINESS_AND_RISK.md`
   - start here to understand why the workstream slowed down and why scaling was paused

2. `PRICING_CHECKPOINT_02_OBSERVATION_LAYER_DECISION.md`
   - read next to understand the architectural pivot from opaque aggregation to persisted evidence

3. `PRICING_CHECKPOINT_03_CLASSIFIER_HARDENING_AND_OFFLINE_CERTIFICATION.md`
   - then read how the classifier was hardened and why the offline harness became a certification boundary

4. `PRICING_CHECKPOINT_04_COMPS_TRUST_SURFACE.md`
   - finish with how the evidence layer became visible on product surfaces and why trust is a system property

After those four checkpoints, read the supporting audits in this order:

- `docs/audits/PRICING_READINESS_AUDIT_V1.md`
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md`
- `docs/audits/PRICING_OBSERVATION_OFFLINE_VALIDATION_V1.md`
- `docs/audits/PRICING_OBSERVATION_LIVE_VALIDATION_V1.md`
