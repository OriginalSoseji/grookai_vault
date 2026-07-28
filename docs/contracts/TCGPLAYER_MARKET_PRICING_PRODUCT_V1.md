# TCGPlayer Market Pricing Product V1

**Status: ACTIVE - Production V1 governing contract**

## Purpose

Production V1 publishes source-grounded market pricing for ordinary English
Pokemon singles. It replaces the synthetic Grookai Value as the app-facing
headline price.

Historical MEE evidence, review, and projection contracts remain useful
internally. They do not authorize a public headline value.

## Product Definition

The headline value is the latest qualified TCGPlayer `marketPrice`.

Grookai does not modify, blend, nudge, average, or otherwise calculate this
headline. TCGPlayer low, mid, high, and direct-low values are supporting source
fields only. eBay active asks are a separate availability lane.

Production V1 is limited to:

- English Pokemon
- exact canonical parent mapping
- exact ordinary printing/finish mapping
- `normal`, `holo`, and `reverse` finish lanes
- USD
- a completed current TCGCSV source sync
- source evidence no older than 36 hours
- a positive TCGPlayer `marketPrice`

Special editions, ambiguous variants, sealed products, code cards, foreign
language printings, stale rows, and conflicting mappings are quarantined.

## Canonical Flow

```text
TCGCSV source artifact
  -> source product and daily price observation
  -> canonical parent mapping
  -> exact card-printing finish mapping
  -> deterministic qualification decision
  -> immutable publication snapshot
  -> shared pricing read model
  -> web and Flutter surfaces
```

Every displayed exact price must have a `provenance_id` that can be traced back
through this chain by service-role tooling.

## Storage

`market_price_qualification_decisions` is the append-only decision ledger.

`market_price_publication_snapshots` is the immutable published evidence
ledger. It stores source values without changing them.

Neither table owns canonical card identity, vault ownership, or modeled value.

## Shared Read Contract

All supported clients consume:

- `get_market_pricing_read_model_v1`
- `get_market_price_history_v1`
- `get_top_market_pricing_v1`

Service-role trace tooling consumes:

- `get_market_price_trace_v1`

Raw publication tables and internal views are not client-readable.

Every available row exposes both the source observation timestamp and immutable
publication timestamp. Exact-printing rows expose their printing identity and
provenance directly.

A parent with one eligible exact printing exposes that printing's identity,
close, observation timestamp, publication timestamp, and provenance. A parent
may show `From` only when more than one exact eligible printing is available.
The parent value is the deterministic minimum of those exact printing closes
and retains the selected minimum printing's identity, timestamps, and
provenance. It must be labeled `From TCGPlayer Market`, retain
`pricing_scope = parent`, and report the complete eligible-printing count.
Ranked discovery reads use the same parent-summary semantics and the
background-refreshed active-ask cache; they must not aggregate the raw listing
warehouse during a product request.

## Supported Product Surfaces

- card detail
- search and Explore
- set/card grids
- compare
- signed-in vault totals for raw-only groups
- market history
- Flutter card detail, grids, vault, compare, and discovery

Every surface must use the shared read contract. Compatibility field names may
exist at component boundaries, but they must carry `market_close`, not a
synthetic or active-ask value.

### Vault Exact-Printing Contract

Vault totals are the sum of current TCGPlayer Market values for each owned
eligible exact raw printing. Duplicate copies are priced independently, and
different finishes under the same parent card may contribute different exact
values.

A parent `From` amount is never an owned-card value and must not be multiplied
by quantity. A raw copy with an unresolved `card_printing_id`, no current
qualified exact price, or an identity mismatch remains unpriced. Slabs are
excluded from Production V1 Vault market totals because grade-specific pricing
is outside this contract.

Vault surfaces must expose priced and unpriced raw-copy coverage. Their pricing
timestamp is the latest immutable publication timestamp among the exact rows
included in the displayed total. Public Vault views follow the same exact-copy
rule and may read only ownership already authorized by the public sharing
boundary.

## Active Ask Boundary

eBay active asks:

- remain in an exact-printing lane
- may be labeled `Available Today`
- never replace or change TCGPlayer Market
- are not sold comparables
- are not a market close
- are withheld when exact variant assignment is unavailable

## Access And Rollout

Production V1 launches in this order:

1. service-role apply and readback
2. signed-in collector canary
3. short production observation window
4. public rollout only after explicit approval

The V1 RPCs are authenticated-only until the public rollout gate.

## Operational Contract

The governed pipeline is:

```text
tcgcsv current warehouse sync
  -> market publication worker
  -> health and reconciliation probe
```

Apply mode requires a clean tracked worktree and records the exact producing
commit SHA. The pipeline writes a frozen run plan, resumable phase state,
stdout/stderr logs, summaries, reconciliation, and artifact hashes.

Ordinary operation must not require manual row approval. Ambiguous rows are
quarantined by deterministic reason code and can be repaired as mapping policy
work without blocking eligible rows.

The authoritative current-price schedule runs the combined pipeline daily at
`08:15 UTC`. It holds both an operating-system lock and a PostgreSQL advisory
lock, retries only source/transport failures with the same durable run key, and
routes terminal failures through the required generic operations webhook.
The webhook must authenticate with a dedicated bearer secret, preserve an
append-only receipt, and route the exact alert through the service-owned
notification dispatcher to active founder devices. Operations alerts are not
card activity and must not require a card anchor.

The standalone TCGCSV current-sync timer may be retired only after combined
pipeline shadow verification. Historical backfill remains independently
governed and must continue to yield during the current-price window.

The signed-in canary observation window is evaluated by
`TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1`. The evaluator is read-only and
must prove:

- the activation run and every expected daily schedule slot use the frozen
  producing commit
- every run selects, maps, qualifies, snapshots, and traces the exact verified
  canary count
- no delayed, suppressed, quarantined, or excluded canary row appears
- no terminal pricing operations alert occurs inside the observation window
- current prices remain fresh, positive USD values with complete provenance
- authenticated runtime reads succeed and anonymous runtime reads remain denied
- rollback authority and a prior publication generation remain available

An incomplete time window is `observing`, not passed. A missing elapsed schedule
slot, broken trace, stale value, access-boundary regression, terminal alert, or
run mismatch fails the gate.

## Health Gates

Production health is critical when:

- the latest current source sync did not complete
- source evidence exceeds the freshness threshold
- current exact prices fall below the configured minimum
- eligible decisions do not reconcile to snapshots
- any source-to-publication trace is broken

No pipeline run is successful when reconciliation mismatches exist.

## Expansion Gates

The following are explicitly outside Production V1:

- English special variants
- Japanese pricing
- other TCGs
- slabs and grade-specific pricing
- proprietary Grookai valuation
- sold-comparable pricing
- public anonymous reads

Each expansion requires its own evidence contract and rollout gate.

## Coverage Contract

Production V1 coverage is governed by
`TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2`.

The denominator unit is one current TCGCSV source product/subtype price row.
It includes rows that:

- belong to Pokemon category `3`
- are active and current in the verified source artifact
- carry a positive USD `marketPrice`
- represent a supported ordinary V1 finish
- are not deterministically excluded object or V1.1 special-print lanes

Object and special-print scope is shared with publication through
`TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2`. The classifier separates:

- ordinary V1 single cards: `in_scope`
- sealed, packaged, accessory, and non-card products:
  `unsupported_product_kind`
- stamped, patterned, distribution, and other explicitly deferred print
  treatments: `special_variant_v1_1`

Packaging/object terms exclude a source product only when printed-number
evidence is absent. This prevents an ordinary numbered card such as
`Suspicious Food Tin` or `Box of Disaster` from being excluded merely because
its canonical name contains a packaging word. Explicit parenthetical
distribution labels and special-print markers remain V1.1 exclusions even
when a printed number is present.

V1.2 extends event/distribution evidence to year-qualified and otherwise
decorated markers inside a source suffix. For example, `(2014 Staff)` is a
special-print exclusion even though `(Staff)` was the only form recognized by
V1.1. Ordinary identity-bearing promo context such as
`(World Championships 2018)` or `(e-League)` is not excluded merely for
containing an event name. It requires separate visible source evidence such as
`Staff`, `Winner`, `Prerelease`, or `Stamped`.

Missing canonical mapping, identity, printed-number, or exact-finish evidence
does not remove a row from the denominator. Those are coverage gaps.

The numerator contains denominator rows that resolve to one exact canonical
card, one exact canonical printing, one exact child finish, and an eligible or
freshness-delayed qualification decision.

The minimum Production V1 threshold is `95%`. Every non-numerator denominator
row and every scope exclusion must retain a deterministic reason. Coverage must
be reported by source set, era, finish, and value band.

Coverage policy changes must be versioned and replayed over the same frozen
source population. Historical failed baselines remain permanent evidence.
Changing scope is permitted only to enforce the already-approved Product V1
boundary; it must not remove ordinary unmapped singles to manufacture a pass.

Broader rollout additionally requires every row in the active publication to
remain `in_scope` under the same active scope policy. Passing the aggregate
coverage percentage does not override an active-publication scope mismatch.

## Exact Mapping Repair Contract

Unmapped ordinary source products may enter a bounded mapping repair only
through `TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1` and
`TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1`.

The plan is read-only. A candidate requires:

- exact normalized name and collector number
- one governed set authority
- one active `pokemon_eng_standard` target identity
- no active source mapping
- no active TCGPlayer mapping on the target
- one-to-one source/target ownership
- Product Scope V1.2 eligibility

The apply command is registered under the canon-maintenance launcher, is
dry-run by default, and is limited to `25` mappings per execution. Apply mode
requires an exact candidate-artifact hash, a candidate plan that records a
clean tracked worktree, a separately pinned candidate-plan commit that is an
ancestor of the exact clean producing commit, the explicit maintenance
boundary, and a confirmation token. It revalidates source, target, observation,
identity, mapping, scope, and active-publication state inside a serializable
transaction.

Mapping repair inserts new `external_mappings` rows only. It does not update or
delete existing mappings and does not write publication, pricing, scheduler, or
customer state. Every inserted mapping must retain the plan hash, candidate
fingerprint, batch fingerprint, source run, method, confidence, producing
commit, candidate-plan commit, and rollback identity in its metadata and
permanent apply artifacts. A post-commit readback failure must still emit a
rollback manifest for the inserted mapping IDs.

## Performance Contract

Production V1 read performance is governed by
`TCGPLAYER_MARKET_PERFORMANCE_POLICY_V1`.

The exact shared RPC consumed by web and Flutter must be measured through the
production PostgREST endpoint for:

- one parent-card detail lookup
- representative parent-card grid batches
- one exact-printing detail lookup
- representative exact-printing batches

Every case must return the complete requested row count with zero request
errors. The maximum accepted p95 latency is `500 ms`. Measurements preserve
p50, p95, p99, response size, access mode, exact sample IDs, database execution
plans, and artifact hashes.

Service-role HTTP measurements prove the production transport and RPC runtime,
but they must not be described as end-user JWT measurements. A separate direct
database proof must execute the same RPC under the `authenticated` role.

The shared customer RPC must never aggregate the raw active-listing warehouse.
Exact-printing eBay active asks are maintained in
`mv_market_listing_active_ask_current_v1` by a separately governed refresh
phase. Refresh failures fail the activation pipeline closed, while shadow and
dry-run modes inspect the cache without changing it.
