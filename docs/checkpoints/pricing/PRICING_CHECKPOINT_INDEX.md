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

### `PRICING_CHECKPOINT_95_FULL_ROLLOUT_OBSERVER_AUTOMATED_4_OF_7.md`

This checkpoint records the active full-eligible signed-in publication, the
independently pinned runtime/coverage/performance evidence lanes, the `4/7`
clean live observation, the `17/17` surface proof, and the read-only scheduled
workflow that will enforce the final seven-cycle pass.

Decision locked there:

- operational completion is controlled by the row-level observer result after
  seven healthy scheduled cycles; neither elapsed time nor four clean cycles
  may close the gate early

Unresolved risk afterward:

- Aug 31, Sep 1, and Sep 2 remain unobserved, and anonymous pricing remains
  blocked by separate licensing and public-display authority

### `PRICING_CHECKPOINT_94_TCGPLAYER_CANARY_FINAL_PASS.md`

This checkpoint records the corrected, hash-verified final replay of the
August 13 authenticated pricing canary and closes the frozen 72-hour gate.

Decision locked there:

- schedule truth comes from each publication's exact linked warehouse cycle,
  while publication completion remains bounded by the configured grace; the
  immutable final-window evidence passed with all three cycles reconciled

Unresolved risk afterward:

- the already-applied migration boundaries require fresh readback, then the
  full V1.2 shadow, signed-in activation, all-surface proof, and seven
  unattended full-production cycles remain open

### `PRICING_CHECKPOINT_38_CANARY_AUTOMATION_AND_POST_72H_HANDOFF.md`

This checkpoint records the automated read-only observation of the frozen
100-printing canary and the complete execution handoff for the first enforcing
run after the 72-hour deadline.

Decision locked there:

- the canary must pass before the exact two-migration package moves, and the
  post-canary rollout must integrate from current production `main` rather
  than deploy the divergent pricing branch wholesale

Unresolved risk afterward:

- the time gate, exact migration apply/readback, current-main integration,
  fresh V1.2 shadow, full signed-in activation, 17-surface proof, and seven
  unattended cycles remain incomplete

### `PRICING_CHECKPOINT_36_PRODUCTION_V1_FEATURE_FREEZE.md`

This checkpoint freezes Production V1 scope and acceptance criteria, limits
the release branch to defects and release proof, and parks future pricing ideas
outside the V1 execution path.

Decision locked there:

- release management replaces product design; every branch change must close
  an existing frozen Definition of Done requirement

Unresolved risk afterward:

- the 72-hour canary, post-canary deployment, full signed-in rollout, and seven
  unattended cycles remain unproven

### `PRICING_CHECKPOINT_35_PRODUCT_SURFACE_ROUTE_IDENTITY.md`

This checkpoint binds each of the 17 production pricing captures to an
explicit web route or canonical Flutter screen identity so one working surface
cannot impersonate another.

Decision locked there:

- correct price evidence only proves the surface from which it was actually
  captured; route identity mismatches fail closed

Unresolved risk afterward:

- final route-bound production captures remain pending until the frozen canary
  and post-canary deployment pass

### `PRICING_CHECKPOINT_34_PRODUCT_SURFACE_WIRING_CORRECTION.md`

This checkpoint corrects three source-to-render gaps found after the initial
readiness audit: web Set grids had no pricing path, while Flutter Compare and
Network rendered prices without preserving complete machine-readable
evidence.

Decision locked there:

- every required surface must retain the governed pricing record through
  render; visible dollar text and documentation claims are not substitutes

Unresolved risk afterward:

- final same-commit authenticated production captures remain pending until the
  frozen canary and post-canary rollout gates pass

### `PRICING_CHECKPOINT_33_PRODUCT_SURFACE_PROOF_READINESS.md`

This checkpoint records the 17-surface production proof contract, deployed
web evidence attributes, Flutter accessibility identifiers, exact Vault
total distinction, capture tooling, and fail-closed source-to-render
reconciliation.

Decision locked there:

- all-surface completion requires same-commit authenticated production
  captures reconciled to the shared RPC and exact-copy Vault evidence

Unresolved risk afterward:

- final captures remain pending until the frozen canary passes and the exact
  rollout clients are deployed

### `PRICING_CHECKPOINT_32_MIGRATION_APPLY_READINESS.md`

This checkpoint freezes the exact two-migration post-canary apply set, hashes,
strict preflight evidence, forbidden history shortcuts, and enforcing
post-apply checks.

Decision locked there:

- only the two manifest migrations may be applied after the 72-hour canary
  passes, and production schema parity requires an empty linked diff plus
  production readback

Unresolved risk afterward:

- the migrations remain intentionally unapplied until the canary gate passes

### `PRICING_CHECKPOINT_31_EXACT_VAULT_PRODUCTION_VERIFIER.md`

This checkpoint records the read-only exact-Vault production verifier and its
expected failing pre-deployment baseline. The verifier closes schema,
ACL/RLS, owner-isolation, exact-scope, copy-count, and independent-total proof
in one hashed package without preserving customer identifiers.

Decision locked there:

- exact-Vault production completion requires a clean-SHA enforcing verifier
  run after deployment, not a migration command or local smoke alone

Unresolved risk afterward:

- the target view remains absent until the frozen canary passes and the
  post-canary rollout is deployed

### `PRICING_CHECKPOINT_30_PRE_ROLLOUT_COMPLETION_TRUTH.md`

This checkpoint corrects the Production V1 completion matrix after
exact-printing Vault work was committed but intentionally left undeployed
during the frozen authenticated canary. It also preserves the current
`95.247%` V1.2 coverage baseline, deterministic gap ledger, and passing
read-model latency proof.

Decision locked there:

- committed and locally verified pricing work remains pending until production
  schema and source-to-render evidence prove the deployed state

Unresolved risk afterward:

- the 72-hour canary, exact-Vault deployment/readback, fresh full shadow,
  signed-in activation, seven unattended cycles, and public licensing
  authority remain open

### `PRICING_CHECKPOINT_29_VAULT_EXACT_PRINTING_PRICING.md`

This checkpoint records the migration of private/public, web/Flutter Vault
pricing to exact raw-copy identity, explicit unresolved-copy coverage, slab
exclusion, the owner-filtered read boundary, and the clean-SHA publication,
security, provenance, and rollback proof.

Decision locked there:

- Vault total is the sum of eligible exact raw-copy market closes; a parent
  `From` amount is never multiplied by quantity

Unresolved risk afterward:

- the migration remains local until the frozen 72-hour canary passes; corrected
  deployment, fresh full shadow, signed-in full rollout, seven unattended
  cycles, and public licensing authority remain open

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

28. `PRICING_CHECKPOINT_29_VAULT_EXACT_PRINTING_PRICING.md`
    - then read how Vault totals became sums of exact raw-copy prices, with
      unresolved copies and slabs excluded and private ownership targets
      constrained to an authenticated read-only view

29. `PRICING_CHECKPOINT_30_PRE_ROLLOUT_COMPLETION_TRUTH.md`
    - then read why committed pricing code, unapplied migrations, deployed
      clients, and verified rendering remain separate completion states

30. `PRICING_CHECKPOINT_31_EXACT_VAULT_PRODUCTION_VERIFIER.md`
    - then read how exact-copy Vault schema, ACL/RLS, ownership isolation,
      scope, totals, and clean-SHA deployment are proven together

31. `PRICING_CHECKPOINT_32_MIGRATION_APPLY_READINESS.md`
    - then read the frozen two-migration package, hashes, strict preflight,
      forbidden history shortcuts, and enforcing post-apply readback

32. `PRICING_CHECKPOINT_33_PRODUCT_SURFACE_PROOF_READINESS.md`
    - then read how the 17-surface source-to-render proof binds each captured
      amount to shared RPC evidence from the exact deployed commit

33. `PRICING_CHECKPOINT_34_PRODUCT_SURFACE_WIRING_CORRECTION.md`
    - then read how Set grids, Flutter Compare, and Flutter Network were
      corrected to preserve governed pricing evidence through render

34. `PRICING_CHECKPOINT_35_PRODUCT_SURFACE_ROUTE_IDENTITY.md`
    - then read how each proof is bound to an explicit web route or canonical
      Flutter screen so one working surface cannot impersonate another

35. `PRICING_CHECKPOINT_36_PRODUCTION_V1_FEATURE_FREEZE.md`
    - then read the immutable Production V1 product contract, release gates,
      feature freeze, and post-V1 parking lot

36. `PRICING_CHECKPOINT_38_CANARY_AUTOMATION_AND_POST_72H_HANDOFF.md`
    - read the original canary handoff as historical pre-incident context; it
      is superseded because the first unattended source cycle invalidated that
      observation window

37. `PRICING_CHECKPOINT_39_CANARY_INCIDENT_REPAIR_AND_RESTART.md`
    - finally read the source and publication incident, merged runtime repair,
      replacement activation, observer restart gate, and corrected
      post-72-hour execution sequence

38. `PRICING_CHECKPOINT_40_PRODUCT_SURFACE_RELEASE_READINESS.md`
    - then read the executable 17-surface registry, shared-client corrections,
      visible-text proof, read-only 100-row check, and frozen post-canary
      migration/deployment/rollback sequence

39. `PRICING_CHECKPOINT_41_MARKET_INTELLIGENCE_READ_MODEL_V1.md`
    - then read how existing exact-printing active-listing evidence became a
      separate signed-in market-intelligence lane, including the bounded
      assignment repair, production readback, authority boundaries, and the
      remaining web and scheduler rollout gates

40. `PRICING_CHECKPOINT_42_CANARY_COMMIT_PIN_REPAIR_AND_RESTART.md`
    - finally read why the August 2 window failed, how the stale systemd
      expected-commit pin was repaired without changing pricing authority,
      and which evidence is required before the replacement window can pass

41. `PRICING_CHECKPOINT_43_CURRENT_CANARY_AND_SURFACE_PUBLICATION.md`
    - then read the August 13 live restart, current 99-row health, production
      surface deployment, repaired GitHub observer, and exact post-canary
      completion boundary

42. `PRICING_CHECKPOINT_44_MTG_V1_SOURCE_READY_CANON_BLOCKED.md`
    - then read the read-only MTG production inventory, the distinction between
      117,267 warehoused source products and zero canonical MTG identities,
      and the exact canonical-catalog import gate required before publication

43. `PRICING_CHECKPOINT_45_MTG_CANONICAL_STAGING_CANARY_READY.md`
    - then read the full 104,712-print reconciliation, the app-visibility
      boundary correction, and the rollback-proven service-only Duskmourn
      staging canary awaiting its exact apply gate

44. `PRICING_CHECKPOINT_46_MTG_DSK_SERVICE_ONLY_STAGING_APPLIED.md`
    - then read the durable service-only DSK staging apply, exact 2,866-row
      production reconciliation, security and zero-visibility proof, and the
      bounded canonical-promotion gate that remains closed

45. `PRICING_CHECKPOINT_47_MTG_DSK_CANONICAL_PROMOTION_ROLLBACK_PROVEN.md`
    - then read the exact DSK canonical-promotion plan, hidden-by-default game
      release boundary, complete production rollback proof, and the still
      closed durable canonical apply gate

46. `PRICING_CHECKPOINT_48_MTG_DSK_HIDDEN_CANONICAL_APPLY_READY.md`
    - then read the exact fail-closed writer, two-row migration ledger,
      enforcing pre/post-commit checks, rollback-proven approval package, and
      the bounded hidden canonical apply that remains pending

47. `PRICING_CHECKPOINT_49_MTG_DSK_HIDDEN_CANONICAL_APPLIED.md`
    - then read the durable hidden DSK canonical apply, independent read-only
      reconciliation, exact 417-parent and 807-printing proof, zero client
      visibility, and the bounded full-catalog batching gate that follows

48. `PRICING_CHECKPOINT_50_MTG_FULL_CATALOG_BATCHED_MSH_STAGED.md`
    - then read the complete 104,712-parent and 953-set manifest, collision
      quarantine, set metadata abstentions, and the independently verified
      3,089-row MSH service-only staging apply

49. `PRICING_CHECKPOINT_51_MTG_MSH_CANONICAL_PROMOTION_ROLLBACK_PROVEN.md`
    - then read the set-generic hidden promotion contract, exact 3,089-row MSH
      transactional rollback proof, independent zero-finding readback, and the
      still-closed fail-closed durable writer gate

50. `PRICING_CHECKPOINT_52_MTG_MSH_HIDDEN_CANONICAL_APPLY_READY.md`
    - then read the frozen fail-closed writer, exact approval contract, writer
      rollback proof, independent production readback, and the one bounded MSH
      hidden canonical apply that remains pending

51. `PRICING_CHECKPOINT_53_MTG_FULL_CATALOG_INGESTION_SAFETY_LOCKED.md`
    - then read how per-set approvals were replaced by one frozen full-catalog
      envelope, how resume and retries remain fail-closed, and how the 25-set
      all-type production rollback canary locked the durable ingestion safety
      boundary without changing production data

52. `PRICING_CHECKPOINT_54_CROSS_TCG_SEALED_SCHEMA_APPLIED_CANARY_SELECTION_READY.md`
    - then read the independently verified private sealed-product schema,
      exact effective-privilege boundary, zero-row production state, and the
      ten-product read-only review packet that remains non-authoritative

53. `PRICING_CHECKPOINT_55_ONE_PIECE_DURABLE_STAGING_SCHEMA_OFFLINE_READY.md`
    - then read the passed One Piece production rollback proof, the new
      unapplied durable service-only staging and zero-row rollback candidates,
      the explicit effective-privilege boundary, and the production read-only
      preflight that remains required before migration placement or apply

54. `PRICING_CHECKPOINT_56_ONE_PIECE_DURABLE_STAGING_PREFLIGHT_PASSED.md`
    - then read the zero-finding production read-only preflight, its frozen
      producer and artifact fingerprints, the 7,261-row source warehouse
      baseline, and the still-closed schema-only apply boundary

55. `PRICING_CHECKPOINT_57_ONE_PIECE_MIGRATION_HISTORY_INTEGRATED_PREFLIGHT_REFRESHED.md`
    - then read why the applied sealed migration lineage was integrated before
      One Piece planning, the refreshed zero-finding preflight, and the exact
      schema-only boundary that remains closed

56. `PRICING_CHECKPOINT_58_ONE_PIECE_DURABLE_STAGING_SCHEMA_APPLIED.md`
    - then read the safely rolled-back verifier repair, exact successful schema
      apply, independent zero-finding readback, empty private staging state,
      and the still-closed payload-staging boundary

57. `PRICING_CHECKPOINT_59_ONE_PIECE_DURABLE_PAYLOAD_PLAN_FROZEN.md`
    - then read the exact offline 1-batch/21-row Starter Deck 1 payload, its
      zero-mismatch evidence binding, zero promotion authority, and the fresh
      source/schema preflight still required before any staging append

58. `PRICING_CHECKPOINT_60_ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_PASSED.md`
    - then read the fresh zero-finding production source/schema preflight,
      zero-collision empty staging state, exact evidence fingerprints, and the
      separately guarded 1-batch/21-row writer still required

59. `PRICING_CHECKPOINT_61_ONE_PIECE_DURABLE_PAYLOAD_STAGED.md`
    - then read the exact service-role append, 1-batch/21-row transaction and
      independent readback proofs, fully closed promotion authority, and the
      read-only identity review required before any canonical or sealed apply

60. `PRICING_CHECKPOINT_62_ONE_PIECE_STAGED_IDENTITY_REVIEW_COMPLETE.md`
    - then read the separate numbered-card, DON, sealed, and bundle review
      lanes, the two shared language/image evidence blockers, and the still
      closed canonical and sealed promotion boundaries

61. `PRICING_CHECKPOINT_63_ONE_PIECE_ST01_LANGUAGE_IMAGE_READINESS_PASSED.md`
    - then read the exact official English ST-01 authority, 21/21 verified
      image acquisition, rejected CDN placeholder evidence, 18 proposed
      card/DON paths, three deliberately undefined sealed paths, and the
      still-closed Storage and promotion boundaries

62. `PRICING_CHECKPOINT_64_ONE_PIECE_ST01_STORAGE_COLLISION_PREFLIGHT_PASSED.md`
    - then read the frozen 18-object read-only Storage collision proof, exact
      local hash readback, zero existing targets, explicit sealed exclusion,
      and the still-closed permanent-upload and pointer-mutation boundaries

63. `PRICING_CHECKPOINT_65_ONE_PIECE_ST01_PERMANENT_STORAGE_PLAN_FROZEN.md`
    - then read the exact 18-object permanent plan, frozen code bundle and
      authorization fingerprints, failure-atomic rollback contract, zero-access
      planning proof, and the still-closed durable upload boundary

64. `PRICING_CHECKPOINT_66_ONE_PIECE_ST01_STORAGE_UPLOAD_VERIFIED.md`
    - then read the exact 18-object durable upload, writer and independent
      download/hash readbacks, zero overwrite or rollback result, preserved
      database boundary, and the next numbered-card canonical preflight gate

65. `PRICING_CHECKPOINT_67_ONE_PIECE_CANONICAL_FOUNDATION_ROLLBACK_PROVED.md`
    - then read the hidden One Piece game/identity-domain foundation design,
      exact production preflight, successful rollback-only migration proof,
      independent zero-residue readback, preserved 21-row staging scope, and
      the still-closed durable foundation apply and card-promotion boundaries

66. `PRICING_CHECKPOINT_68_ONE_PIECE_CANONICAL_FOUNDATION_APPLY_READY.md`
    - then read the frozen hidden-foundation apply fingerprint, guarded writer,
      final fresh production preflight, exact two-row public-table attribution,
      failure-evidence contract, and the explicit authorization still required
      before durable migration apply

67. `PRICING_CHECKPOINT_69_ONE_PIECE_CANONICAL_FOUNDATION_APPLIED_VERIFIED.md`
    - then read the authorized durable foundation transaction, exact game and
      hidden release inserts, migration-ledger and six-domain constraint
      readback, independent hidden-visibility proof, zero canonical card rows,
      and the next separate 17-card rollback-canary gate

68. `PRICING_CHECKPOINT_70_ONE_PIECE_ST01_PROMOTION_ROLLBACK_PROVED.md`
    - then read the frozen 17-card English ST-01 parent payload, exact durable
      staging and self-hosted-image evidence binding, zero-collision production
      preflight, exact rollback-only write attribution, reproduced zero-residue
      proof, and the still-closed durable card-promotion boundary

69. `PRICING_CHECKPOINT_71_ONE_PIECE_ST01_DURABLE_APPLY_READY.md`
    - then read the guarded insert-only writer, immutable 1/17/17/17/17 apply
      plan, fresh zero-collision production preflight, independent post-apply
      verifier, exact authorization text, and the still-unexecuted durable gate

70. `PRICING_CHECKPOINT_72_ONE_PIECE_ST01_DURABLE_APPLIED_VERIFIED.md`
    - then read the authorized 1/17/17/17/17 production inserts, exact
      transaction-local attribution, writer and independent durable readbacks,
      preserved hidden visibility, and the separate printing/pointer audit next

71. `PRICING_CHECKPOINT_73_ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_PASSED.md`
    - then read the zero-finding production read-only audit, exact 17 parent
      artwork-pointer candidates, 14 normal child and printing-mapping
      candidates, three source-foil taxonomy blockers, zero child-image claims,
      and the still-closed rollback and durable mutation boundaries

72. `PRICING_CHECKPOINT_74_ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_FROZEN.md`
    - then read the immutable offline `17 / 14 / 14` mutation package, exact
      three-table transaction attribution, preserved foil blockers, zero child
      image claims, rollback and zero-residue contracts, and the still-closed
      production canary and durable apply boundaries

73. `PRICING_CHECKPOINT_75_ONE_PIECE_ST01_PRINTING_IMAGE_ROLLBACK_PROVED.md`
    - then read the two preserved zero-residue repair attempts, corrected
      self-hosted `identity` image-source contract, HOT-aware write attribution,
      exact `17 / 14 / 14` passing rollback proof, independent read-only
      verification, and the still-closed durable apply boundary

74. `PRICING_CHECKPOINT_76_ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLIED.md`
    - then read the exact hidden `17 / 14 / 14` durable apply, complete-row
      compare-and-set proof, writer and independent readbacks, zero findings,
      preserved foil and child-image deferrals, and the catalog-wide
      reconciliation gate that follows

75. `PRICING_CHECKPOINT_77_ONE_PIECE_COMPLETE_SOURCE_MANIFEST_FROZEN.md`
    - then read the refreshed 84-group, 7,261-product source inventory,
      complete source preservation proof, current single/DON/sealed/quarantine
      counts, immutable manifest hashes, and service-only full-staging gate

76. `PRICING_CHECKPOINT_78_ONE_PIECE_COMPLETE_STAGING_APPLIED.md`
    - then read the immutable 83-batch, 7,261-row service-only staging apply,
      exact source and collision preflight, 1,382-row rollback proof, writer and
      independent durable readbacks, hidden visibility, preserved holds and
      quarantines, and the bulk canonical reconciliation gate that follows

77. `PRICING_CHECKPOINT_79_ONE_PIECE_COMPLETE_NUMBERED_CANON_APPLIED.md`
    - then read the corrected English-only 6,491-parent promotion, explicit 22
      Japanese and 17 authority holds, zero-collision preflight, five-family
      rollback proof, exact 26,022-row insert-only apply, independent durable
      readback, hidden visibility, and the separate DON and sealed gates next

78. `PRICING_CHECKPOINT_80_ONE_PIECE_DON_CANON_APPLIED.md`
    - then read the 222-product English DON promotion, one Japanese and two
      future holds, product-specific identity policy, five-form rollback proof,
      exact 889-row insert-only apply, independent durable readback, hidden
      visibility, and the sealed candidate warehouse gate next

79. `PRICING_CHECKPOINT_81_ONE_PIECE_SEALED_CANDIDATES_APPLIED.md`
    - then read the complete 403-product service-only sealed candidate apply,
      preserved failed-first preflight, ten-product rollback proof, exact
      durable and independent readbacks, zero canonical sealed rows, unchanged
      card baseline, hidden visibility, and the reviewed family/variant gate
      that must precede sealed pricing or publication

80. `PRICING_CHECKPOINT_82_ONE_PIECE_SEALED_IDENTITY_REVIEW_PLAN.md`
    - then read the offline 403-row identity review plan, complete package-form
      proposal coverage, product-specific variant preservation, explicit
      evidence blockers, zero promotion authority, and the official product
      authority plus residual human-review gate that follows

81. `PRICING_CHECKPOINT_83_ONE_PIECE_SEALED_OFFICIAL_AUTHORITY.md`
    - then read the 17-page official Bandai product crawl, 176 hashed official
      records, 215 unique family-support candidates, one ambiguous and 187
      unsupported residual rows, corrected legacy/combined-page matching,
      zero exact variant authority, and the image-assisted review gate next

82. `PRICING_CHECKPOINT_84_ONE_PIECE_SEALED_IMAGE_REVIEW_PACKET.md`
    - then read the complete 403-row local image-review packet, 487-URL
      availability reconciliation, 476 available and 11 explicitly unavailable
      references, 84/84 available official Bandai images, zero promotion
      authority, and the human review export-validation gate that follows

83. `PRICING_CHECKPOINT_85_ONE_PIECE_SEALED_AUTOMATED_APPLY_READY.md`
    - then read the exact 403/403 online source proof, 390 current English
      auto-resolutions, 13 scope holds, zero human-review residual, schema-safe
      family repair, zero-collision production preflight, 12-form rollback
      canary with zero residue, frozen 242/390/390/390/1,731 insert-only apply
      plan, and the still-unexecuted durable writer gate

84. `PRICING_CHECKPOINT_86_ONE_PIECE_SEALED_CANON_APPLIED.md`
    - then read the frozen writer, fresh 390/390 lineage and zero-collision
      preflight, exact 242/390/390/390/1,731 durable insert attribution,
      matching payload readback hash, independent read-only verification,
      hidden client visibility, and the separately gated pricing-lineage audit

85. `PRICING_CHECKPOINT_87_ONE_PIECE_SEALED_PRICING_LINEAGE_READY.md`
    - then read the production read-only 390-variant pricing reconciliation,
      332 fresh exact release candidates, 4 stale, 38 null-market, 16
      missing-observation holds, strict TCGPlayer marketPrice authority,
      zero-write proof, and the rollback-only qualification insertion gate next

86. `PRICING_CHECKPOINT_88_ONE_PIECE_SEALED_QUALIFICATION_ROLLBACK_PROVEN.md`
    - then read the frozen database-shaped 374-row qualification payload,
      separate 16-row missing-observation hold list, fresh 374/374 production
      lineage and security preflight, three-status rollback insertion proof,
      exact write attribution, zero residue, and the still-unexecuted durable
      qualification apply-plan gate

87. `PRICING_CHECKPOINT_89_ONE_PIECE_SEALED_QUALIFICATION_APPLY_PLAN_FROZEN.md`
    - then read the exact one-table 374-row durable mutation contract, guarded
      dry-run/preflight/apply/verify writer, 16 excluded missing-observation
      holds, zero-connection writer dry run, immutable fingerprints, and the
      still-unexecuted production read-only apply preflight gate

88. `PRICING_CHECKPOINT_90_ONE_PIECE_SEALED_QUALIFICATIONS_APPLIED_RELEASE_GATE_READY.md`
    - then read the exact 374-row qualification apply and independent readback,
      332 qualified exact members, 58 explicit release exclusions, unchanged
      hidden visibility, and the database-bound immutable release gate next

89. `PRICING_CHECKPOINT_91_ONE_PIECE_SEALED_RELEASE_ACTIVE_INTERNAL.md`
    - then read the qualification-bound schema hardening, full 332-member
      rollback proof, frozen active internal release, signed-in rollback smoke,
      unchanged hidden catalog boundary, and the 6,730-image self-hosting gate

90. `PRICING_CHECKPOINT_92_ONE_PIECE_CARD_IMAGES_APPLIED_VERIFIED.md`
    - then read the exact 6,553-image self-host and pointer apply, independent
      readback, 177 explicit provider gaps, unchanged non-One Piece boundary,
      and the prohibition against substituting representative artwork

91. `PRICING_CHECKPOINT_93_ONE_PIECE_SIGNED_IN_CATALOG_READY.md`
    - then read the zero-residue signed-in simulation, complete authenticated
      catalog/search/sealed-price proof, anonymous denial, request-role client
      repair, deferred child-printing expansion, and guarded deployment gate

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
- `docs/audits/pricing/mee_pricing_platform_production_v1/canary_commit_pin_repair_20260805/REPORT.md`
- `docs/audits/pricing/mtg_pricing_readiness_v1/2026-08-13T17-52-09-387Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_stage_readback_v1/2026-08-13T19-06-22Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_promotion_rollback_proof_v1/2026-08-13T19-21-09Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_promotion_writer_v1/2026-08-13T19-27-59Z_dry_run/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_promotion_writer_v1/2026-08-13T21-33-11Z_apply/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_promotion_post_apply_readback_v1/2026-08-13T21-39-13Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_reconciliation_v1/2026-08-13T21-56-22Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_batch_manifest_v1/2026-08-13T22-10-07Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_stage_preflight_v1/2026-08-13T22-15-33Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_stage_writer_v1/2026-08-13T22-16-18Z_dry_run/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_stage_writer_v1/2026-08-13T22-25-15Z_apply/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_stage_post_apply_readback_v1/2026-08-13T22-27-42Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_promotion_rollback_proof_v1/2026-08-13T22-57-44Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_promotion_post_rollback_readback_v1/2026-08-13T22-58-45Z/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_promotion_writer_v1/2026-08-13T23-49-32Z_dry_run/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_set_promotion_post_rollback_readback_v1/2026-08-14T00-02-04Z_writer_dry_run/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-38-13Z_two_set_rollback_canary/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-47-08Z_frozen_plan/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-41-00Z_two_set_rollback_canary/REPORT.md`
- `docs/audits/pricing/mtg_canonical_catalog_ingestion_v1/2026-08-14T00-47-31Z_stratified_25_rollback_canary/REPORT.md`
