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

### `PRICING_CHECKPOINT_28_READ_MODEL_CONTRACT_COMPLETION.md`

This checkpoint records the completion of the shared pricing read contract:
separate source-observation and publication timestamps, deterministic parent
minimums that retain their exact-printing identity and provenance, governed
top-market reads, and exact/parent client selection semantics.

Decision locked there:

- every displayed parent amount remains traceable to one selected exact
  eligible printing, and product reads do not aggregate the raw listing
  warehouse

Unresolved risk afterward:

- the migration remains local until the frozen 72-hour canary passes; corrected
  deployment, fresh full shadow, signed-in full rollout, seven unattended
  cycles, and public licensing authority remain open

### `PRICING_CHECKPOINT_27_FULL_ROLLOUT_GUARDS_AND_SEVEN_CYCLE_OBSERVER.md`

This checkpoint records the fail-closed full-production scope guards, exact
deployed-commit schedule enforcement, bounded representative performance
policy, separate shadow/current coverage gates, and the read-only seven-cycle
full-rollout observer.

Decision locked there:

- full production means the complete eligible signed-in scope, produced and
  observed from exact clean commits through seven reconciled unattended cycles

Unresolved risk afterward:

- the frozen authenticated canary must finish, then fresh corrected shadow,
  full signed-in activation, seven-cycle evidence, and licensing authority
  must pass before anonymous rollout

### `PRICING_CHECKPOINT_26_OPERATIONAL_CONTROLS_AND_COMPLETION_MATRIX.md`

This checkpoint records the guarded publication rollback worker, exact GV-ID
provenance diagnostic, expanded incident runbook, clean-SHA readiness evidence,
and the first deterministic 30-requirement production completion matrix.

Decision locked there:

- Production V1 completion is a governed evidence decision: every required
  operational, product, rollout, and licensing gate must be represented, and
  pending or externally blocked rows prevent a completion claim

Unresolved risk afterward:

- the authenticated 72-hour canary, corrected V1.2 full shadow and signed-in
  rollout, seven unattended full-eligible cycles, final deterministic gap
  ledger, checkpoint closeout, and public licensing authority remain open

### `PRICING_CHECKPOINT_25_TCGPLAYER_EXACT_MAPPING_APPLY_V1.md`

This checkpoint records the first bounded canonical mapping apply: exactly 25
collision-free source products were inserted and read back without publication,
qualification, customer, or vault writes.

Decision locked there:

- exact mapping changes are append-only canon-maintenance actions produced from
  a hashed clean-commit plan and reconciled before any new pricing publication

Unresolved risk afterward:

- a fresh corrected full shadow must prove the launch denominator and gap
  ledger after the canary; no mapping apply itself authorizes rollout

### `PRICING_CHECKPOINT_24_TCGPLAYER_SCOPE_V1_2_AND_MAPPING_APPLY_READINESS.md`

This checkpoint records the year-qualified Staff scope defect found before
mapping apply, the V1.2 policy repair, corrected `95.247%` coverage, and the
maintenance-only 25-row apply readiness proof.

Decision locked there:

- source claims are classified from explicit evidence rather than exact phrase
  shape, and any mapping write must revalidate a hashed one-to-one plan from a
  clean producing commit inside the canon-maintenance boundary

Unresolved risk afterward:

- the first bounded mapping apply/readback, 72-hour canary, corrected V1.2 full
  shadow, broader signed-in rollout, unattended cycles, and anonymous licensing
  authority remain open

### `PRICING_CHECKPOINT_23_TCGPLAYER_EXACT_MAPPING_PLAN_V1.md`

This checkpoint records the read-only exact-mapping planner, its one-to-one
evidence requirements, and the production classification of `1,066` unmapped
source products into `274` exact candidates and `792` blocked cases.

Decision locked there:

- exact mappings require name, collector number, set authority, active standard
  identity, and collision-free source/target evidence; planning never writes

Unresolved risk afterward:

- candidates still require a bounded append-only apply/readback gate, while
  blocked identities, the 72-hour canary, corrected V1.1 shadow, broader
  signed-in rollout, and anonymous licensing authority remain open

### `PRICING_CHECKPOINT_22_TCGPLAYER_MARKET_SCOPE_V1_1.md`

This checkpoint centralizes the ordinary-single versus product-object and
special-print boundary, preserves the failed V1 baseline, and proves corrected
V1.1 coverage at `95.177%` over the same `45,082` source rows.

Decision locked there:

- coverage and publication share one evidence-aware product-scope classifier;
  missing ordinary mappings remain gaps while explicit V1.1 variants and
  unsupported product objects receive versioned exclusions

Unresolved risk afterward:

- the repaired policy still needs a new full shadow after the canary window;
  remaining exact mapping gaps, broader signed-in rollout, unattended cycles,
  and anonymous licensing authority remain open

### `PRICING_CHECKPOINT_21_TCGPLAYER_MARKET_READ_PERFORMANCE.md`

This checkpoint records the production read-path repair that moved active-list
aggregation out of customer requests, preserved the shared pricing contract,
and proved all detail and representative batch cases below the `500 ms` p95
target.

Decision locked there:

- product reads never scan the raw listing warehouse; current prices use
  request-scoped queries and available-today evidence comes from a separately
  refreshed indexed snapshot

Unresolved risk afterward:

- the 72-hour canary, `95%` fixed-denominator coverage, full eligible signed-in
  rollout, seven unattended cycles, and anonymous licensing gate remain

### `PRICING_CHECKPOINT_20_TCGPLAYER_MARKET_COVERAGE_BASELINE.md`

This checkpoint fixes the Production V1 coverage denominator, preserves the
first read-only production baseline, and records the real `90.712%` result
without excluding missing mappings.

Decision locked there:

- ordinary V1 coverage uses a versioned source product/subtype denominator;
  missing mappings remain gaps, and the signed-in rollout cannot expand until
  coverage reaches at least `95%`

Unresolved risk afterward:

- at least `1,474` additional exact rows, concentrated in modern, holo, and
  high-value lanes, must be repaired and proven through a new full shadow run

### `PRICING_CHECKPOINT_19_TCGPLAYER_MARKET_CANARY_SCHEDULE_ACTIVATION.md`

This checkpoint records the production operations migration, durable founder
alert route, guarded systemd schedule, first fail-closed run, narrow verified
no-change health repair, and successful 100-printing signed-in canary run.

Decision locked there:

- the signed-in canary may run unattended only through the guarded scheduler,
  with evidence-backed source continuity, durable failure alerts, and exact
  source-to-client reconciliation

Unresolved risk afterward:

- the full 72-hour scheduled observation window, full eligible signed-in
  rollout, seven daily cycles, and anonymous licensing/display gate remain

### `PRICING_CHECKPOINT_18_TCGPLAYER_MARKET_CANARY_VERIFICATION.md`

This checkpoint records the genuine stratified 100-printing verification
canary, the Arceus Charizard assignment correction, the wrong Here Comes Team
Rocket image caught by visual review, and the final `100/100` result with no
customer activation.

Decision locked there:

- signed-in canary activation may use only the exact verified 100-printing
  allowlist after a same-SHA shadow and exact-definition dry-run proof

Unresolved risk afterward:

- final same-SHA shadow cycles, exact-definition dry-run, authenticated
  activation, telemetry, rollback proof, and the 72-hour observation window
  remain required

### `PRICING_CHECKPOINT_17_TCGPLAYER_MARKET_SHADOW_GATE_1.md`

This checkpoint records the first complete production shadow lock for
TCGPlayer Market Product V1. It preserves the production performance and
artifact-lineage repairs, three identical same-SHA cycles, complete snapshot
provenance, and proof that no customer publication was activated.

Decision locked there:

- production qualification is deterministic and traceable enough to advance
  from shadow publication into a fixed 100-printing verification canary

Unresolved risk afterward:

- the stratified 100-printing sample still requires image/data verification,
  signed-in activation, telemetry, and the full 72-hour canary window

### `PRICING_CHECKPOINT_16_SCHEMA_RECONCILIATION_V1.md`

This checkpoint records the historical linked-schema reconciliation required
before TCGPlayer Market V1 could advance through the normal migration path. It
locks replay-safe reconstruction, exact security metadata, the synthetic pull
provenance, and the safe renumbering of the still-unapplied pricing migration.

Decision locked there:

- historical schema state must be reproducible without migration repair or
  `--include-all`, and physical column position is not a product contract

Unresolved risk afterward:

- production pricing migration apply and schema/security readback remain
  pending, followed by the required shadow and canary gates

### `PRICING_CHECKPOINT_15_TCGPLAYER_MARKET_PRODUCT_V1.md`

This checkpoint records the production pivot from a synthetic app-facing value
to exact TCGPlayer Market publication for ordinary English Pokemon printings.
It locks the shared read model, append-only qualification/publication ledgers,
source-to-UI traceability, and the signed-in canary rollout boundary.

Decision locked there:

- Production V1 displays source TCGPlayer `marketPrice`; active asks and
  proprietary valuation research remain separate lanes

Unresolved risk afterward:

- the linked migration drift, remote apply, three shadow cycles, bounded
  publication apply, and signed-in production canary still require their
  explicit deployment gates

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

### `PRICING_CHECKPOINT_14_WAREHOUSE_CONTRACT_V1.md`

Defines warehouse ingestion contract with snapshot-based storage model. Locks time-series listing behavior and ensures warehouse does not bypass observation layer. Enables scalable ingestion and replayable pricing.

Unresolved:

- ingestion pipeline not implemented
- deduplication hash strategy optional
- storage scale not yet tested

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

13. `PRICING_CHECKPOINT_14_WAREHOUSE_CONTRACT_V1.md`
   - then read how warehouse-first ingestion was locked so replayable listing storage never bypasses the observation truth gate

14. `PRICING_CHECKPOINT_15_TCGPLAYER_MARKET_PRODUCT_V1.md`
   - then read how exact TCGPlayer Market publication became the Production V1 app-facing price contract and was routed through supported web and Flutter surfaces

15. `PRICING_CHECKPOINT_16_SCHEMA_RECONCILIATION_V1.md`
   - then read how historical linked drift was converted into replayable repository authority before the production pricing migration

16. `PRICING_CHECKPOINT_17_TCGPLAYER_MARKET_SHADOW_GATE_1.md`
   - then read how the production pipeline completed three deterministic
     same-SHA shadow cycles with complete provenance and no customer activation

17. `PRICING_CHECKPOINT_18_TCGPLAYER_MARKET_CANARY_VERIFICATION.md`
   - then read how a genuine fixed 100-printing sample caught and repaired
     canonical assignment and image defects before any signed-in activation

18. `PRICING_CHECKPOINT_19_TCGPLAYER_MARKET_CANARY_SCHEDULE_ACTIVATION.md`
   - then read how the exact canary became a guarded scheduled production
     operation with durable alerts, verified no-change health policy, and
     signed-in source-to-client readback

19. `PRICING_CHECKPOINT_20_TCGPLAYER_MARKET_COVERAGE_BASELINE.md`
   - then read how the fixed Production V1 denominator exposed the real
     `90.712%` baseline and the concentrated exact-mapping work required before
     broad signed-in rollout

20. `PRICING_CHECKPOINT_21_TCGPLAYER_MARKET_READ_PERFORMANCE.md`
   - then read how customer pricing reads were separated from the raw listing
     warehouse and proven below the Product V1 latency target in production

21. `PRICING_CHECKPOINT_22_TCGPLAYER_MARKET_SCOPE_V1_1.md`
    - then read how the Product V1 scope boundary was corrected without hiding
      ordinary mapping gaps or discarding the original failed baseline

22. `PRICING_CHECKPOINT_23_TCGPLAYER_EXACT_MAPPING_PLAN_V1.md`
    - then read how unmapped source products were classified into collision-free
      exact candidates and explicit blockers without changing canonical state

23. `PRICING_CHECKPOINT_24_TCGPLAYER_SCOPE_V1_2_AND_MAPPING_APPLY_READINESS.md`
    - then read how a year-qualified Staff variant was removed from Product V1
      and the first bounded mapping writer was proven read-only before apply

24. `PRICING_CHECKPOINT_25_TCGPLAYER_EXACT_MAPPING_APPLY_V1.md`
    - then read how the first 25 exact mappings were applied from a clean
      committed plan, read back exactly, and kept isolated from publication

25. `PRICING_CHECKPOINT_26_OPERATIONAL_CONTROLS_AND_COMPLETION_MATRIX.md`
    - then read how rollback, provenance lookup, incident handling, and the
      fail-closed production completion matrix became permanent operations

26. `PRICING_CHECKPOINT_27_FULL_ROLLOUT_GUARDS_AND_SEVEN_CYCLE_OBSERVER.md`
    - then read how full signed-in publication became fail-closed on complete
      scope, exact deployed commit, fresh shadow evidence, and seven reconciled
      unattended cycles

27. `PRICING_CHECKPOINT_28_READ_MODEL_CONTRACT_COMPLETION.md`
    - then read how publication timestamps, backing exact-printing identity,
      parent minimum provenance, and governed top-market reads completed the
      shared product contract

After those checkpoints, read the supporting audits in this order:

- `docs/audits/PRICING_READINESS_AUDIT_V1.md`
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md`
- `docs/audits/PRICING_OBSERVATION_OFFLINE_VALIDATION_V1.md`
- `docs/audits/PRICING_OBSERVATION_LIVE_VALIDATION_V1.md`
- `docs/audits/pricing/TCGPLAYER_MARKET_PUBLICATION_LOCAL_PROOF_20260727.md`
- `docs/audits/pricing/TCGPLAYER_MARKET_PRODUCT_SURFACES_V1_20260727.md`
- `docs/audits/pricing/TCGPLAYER_MARKET_SCHEMA_RECONCILIATION_V1_20260727.md`
- `docs/audits/pricing/TCGPLAYER_MARKET_SHADOW_GATE_1_20260728.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/2026-07-28T08-40-41Z_canary_schedule_activation/DEPLOYMENT_REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/read_performance_gate/2026-07-28T09-47-20-239Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_1/2026-07-28T10-25-50-424Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1/2026-07-28T10-38-25-697Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_2/2026-07-28T10-49-27-107Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_plan_v1_1/2026-07-28T10-50-02-909Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/exact_mapping_apply_v1/2026-07-28T11-10-00-900Z_apply_f215e3b1-65b5-4d08-bfb3-b3ef98a0da77/post_apply_reconciliation.json`
- `docs/audits/pricing/mee_pricing_platform_production_v1/canary_observation_progress/2026-07-28T11-38-04-675Z/REPORT.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/provenance_lookup_v1_readiness/2026-07-28T11-36-54-825Z/summary.json`
- `docs/audits/pricing/mee_pricing_platform_production_v1/publication_rollback_v1_readiness/2026-07-28T11-36-54-826Z_dry_run_4a3d93d2-9f02-4c06-9f04-d65776ad65a2/summary.json`
- `docs/audits/pricing/mee_pricing_platform_production_v1/production_completion_matrix_v1/runs/2026-07-28T11-36-54-775Z/REPORT.md`
