# WAREHOUSE_CONTRACT_V1

Status: ACTIVE  
Type: System Contract  
Scope: Defines how external listing data (eBay) is ingested, stored, normalized, classified, and promoted into Grookai pricing.

---

## PURPOSE

This contract defines the warehouse model that replaces direct API querying.

The warehouse exists to:

- ingest listings once
- store them deterministically
- replay classification and pricing without new API calls
- decouple pricing from source availability
- preserve explainability and truth guarantees

---

## CORE PRINCIPLE

> Warehouse is not truth.  
> Observation layer is the truth gate.

---

## ARCHITECTURE LAYERS

### Layer 1 - Raw Listing Warehouse

Table concept: `warehouse_listings_raw`

Characteristics:

- immutable
- append-only
- stores full external payload
- source-stamped (`source = ebay`)
- includes:
  - `external_id`
  - `raw_payload` (`json`)
  - `observed_at` (timestamp of observation)
  - `ingested_at` (timestamp of ingestion)
  - `source_query_context` (optional)

Rules:

- never mutated
- only appended
- stores listing snapshots over time
- multiple rows for the same listing are allowed across time

### Layer 2 - Normalized Listing Layer

Table concept: `warehouse_listings_normalized`

Purpose:

- extract usable structured fields from raw layer

Fields:

- `external_id`
- `title`
- `price`
- `shipping`
- `currency`
- `condition_raw`
- `listing_type`
- `observed_at`
- `source`

Rules:

- derived only from raw layer
- deterministic transformation
- no classification
- no mapping
- reflects snapshot state, not current-only state

### Layer 3 - Classified Observation Layer

Existing system:

- `pricing_observations`

Purpose:

- apply Grookai logic

Fields include:

- `card_print_id`
- `mapping_status`
- `classification`
- `condition_bucket`
- `match_confidence`

Rules:

- ONLY this layer feeds pricing
- must enforce:
  - `accepted + mapped` only
- must reject:
  - slab in raw lane
  - wrong-set
  - weak identity

### Layer 4 - Pricing Surfaces

Purpose:

- produce:
  - market truth
  - comps
  - trust signals
  - projection inputs

Rules:

- must only consume accepted + mapped observations
- must never read raw or normalized layers directly

---

## DATA FLOW

```text
eBay -> raw warehouse -> normalized layer -> observation layer -> pricing
```

---

## INGESTION MODES

### 1. Targeted Ingestion

- single card
- vault-driven
- highest priority

### 2. Cohort Ingestion

- bounded group of related cards
- set subset / value subset / promo subset

### 3. Background Ingestion

Prioritized by:

- vault
- value
- usage

Rules:

- respects API limits

---

## BATCHING RULES

- ingestion must be batched
- batch size must respect API limits
- batches must be interruptible
- batches must not retry immediately
- failed batches must move forward, not loop

---

## DEDUPLICATION & SNAPSHOT RULES

### Core Rule

The warehouse stores listing snapshots, not static listing identities.

### Allowed Behavior

- multiple rows for the same (`source`, `external_id`) are allowed across time
- each row represents a distinct observation of that listing
- new rows should be inserted when the listing state changes, including:
  - price changes
  - shipping changes
  - title changes
  - condition text changes
  - listing status changes
  - time progression (periodic refresh)

### Prevented Behavior

- exact duplicate snapshots from the same observation event must not be inserted twice
- duplicate inserts caused by ingestion bugs must be prevented

### Practical Identity Model

A snapshot is uniquely defined by:

- `source`
- `external_id`
- `observed_at`

Optional enhancement (future):

- content hash of normalized fields to detect true duplicates

### Why This Rule Exists

- preserves price history over time
- captures seller repricing behavior
- enables future trend analysis
- avoids losing market signal by over-deduplication

---

## REPLAYABILITY RULE

System must support:

- re-running normalization
- re-running classification
- recomputing pricing

WITHOUT new API calls.

---

## RETENTION RULES

### V1

- retain all raw listings
- retain all normalized rows
- retain all observations

### Future

- time-based pruning
- archival layers
- compression strategies

---

## SOURCE ISOLATION RULE

- eBay data remains isolated in warehouse layers
- no external data directly enters pricing
- all data must pass through observation layer

---

## INVARIANTS

Must never be violated:

- warehouse != truth
- observation layer is required for pricing
- `accepted + mapped` only feeds pricing
- no direct pricing from raw or normalized layers
- no blending with reference lane
- no bypass of classifier

---

## FAILURE HANDLING

### Throttle (429)

- batch stops
- no partial ingestion corruption
- no retry loops
- next batch scheduled later

### Partial Batch Success

- commit successful rows
- skip failed rows
- do not rollback entire batch

---

## WHY THIS MATTERS

This contract ensures:

- pricing is deterministic
- data is reusable
- system is scalable
- truth remains explainable
- source volatility does not break pricing

---

## WHAT THIS CONTRACT DOES NOT DO

- does not define pricing formulas
- does not define slab pricing
- does not define reference lane behavior
- does not define UI behavior

---

## FUTURE EXTENSIONS

- multi-source ingestion (TCGPlayer, others)
- historical pricing curves
- volatility detection
- deduplication optimization
- retention pruning
- ingestion scheduling refinement

---

## RELATED CONTRACTS

- `PRICING_OBSERVATION_LAYER_V1`
- `PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL`
- `PRICING_CHECKPOINT_13_EBAY_WAREHOUSE_INGESTION_STRATEGY_V1`
