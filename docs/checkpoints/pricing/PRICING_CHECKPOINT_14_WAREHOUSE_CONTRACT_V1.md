# PRICING_CHECKPOINT_14_WAREHOUSE_CONTRACT_V1

## Severity
L3

---

## Date / Phase Context

Transition from direct eBay querying to warehouse-first ingestion strategy following repeated upstream throttling and the need for scalable, replayable data.

---

## What Problem This Solves

Direct API querying:

- is rate-limited and unreliable
- does not scale
- does not allow replay or historical analysis

Warehouse model:

- decouples pricing from API availability
- enables replayable classification
- preserves listing history

---

## Why Warehouse Was Necessary

- upstream `429` throttling blocks real-time calls
- pricing requires persistent data
- system needs deterministic inputs

---

## Architecture We Locked

4-layer model:

1. Raw warehouse (immutable snapshots)
2. Normalized listings
3. Observation layer (truth gate)
4. Pricing surfaces

---

## Snapshot Model Decision

- listings are stored as time-series snapshots
- same listing can appear multiple times over time
- changes in price or state create new rows
- exact duplicates are prevented

---

## Invariants We Locked

- warehouse is not truth
- observation layer is required
- `accepted + mapped` only feeds pricing
- no bypass of classifier
- no direct pricing from raw data

---

## Why This Matters

- preserves market history
- enables trend detection
- prevents data loss
- supports future analytics

---

## Alternatives Rejected

- direct API-only model
- storing only latest listing state
- deduplicating listings aggressively
- bypassing observation layer

---

## What Must Never Break

- snapshot-based storage
- observation layer gating
- pricing explainability
- separation of warehouse vs truth
