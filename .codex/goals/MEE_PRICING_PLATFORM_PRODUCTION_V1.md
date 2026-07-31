MODE: CODEX

### START CODEX

````md
# GOAL: MEE Pricing Platform Production V1

## Operating Instruction

Implement this goal completely from repository audit through verified production readiness.

Do not stop for planning approval, implementation approval, migration approval, phase approval, or other micro-approvals.

Make safe, evidence-based decisions independently when the repository and production artifacts provide enough information. Do not ask the founder to choose between ordinary implementation details.

Only stop as `BLOCKED` when proceeding would require:

- unavailable credentials or external access
- an irreversible destructive action not authorized by this goal
- a licensing or legal decision that cannot be established from repository evidence
- a genuine invariant conflict with no safe resolution
- missing production evidence that cannot be retrieved through available read-only access

The objective is not merely to make prices appear. The objective is to complete the governed production pricing platform described below.

Follow:

Audit → Contract → Dry-Run → Apply → Verify

Repository evidence, production readbacks, committed contracts, migrations, checkpoints, and runtime state override assumptions and conversational descriptions.

---

# 1. Goal Registration

First inspect the repository to determine how selectable goals, goal options, project objectives, or autonomous execution goals are currently represented.

Locate:

- goal registries
- goal option schemas
- execution dashboards
- agent task selectors
- prompt libraries
- project-control files
- startup/bootstrap instructions
- existing goal examples
- status and completion models
- any UI or CLI surfaces used to select a goal

Add **MEE Pricing Platform Production V1** as a selectable goal option using the repository’s existing architecture and conventions.

Do not create a parallel goal system.

The goal option must preserve the full specification in this artifact, including:

- objective
- scope
- exclusions
- execution phases
- acceptance criteria
- rollout gates
- completion standard
- blocked conditions
- checkpoint requirements

The selectable goal must instruct the executing agent to continue autonomously until all acceptance requirements are verified or a legitimate blocked condition is proven.

Add tests proving the goal:

- appears in the supported goal registry or selector
- loads the complete specification
- preserves the autonomous execution instruction
- does not request micro-approvals
- cannot be marked complete from partial UI functionality
- requires production verification before completion

If the repository has no existing selectable goal system, document that finding and implement the smallest architecture-aligned goal registry necessary to support this goal without introducing an unrelated orchestration platform.

---

# 2. Production Objective

Production V1 publishes **TCGPlayer Market** for English Pokémon exact printings.

Production V1 must not calculate, label, imply, or display a proprietary **Grookai Value**.

TCGPlayer `marketPrice` is the authoritative V1 market close.

A displayed price must follow this trace:

```text
TCGCSV source row
→ exact canonical printing mapping
→ deterministic qualification
→ publication decision
→ immutable pricing snapshot
→ shared pricing read model
→ API response
→ rendered client
````

The platform is complete only when this full path:

* runs unattended
* is durable and resumable
* is fully traceable
* powers every supported pricing surface consistently
* can be reconciled from source counts through rendered output
* operates without manual microapproval for ordinary exact-printing English Pokémon singles

A price appearing on one card page is not completion.

---

# 3. Branch And Worktree Safety

The existing `pricing/full-tcgcsv-warehouse` worktree contains modified or untracked work.

Preserve it exactly as found.

Do not:

* clean it
* reset it
* stash it
* switch its branch
* commit its changes
* copy unverified modifications from it
* merge it
* deploy from it

Audit and record:

* all worktrees
* branch names
* HEAD SHAs
* dirty state
* untracked files
* divergence from remotes
* intended base branch
* intended base SHA

Create a separate clean worktree and branch:

```text
pricing/mee-productization-v1
```

Create it from the verified intended base SHA.

Before modification, prove:

* the new worktree is clean
* the existing warehouse worktree is unchanged
* unrelated Dex or ingestion work remains isolated
* no production deployment points at the new branch

Re-run these safety checks before every merge or deployment action.

---

# 4. Mandatory Preflight Audit

Before designing or modifying the system, inspect the real repository and production state.

## 4.1 Authority And Checkpoints

Locate and read all relevant:

* Founder Doctrine
* pricing contracts
* MEE contracts
* ingestion contracts
* canonical identity contracts
* migration policies
* scheduler contracts
* deployment documentation
* production checkpoints
* prior pricing audits
* failure reports
* rollback procedures
* checkpoint indexes

Summarize the binding invariants before implementation.

If this goal creates a new architecture, risk boundary, invariant, or reusable operational model, create or update the required pricing-domain checkpoint under:

```text
docs/checkpoints/pricing/
```

Maintain or create:

```text
docs/checkpoints/pricing/CHECKPOINT_INDEX.md
```

## 4.2 Repository Audit

Inspect the implementation paths for:

* TCGCSV acquisition
* artifact validation
* full warehouse ingestion
* current-price ingestion
* historical backfill
* market reference normalization
* canonical card mapping
* canonical printing mapping
* variant assignment
* evidence qualification
* publication and rollup logic
* pricing bridge functions and views
* legacy pricing reads
* MEE pricing reads
* detail and batch APIs
* Card Detail
* Search
* Explore
* Set grids
* Compare
* Vault totals
* public Vault
* private Vault
* market history
* Flutter/mobile
* timers
* systemd units
* cron jobs
* workers
* retry logic
* run ledgers
* telemetry
* operations notifications
* rollback mechanisms

Reconstruct the actual source-to-client execution path from code.

Do not infer behavior from file names.

## 4.3 Production Truth Audit

Using read-only access, capture:

* migration ledger
* schema objects
* table definitions
* indexes
* constraints
* triggers
* grants
* RLS policies
* function definitions
* view definitions
* materialized views
* dependencies
* timers
* systemd services
* active workers
* environment wiring
* API output
* current warehouse counts
* current historical progress
* mapping counts
* qualification counts
* publication counts
* bridge coverage
* stale rows
* variant blocks
* reconciliation failures
* current client behavior

Identify:

* local migrations absent from production
* production objects absent from migrations
* manually applied SQL
* candidate SQL
* untracked migration files
* edited applied migrations
* duplicate or overlapping migrations
* legacy/MEE contract conflicts
* overlapping schedulers
* disconnected source lanes
* non-resumable phases
* synthetic Grookai Value paths
* direct warehouse reads from product code
* inconsistent product pricing interfaces

Save durable readback artifacts according to repository convention.

Do not modify production during this audit.

---

# 5. Migration Integrity

Reconcile all local, remote, manually applied, candidate, and untracked pricing migrations before adding new schema.

Rules:

* Never edit an applied migration.
* Never renumber an applied migration.
* Never silently replace production SQL.
* Convert unapplied candidate SQL into ordered immutable migrations.
* For manually applied production SQL, create repository migrations that reproduce the exact intended object state.
* Verify semantic equivalence between repository migrations and live objects.
* Resolve duplicate object ownership across migrations.
* Ensure a zero-state database can rebuild the complete pricing architecture from committed migrations.
* Ensure production migration history can advance without replaying already-applied effects.
* Preserve historical evidence.

Capture a permanent baseline containing:

* migration ledger
* pricing schema
* grants
* RLS
* functions
* views
* indexes
* dependencies
* production equivalence proof

Run migration replay in an isolated environment before production application.

Add automated checks for migration drift where repository conventions permit.

---

# 6. Production V1 Scope

## Included

* Pokémon
* English language
* raw singles
* exact canonical card mapping
* exact canonical printing mapping
* exact child finish
* TCGPlayer `marketPrice`
* USD
* current pricing
* daily market history where available
* deterministic publication
* shared web and mobile pricing contract

## Excluded And Quarantined

* proprietary Grookai Value
* blended valuation
* inferred valuation
* parent fallback pricing as an exact printing
* inferred children
* ambiguous children
* special variants not exactly mapped
* stamps
* unusual promos
* error cards
* slabs
* graded cards
* sealed products
* code cards
* non-English cards
* Japanese cards
* other TCGs
* eBay active asks as market close
* interpolated history
* blended history
* unsupported currency conversion

These exclusions must remain visible in deterministic classification and quarantine reporting rather than disappearing silently.

Planned future boundaries:

* V1.1: English special variants
* V1.2: Japanese cards
* V2: other TCGs

Do not implement these later lanes as part of this goal.

---

# 7. Governed Pricing Data Model

Preserve the complete TCGCSV warehouse as the source archive.

Product clients, product APIs, and UI code must never query raw warehouse tables directly.

Implement or reconcile the following governed objects using repository naming and schema conventions.

## 7.1 `market_price_qualification_decisions`

Create an append-only qualification-decision record for every evaluated source observation.

Each decision must preserve enough information to reproduce and explain the outcome, including:

* immutable decision ID
* source provider
* source artifact identity
* source artifact date
* source artifact hash
* source row identity
* source row hash
* TCGPlayer product ID
* subtype or finish identity
* canonical card identity
* canonical printing identity
* candidate mapping identity
* variant-assignment identity
* mapping method
* mapping confidence where already part of system contracts
* language result
* finish result
* source-integrity result
* duplicate-product result
* freshness result
* observed timestamp
* evaluated timestamp
* policy version
* eligibility
* publication lane
* deterministic rejection reasons
* run ID
* phase ID
* code or migration version when repository convention supports it

A decision is never updated to rewrite historical reasoning.

Re-evaluation creates a new decision.

## 7.2 `market_price_publication_snapshots`

Create immutable publication snapshots for eligible prices.

Each snapshot must reference:

* exact TCGCSV daily source row
* source artifact
* normalized candidate
* source mapping
* variant assignment
* qualification decision
* canonical card
* canonical printing
* run
* policy version
* snapshot schema version

Store:

* `marketPrice` as the headline market close
* nullable low price
* nullable mid price
* nullable high price
* nullable direct-low price
* currency
* observed timestamp
* qualified timestamp
* published timestamp
* freshness state
* publication state
* provenance identifier

Supporting metrics must come from the same source record as the headline.

A publication snapshot must never be updated in place.

Any replacement, correction, suppression, or republishing creates a new immutable snapshot or explicit successor state according to the final contract.

Historical evidence must not be deleted.

## 7.3 Current Read View

Implement:

```text
v_market_price_current_v1
```

Contract:

* at most one current eligible snapshot per canonical printing
* deterministic tie-breaking
* stale suppression overrides prior eligibility
* no cross-printing fallback
* no cross-finish fallback
* no language fallback
* no blended headline
* no direct warehouse dependency from clients
* only snapshots from fully reconciled published runs are eligible

## 7.4 History View

Implement:

```text
v_market_price_history_v1
```

Contract:

* daily TCGPlayer `marketPrice` observations only
* exact canonical printing
* no interpolation
* no blended median
* no inferred missing days
* no supporting metric substituted for missing `marketPrice`
* deterministic duplicate-day handling
* immutable provenance for every point

## 7.5 Database Read Interface

Implement:

```text
get_market_pricing_read_model_v1
```

This is the only database pricing interface consumed by product APIs.

No product route or client may derive pricing independently.

The function must support detail and batch reads without changing semantics.

Lock grants and RLS so:

* product roles can read only the intended interface
* service roles can perform governed writes
* ordinary authenticated or anonymous clients cannot mutate qualification or publication data
* raw source archive exposure does not expand accidentally

---

# 8. Qualification And Publication Policy

Create an explicit versioned publication policy.

Use a clear identifier such as:

```text
MEE_MARKET_CLOSE_POLICY_V1
```

The exact identifier may follow repository conventions, but it must be durable and queryable.

A source observation is eligible only when every requirement is satisfied:

* category is Pokémon
* language is English
* object is a single card
* exact canonical card exists
* exact canonical printing exists
* variant assignment is `exact_child_finish`
* exactly one unambiguous active source mapping exists
* source product and subtype are not duplicated ambiguously
* `marketPrice` is present
* `marketPrice` is positive
* currency is USD
* source structure passed validation
* source row integrity passed
* observation age is no greater than 36 hours
* no unresolved mapping issue exists
* no unresolved language issue exists
* no unresolved finish issue exists
* no unresolved duplicate-product issue exists
* no unresolved source-integrity issue exists
* source run reconciled successfully

Quarantine:

* special variants
* inferred children
* parent fallback mappings
* slabs
* sealed products
* code cards
* non-English cards
* ambiguous mappings
* conflicting active source mappings
* missing market price
* invalid or non-positive market price
* unsupported currency
* malformed source rows
* unresolved duplicate products
* failed integrity checks

Freshness:

* `0–36 hours`: eligible when all other rules pass
* `>36–72 hours`: internally delayed and excluded from product reads
* `>72 hours`: `suppressed_stale`

Stale suppression has precedence over prior eligibility.

A previously published value must disappear from current product reads when its freshness policy no longer passes.

Low, mid, high, and direct-low prices are supporting metrics only.

They must never:

* alter `market_close`
* replace missing `marketPrice`
* be averaged into the headline
* determine Grookai Value
* be combined with eBay asks

eBay active asks remain a separately labeled listing signal.

---

# 9. Retire Grookai Value From Production V1

Audit all backend, API, web, and Flutter references to:

* `Grookai Value`
* `Grookai Value · Raw`
* `Evidence-anchored Grookai Value`
* synthetic reference-anchored value candidates
* review-ready multi-source requirements used to produce Grookai Value
* blended price presentation
* valuation labels that imply proprietary pricing

Remove these from the Production V1 product path.

Do not delete historical evidence.

Where safe and consistent with existing contracts:

* preserve old records for audit
* mark legacy paths inactive for V1
* prevent legacy jobs from republishing synthetic values
* prevent clients from consuming legacy valuation surfaces
* document superseded objects
* avoid destructive cleanup unless separately required for correctness

The product-facing label is:

```text
TCGPlayer Market
```

Do not rename the TCGPlayer close as Grookai Value.

---

# 10. Durable Current-Price Pipeline

Replace fragmented current-price orchestration with one governed, resumable stage machine:

```text
discover artifact
→ download
→ verify hash and structure
→ stage
→ warehouse upsert
→ reconcile
→ map
→ qualify
→ publish atomically
→ verify read model
→ verify API
```

Use existing reliable infrastructure where possible.

Do not rewrite stable ingestion code solely for style.

## 10.1 Durable Run Model

Persist durable run and phase records.

Each phase must record:

* run ID
* source date
* artifact identity
* artifact hash
* phase name
* attempt
* state
* started timestamp
* completed timestamp
* input counts
* output counts
* reconciliation counts
* error classification
* resumability data
* code version where available

Required phase behavior:

* completed phases are not repeated after restart
* failed phases can resume safely
* reruns are idempotent
* duplicate source rows are not created
* publication cannot start from unreconciled inputs
* a failed publication does not partially replace the current read set

Use idempotency keys based on:

* source date
* artifact hash
* product ID
* subtype or exact source-row identity

## 10.2 Acquisition

External acquisition:

* retries up to three times
* bounded backoff
* partial downloads are not accepted
* malformed artifacts are quarantined
* hash and structure must be verified
* previously verified artifacts may be reused safely
* acquisition failure must not erase valid recent published pricing

## 10.3 Reconciliation

Before publication, reconcile:

* discovered source rows
* staged rows
* warehouse upserts
* classified rows
* mapped rows
* quarantined rows
* excluded rows
* qualification decisions
* eligible rows
* publication snapshots

Every source product must end in exactly one deterministic top-level result:

* mapped/evaluated
* quarantined
* explicitly excluded

Stop publication on:

* unexplained count mismatch
* duplicate integrity failure
* schema mismatch
* mapping-integrity failure
* source-integrity failure
* missing required phase state

## 10.4 Atomic Publication

Publish a run atomically only after all required phase counts reconcile.

A reader must see either:

* the previously valid complete publication set, or
* the newly verified complete publication set

A reader must never see a partial run.

Rollback restores the previously valid published snapshot set.

Rollback must not fabricate or republish evidence as if newly observed.

## 10.5 Current And Historical Separation

Current-price ingestion must operate independently from historical backfill.

Historical completion is not a launch requirement.

Historical work:

* runs at lower priority
* yields during the current-price window
* cannot block current publication
* cannot mutate current publication semantics
* uses separate durable run identity where appropriate

---

# 11. Scheduling And Operations

Schedule the current-price lane daily at:

```text
08:15 UTC
```

Audit and reconcile all existing:

* systemd timers
* services
* cron jobs
* scheduler definitions
* duplicate workers
* legacy MEE jobs
* TCGCSV jobs
* refresh jobs
* deployment installers

End state:

* one authoritative current-price schedule
* no overlapping current-price publishers
* no duplicate acquisition caused by legacy timers
* historical work remains separately governed
* systemd definitions and repository deployment files agree
* timer installation is deterministic and replayable

Do not disable a production job until replacement behavior is verified in shadow mode or another safe transition is proven.

Add:

* systemd `OnFailure` handling
* required generic operations webhook
* durable failure notification
* runbook references
* enough context in alerts to locate the run and failed phase

Production readiness fails when no human notification route is configured.

Never commit secrets or webhook credentials.

Use environment/configuration conventions already present in the repository.

---

# 12. Operations Telemetry

Add durable telemetry and queries for:

* source rows
* staged rows
* warehouse upserts
* mapped rows
* unmapped rows
* eligible rows
* quarantines by reason
* explicit exclusions by reason
* published rows
* stale suppressions
* delayed rows
* retries
* failed phases
* run duration
* phase duration
* current publication age
* API availability
* API latency
* read-model count
* detail/batch parity
* provenance failures

Monitoring must prove more than ingestion volume.

It must be possible to verify:

```text
source row
→ mapping
→ qualification
→ snapshot
→ read model
→ API
→ client
```

Create a GV-ID/provenance diagnostic lookup that returns each stage for a specific published printing.

Do not expose sensitive internal details to ordinary public clients.

---

# 13. Shared Pricing API Contract

Expose one versioned pricing contract through detail and batch routes.

Use existing API route conventions and authentication architecture.

Contract:

```text
printing_gv_id
status
unavailable_reason
currency
market_close:
  amount
  source: tcgplayer
  label: TCGPlayer Market
  observed_at
  published_at
  freshness
supporting_market:
  low
  mid
  high
  direct_low
available_today:
  eBay active ask data, separately labeled
provenance_id
```

The exact serialization style may follow repository conventions, but the semantic contract must remain unchanged.

Requirements:

* exact-printing requests return only that printing’s price
* no sibling-finish contamination
* no language fallback
* no parent fallback represented as exact
* supporting metrics cannot change `market_close`
* eBay active asks cannot change `market_close`
* unavailable results return deterministic reasons
* detail and batch routes return semantically identical data
* breaking changes require a new versioned endpoint or contract version

## 13.1 Parent Summary Rules

A parent card with exactly one eligible printing may expose that printing directly with explicit printing identity.

A parent with multiple eligible printings returns:

* a clearly labeled `From` amount
* eligible-printing count
* no invented blended price

Define:

```text
From = minimum current eligible TCGPlayer Market amount among the parent’s eligible exact printings.
```

Do not include quarantined, stale, unsupported, or ineligible printings in this minimum.

## 13.2 Vault Rules

Vault values and totals:

* use exact eligible printing values only
* exclude holdings without an exact variant
* report missing pricing coverage
* never guess a finish
* never use parent minimum as an exact holding value
* never substitute eBay asks
* never substitute supporting metrics

---

# 14. Product Surface Migration

Migrate every supported pricing surface to the shared versioned backend contract.

Required surfaces:

* web Card Detail
* Search
* Explore
* Set grids
* Compare
* private Vault
* public Vault
* Vault item values
* Vault totals
* market-history page
* Flutter/mobile Card Detail
* Flutter/mobile search or grid surfaces
* Flutter/mobile Vault values and totals
* any other repository surface currently showing pricing

Audit for hidden or legacy pricing consumers.

No supported surface may:

* query the raw TCGCSV warehouse
* query legacy pricing tables directly
* recalculate headline pricing
* blend prices
* infer a printing price
* label TCGPlayer Market as Grookai Value
* implement its own freshness logic
* implement its own publication logic

Server-rendered Card Detail must not intentionally render a false empty state when safe pricing is available through the shared backend.

Preserve authentication and performance requirements while ensuring the initial and hydrated states do not disagree.

During canary:

* authenticated users may read the interface
* anonymous users remain gated

At public rollout:

* enable anonymous reads through the governed interface only
* preserve service-role-only writes
* verify public RLS and API exposure

---

# 15. Performance

Test expected production load.

Acceptance target:

```text
API p95 <= 500 ms
```

Measure detail and representative batch reads.

Add or adjust indexes only from measured query evidence.

Avoid N+1 reads across grid and Vault surfaces.

Batch routes must support the real client access patterns without weakening exact-printing semantics.

Record:

* query plans
* representative dataset size
* p50
* p95
* p99 where tooling supports it
* error rate
* batch size tested

---

# 16. Verification Matrix

Implement automated and operational verification covering all of the following.

## 16.1 Migration And Security

* zero-state migration replay
* upgrade-path replay
* schema parity
* function parity
* view parity
* grants
* RLS
* service-role-only writes
* ordinary client mutation denial
* no edited applied migrations
* production equivalence readback

## 16.2 Qualification

Success:

* exact canonical card
* exact canonical printing
* English
* exact child finish
* positive USD `marketPrice`
* fresh observation
* one unambiguous active mapping

Quarantine or exclusion:

* finish mismatch
* non-English
* inferred child
* parent fallback
* duplicate mapping
* stale row
* sealed product
* slab
* code card
* special variant
* missing market price
* zero or negative market price
* malformed row
* unsupported currency
* unresolved source integrity

## 16.3 Headline Integrity

Prove:

* low cannot change `market_close`
* mid cannot change `market_close`
* high cannot change `market_close`
* direct-low cannot change `market_close`
* eBay active asks cannot change `market_close`
* missing `marketPrice` cannot be replaced by another field
* market history uses only daily `marketPrice`

## 16.4 Durability

* idempotent rerun
* restart after each phase
* crash recovery
* partial download
* malformed artifact
* duplicate artifact
* same-date replacement artifact
* retry exhaustion
* atomic publication
* rollback
* prior valid publication survives provider failure
* historical worker yields during current-price window

## 16.5 API

* detail contract
* batch contract
* detail/batch parity
* unavailable reasons
* exact printing
* single-printing parent
* multi-printing `From`
* stale suppression
* provenance resolution
* authenticated canary access
* anonymous public rollout access
* no unauthorized writes
* API version stability

## 16.6 Product

* exact variant selection
* finish changes update displayed pricing correctly
* no price for unresolved variant
* `From` summary rendering
* Vault exclusions
* Vault totals
* missing coverage reporting
* history chart semantics
* server/client hydration parity
* web integration
* Flutter integration
* no Grookai Value labels
* no direct warehouse consumers

## 16.7 End-To-End Provenance

For every canary sample, prove:

```text
rendered amount
→ API payload
→ read-model row
→ publication snapshot
→ qualification decision
→ mapping
→ exact source row
→ artifact hash
```

Every rendered price must resolve to exactly one immutable publication snapshot and one immutable qualification decision.

---

# 17. Canary Dataset

Build a stratified 100-printing canary.

Include:

* modern cards
* vintage cards
* Pokémon
* Trainers
* promos that are ordinary exact-printing V1 candidates
* holo
* reverse holo
* non-holo where supported
* shared-number families
* low-value cards
* medium-value cards
* high-value cards
* cards with multiple eligible child finishes
* known mapping regressions
* Mightyena ex
* Arceus Charizard
* any repository-documented pricing regressions

Store the canary definition as a durable repository artifact.

For each canary printing record:

* canonical identity
* expected language
* expected finish
* source product identity
* expected publication state
* expected headline
* expected quarantine reason where intentionally negative
* provenance verification result
* visual/data verification result

Do not silently replace failed samples.

---

# 18. Rollout Gates

Execute rollout in this order.

## Gate 1: Shadow Publication

Run three consecutive shadow publication cycles.

Requirements:

* zero reconciliation mismatches
* no duplicate source rows
* no partial publication
* deterministic qualification counts
* deterministic quarantine reasons
* full provenance resolution
* no client exposure change

## Gate 2: Canary Verification

Image/data-verify the stratified 100-printing sample across eras, values, and ordinary finishes.

Requirements:

* zero wrong canonical cards
* zero wrong printings
* zero wrong finishes
* zero incorrect market-close fields
* complete provenance

## Gate 3: Signed-In 100-Printing Canary

Expose the verified 100 printings to authenticated collectors for 72 hours.

Requirements:

* shared API only
* telemetry active
* operations webhook active
* no stale displayed prices
* no broken provenance
* no unsupported anonymous exposure

## Gate 4: Signed-In Full Eligible V1

Expand all eligible V1 prices to authenticated collectors.

Run seven unattended daily cycles.

Requirements:

* every scheduled cycle completes after allowed retries
* no reconciliation mismatch
* zero wrong-printing prices
* zero stale displayed prices
* no broken provenance
* API p95 at or below 500 ms
* all required surfaces use the shared model

## Gate 5: Public Reads

Enable anonymous reads only when all public gates pass.

Requirements:

* zero wrong-printing prices
* zero stale displayed prices
* zero broken provenance chains
* every scheduled cycle completed successfully after allowed retries
* licensing, attribution, and display requirements are documented as confirmed
* public API/RLS security verified
* rollback tested
* human notification route active

Do not claim public readiness if source licensing or display rights remain unresolved.

A licensing uncertainty may block public rollout without blocking completion of the technical signed-in canary system.

---

# 19. Coverage Acceptance

Production V1 requires at least 95% exact mapping coverage.

Define the denominator as:

```text
All in-scope English Pokémon single-card source products in the current verified TCGCSV artifact that contain a usable positive USD TCGPlayer marketPrice and are not deterministically excluded by the approved V1 object-class rules.
```

Coverage numerator:

```text
Denominator rows that resolve to one exact canonical card, one exact canonical printing, one exact child finish, and one eligible or freshness-delayed qualification result without unresolved ambiguity.
```

Every denominator row not in the numerator must have a deterministic reason.

Report coverage by:

* set
* era
* finish
* value band
* mapped
* eligible
* delayed
* quarantined reason
* excluded reason

Do not manipulate the denominator to hide mapping gaps.

---

# 20. Runbooks

Create or update production runbooks for:

* current-price pipeline operation
* failed acquisition
* partial download
* malformed artifact
* source outage
* phase resume
* reconciliation mismatch
* mapping correction
* duplicate product resolution
* stale suppression
* publication rollback
* prior-snapshot restoration
* scheduler failure
* operations webhook failure
* API failure
* provenance lookup
* authenticated canary rollback
* public-read rollback
* historical worker coordination

Runbooks must include exact repository commands or verified operational procedures.

Do not include guessed commands.

---

# 21. Checkpoint Governance

Create a permanent pricing checkpoint capturing:

* context
* prior structural debt
* market-close decision
* reason TCGPlayer `marketPrice` remains authoritative
* rejection of proprietary Grookai Value in V1
* source-to-client architecture
* immutable qualification decisions
* immutable publication snapshots
* shared read-model boundary
* current/history separation
* exact-printing policy
* freshness policy
* quarantine boundaries
* operational stage machine
* rollout gates
* rollback semantics
* current truths
* invariants
* future extension boundaries
* alternatives rejected
* why this mattered

At minimum, preserve these invariants:

1. TCGPlayer `marketPrice` is the Production V1 market close.
2. Grookai Value does not exist in the V1 product path.
3. Supporting metrics cannot modify the market close.
4. eBay active asks cannot modify the market close.
5. Product clients cannot query the raw warehouse.
6. Product surfaces cannot implement independent pricing policy.
7. Exact printings never inherit sibling or parent pricing.
8. Stale data disappears according to policy.
9. Qualification decisions and publication snapshots remain immutable.
10. Ordinary exact V1 rows publish without manual microapproval.
11. Every displayed value has complete provenance.
12. Current pricing does not depend on historical completion.

Update the pricing checkpoint index.

---

# 22. Completion Standard

Do not mark this goal complete until every applicable requirement below is verified.

* The selectable goal option exists and loads this complete goal.
* The dirty warehouse worktree remains unchanged.
* The implementation worktree is cleanly isolated.
* Migration history is reconciled.
* Production schema has migration parity.
* The governed qualification-decision model exists.
* Immutable publication snapshots exist.
* Current and history views exist.
* The versioned database read model exists.
* The current-price pipeline is durable and resumable.
* Current and historical execution are operationally separated.
* One authoritative current-price schedule exists.
* Operations telemetry exists.
* Human failure notification exists.
* The detail and batch API contract exists.
* All supported web and Flutter surfaces consume the shared interface.
* Grookai Value labels and synthetic V1 product paths are removed.
* Exact-printing and freshness rules are enforced.
* Supporting metrics and eBay asks cannot alter market close.
* Migration, security, durability, API, product, provenance, and performance tests pass.
* Three shadow cycles pass.
* The 100-printing canary passes.
* The authenticated 72-hour canary passes.
* Seven unattended full eligible V1 cycles pass.
* Coverage is at least 95% under the fixed denominator.
* Every remaining gap has a deterministic reason.
* Runbooks are complete.
* Pricing checkpoints are complete.
* Public rollout gates pass before anonymous access is enabled.
* Source licensing, attribution, and display terms are documented before public rollout.

A partial backend, one working endpoint, one card-page price, or an incomplete rollout is not completion.

---

# 23. Execution Reporting

Maintain durable progress in repository artifacts according to existing conventions.

At the end, provide one final evidence-backed report containing:

* branch and worktree state
* base SHA
* commits created
* migrations added
* production objects reconciled
* legacy paths retired
* scheduler changes
* test results
* shadow-cycle results
* canary results
* seven-cycle results
* coverage metrics
* performance measurements
* security verification
* provenance examples
* surface-by-surface integration status
* runbook locations
* checkpoint locations
* deployment state
* public rollout state
* residual risks
* any genuinely blocked external dependency

Do not report success without command output, database readbacks, API evidence, and client verification.

Do not ask for micro-approvals.

Continue until the full Production V1 goal is complete or a legitimate blocked condition is proven.

```

### END CODEX
```
