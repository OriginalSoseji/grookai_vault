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

Parent rows may show `From` only when more than one exact eligible printing is
available. The parent value is the deterministic minimum of those exact
printing closes. It must be labeled `From TCGPlayer Market`.

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

The standalone TCGCSV current-sync timer may be retired only after combined
pipeline shadow verification. Historical backfill remains independently
governed and must continue to yield during the current-price window.

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
