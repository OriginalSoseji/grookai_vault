# PRICING_CHECKPOINT_INDEX

## Purpose

This checkpoint pack preserves the pricing workstream’s architectural memory in durable repo-native form.

Its purpose is not to restate task history. Its purpose is to explain:

- what problems forced major pricing decisions
- why the obvious shortcuts were unsafe
- what decisions are now locked
- what future work must preserve to avoid undoing trust and correctness gains

These checkpoints should be read as institutional memory for the pricing system.

## Resume Artifact

- `docs/system/RESUME_PRICING_V1.md` - use this to restart pricing work in a new chat without drift

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

### `PRICING_CHECKPOINT_05_TRUST_SYSTEM_V1.md`

This checkpoint explains why the price itself now needs to communicate trust at a glance, not only through the comps panel. It preserves the deterministic rules for market state, confidence, freshness, and honest empty / thin / stale states on card detail.

Decision locked there:

- the main pricing surface must expose trust state directly from persisted observation evidence

Unresolved risk afterward:

- live comp population is still limited by eBay throttling and the incomplete live validation window, so the trust surface exists before dense live evidence is broadly available

### `PRICING_CHECKPOINT_06_QUEUE_MODEL_V1.md`

This checkpoint records the shift from broad refresh pressure to demand-driven queue control. It explains why broad scheduler and backfill defaults were wrong for the current source-constrained phase, why vault-linked demand became the highest-priority queue driver, and why throttle-blocked runs must not be treated as meaningful pricing attempts.

Decision locked there:

- pricing queue policy is demand-driven, vault-first, cooldown-controlled, and explicit about throttle-blocked versus meaningful attempts

Unresolved risk afterward:

- live source availability is still externally constrained by eBay Browse throttling, so demand-driven queue policy reduces pressure but does not solve upstream throttle behavior by itself

### `PRICING_CHECKPOINT_07_JUSTTCG_SOURCE_DECISION.md`

This checkpoint records the audit-driven decision on JustTCG as an external source candidate. It explains why JustTCG has real utility as a pricing-oriented reference source, but also why its vendor-owned IDs, public breaking changes, and lack of observation-grade explainability make it unsuitable as canonical identity authority or primary pricing truth inside Grookai.

Decision locked there:

- JustTCG is allowed only as a constrained secondary/internal comparison source, not as canonical identity authority or primary user-facing pricing truth

Unresolved risk afterward:

- live JustTCG API behavior remains unverified in repo because no API key was available during the audit, so any future stronger role would require fresh runtime proof before contract escalation

### `PRICING_CHECKPOINT_08_PROJECTION_SYSTEM_V1.md`

This checkpoint records the decision to create a separate PSA 10 projection lane rather than letting external reference data or modeled values blur into market truth. It explains why eBay must remain the only raw market-truth lane, why JustTCG can only act as a reference input, and why projected values must always remain explicitly labeled and non-authoritative.

Decision locked there:

- projection is a separate modeled lane, reference-backed when available, and is never allowed to feed back into raw market truth or trust/comps semantics

Unresolved risk afterward:

- projection is still reference-backed, not comp-backed slab truth, and full slab-truth pricing remains future work; JustTCG runtime integration may still be pending or limited

### `PRICING_CHECKPOINT_09_LIVE_SOURCE_CONSTRAINTS.md`

This checkpoint records the reality that current live eBay proof is blocked by upstream source availability, not by a demonstrated collapse in Grookai pricing logic. It preserves the repeated first-call `429` result, the distinction between healthy internal budget and externally constrained source access, and the rule that fail-closed behavior under throttle is the correct operational outcome.

Decision locked there:

- first-call Browse `429` is `BLOCKED_BY_THROTTLE`, not generic pricing failure, and live proof remains pending source availability rather than architectural redesign

Unresolved risk afterward:

- upstream eBay availability is still externally constrained, and live comp population remains unproven until a non-throttled validation window exists

### `PRICING_CHECKPOINT_10_REFERENCE_LANE_STRATEGY.md`

This checkpoint records the strategic role of the reference lane and locks JustTCG into a strictly secondary position. It explains why Grookai still needs reference/coverage utility while live density remains constrained, but also why that utility must never be allowed to become canonical identity authority, market truth, or a silent fallback for explainable pricing.

Decision locked there:

- JustTCG is allowed only as a constrained reference lane for internal comparison, optional reference use, and projection support; it is not allowed to become truth infrastructure

Unresolved risk afterward:

- JustTCG runtime behavior is still not live-proven in Grookai because no API key probing occurred, and reference integration itself may still be pending implementation

### `PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL.md`

This checkpoint formally defines the three-lane pricing model now shaping Grookai: market truth, reference, and projection. It preserves the rule that these lanes answer different questions, must remain visibly distinct, and must never be blended into one ambiguous pricing surface.

Decision locked there:

- pricing is now governed by an explicit three-lane model in which market truth, reference, and projection remain structurally separated

Unresolved risk afterward:

- the three-lane architecture is now defined, but live data density and real reference integration are still incomplete, and full slab-truth pricing remains future work

### `PRICING_CHECKPOINT_12_REFERENCE_LAYER_IMPLEMENTATION.md`

This checkpoint records the safe runtime implementation of the reference lane. It explains why the JustTCG-backed read helper had to stay isolated from market truth, how projection now consumes real reference input when configured, and why any secondary reference display must remain explicitly labeled and unable to replace Grookai’s observation-backed market lane.

Decision locked there:

- the reference lane is now implemented as a read-only, non-authoritative runtime path that can support projection and secondary context without contaminating market truth

Unresolved risk afterward:

- JustTCG reliability remains unproven at runtime scale, and reference quality may still vary materially by card and set

## Current Pricing State Summary

Current pricing state in plain language:

- readiness is still not fully proven for broader eBay expansion
- the system is much stronger than it was before the audits
- offline, the observation layer and classifier path are now proven
- live, the architecture failed closed correctly, but real accepted comp proof is still pending because source throttling blocked the live validation slice
- the live path is wired, but upstream availability remains externally constrained
- the reference lane is strategically allowed, explicitly constrained, and now minimally wired as a read-only helper
- the projection lane now exists structurally and can consume reference input without changing the truth lane
- the truth lane remains eBay-only

What is already built:

- public raw pricing seam unification
- pricing quota guard and founder pricing ops visibility
- observation-layer persistence
- accepted-lane and audit views
- classifier hardening with offline certification
- signed-in card detail comps trust surface
- signed-in card detail trust summary
- demand-driven queue policy with explicit cooldown and throttle-blocked semantics
- explicit checkpointed restriction that JustTCG may only play a secondary/reference role unless re-audited
- safe reference-lane runtime helper for secondary context and projection support
- separate projection lane contract for PSA 10 modeled values without contaminating market truth
- explicit source-constraint checkpoint distinguishing upstream throttle from internal pricing failure
- explicit three-lane pricing model preserving truth/reference/projection separation

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

- a second tightly controlled live validation pass once eBay throttling allows a clean run, using the existing tagged live-validation wrapper, the demand-driven queue policy, and the current comps / observation trust surfaces to inspect actual persisted live evidence

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

5. `PRICING_CHECKPOINT_05_TRUST_SYSTEM_V1.md`
   - then read how trust moved into the at-a-glance price surface through deterministic market, confidence, and freshness rules

6. `PRICING_CHECKPOINT_06_QUEUE_MODEL_V1.md`
   - then read how queue policy was narrowed to demand-driven, vault-first, cooldown-controlled behavior under real source throttling

7. `PRICING_CHECKPOINT_07_JUSTTCG_SOURCE_DECISION.md`
   - then read how a new external pricing source was evaluated and explicitly constrained so it cannot silently become truth infrastructure

8. `PRICING_CHECKPOINT_08_PROJECTION_SYSTEM_V1.md`
   - then read how grading upside/projection was added as its own lane so modeled values stay useful without being confused for current market truth

9. `PRICING_CHECKPOINT_09_LIVE_SOURCE_CONSTRAINTS.md`
   - then read how repeated live throttle results were classified as source-availability constraints rather than pricing-logic failure

10. `PRICING_CHECKPOINT_10_REFERENCE_LANE_STRATEGY.md`
   - then read how the reference lane was strategically constrained so external source utility cannot drift into truth authority

11. `PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL.md`
   - then read the formal three-lane pricing model that now separates market truth, reference, and projection

12. `PRICING_CHECKPOINT_12_REFERENCE_LAYER_IMPLEMENTATION.md`
   - then read how the reference lane was implemented safely at runtime without allowing JustTCG or future vendor sources to replace truth infrastructure

After those twelve checkpoints, read the supporting audits in this order:

- `docs/audits/PRICING_READINESS_AUDIT_V1.md`
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md`
- `docs/audits/PRICING_OBSERVATION_OFFLINE_VALIDATION_V1.md`
- `docs/audits/PRICING_OBSERVATION_LIVE_VALIDATION_V1.md`
