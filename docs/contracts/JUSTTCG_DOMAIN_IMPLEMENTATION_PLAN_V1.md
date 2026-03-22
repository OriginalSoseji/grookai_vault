# JUSTTCG_DOMAIN_IMPLEMENTATION_PLAN_V1

Status: ACTIVE  
Type: Implementation Plan (Post-Contract)  
Scope: Deterministic rollout of JUSTTCG_DOMAIN_CONTRACT_V1  
Precondition: L3 Audit COMPLETE + Contract LOCKED

---

# PURPOSE

Translate JUSTTCG_DOMAIN_CONTRACT_V1 into a **safe, replayable, zero-drift implementation plan**.

This plan enforces:

- no breakage of existing pricing lanes
- strict source isolation
- variant-aware ingestion
- phased rollout with verification gates

---

# GLOBAL RULES (MUST HOLD THROUGHOUT)

1. Do NOT modify existing pricing tables or views  
2. Do NOT merge JustTCG into Grookai Value in this phase  
3. Do NOT flatten variant data  
4. All writes must be replay-safe  
5. All steps must pass verification before proceeding  

---

# PHASE 0 — PREFLIGHT (VERIFY BEFORE BUILD)

## Objective

Confirm repo state matches audit assumptions.

## Tasks

- Verify `external_mappings` exists and includes JustTCG source
- Confirm uniqueness constraint: (source, external_id)
- Confirm pricing tables:
  - ebay_active_price_snapshots
  - ebay_active_prices_latest
  - card_print_active_prices
- Confirm no existing justtcg_* tables exist

## Verification Queries

```sql
-- confirm mapping source exists
SELECT DISTINCT source FROM external_mappings WHERE source ILIKE '%justtcg%';

-- check uniqueness
SELECT source, external_id, COUNT(*)
FROM external_mappings
GROUP BY source, external_id
HAVING COUNT(*) > 1;
```

## Gate

- No duplicate mappings
- No existing conflicting tables

---

# PHASE 1 — SCHEMA (SOURCE DOMAIN CREATION)

## Objective

Create isolated JustTCG domain tables (variant-aware)

## Tables (Conceptual)

### 1. justtcg_variants

Fields:

- variant_id (PK, external)
- card_print_id (FK)
- condition
- printing
- language (nullable)
- created_at

---

### 2. justtcg_variant_price_snapshots (append-only)

Fields:

- id (PK)
- variant_id
- card_print_id
- price
- avg_price
- price_change_24h
- price_change_7d
- fetched_at
- raw_payload (jsonb)

---

### 3. justtcg_variant_prices_latest (derived)

Fields:

- variant_id (PK)
- card_print_id
- condition
- printing
- price
- avg_price
- price_change_24h
- price_change_7d
- updated_at

## Constraints

- FK: card_print_id → card_prints.id
- UNIQUE: variant_id
- INDEX: card_print_id
- INDEX: (variant_id, fetched_at DESC)

## Verification

```sql
-- ensure tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'justtcg_%';

-- ensure FK integrity
SELECT COUNT(*)
FROM justtcg_variants v
LEFT JOIN card_prints c ON c.id = v.card_print_id
WHERE c.id IS NULL;
```

## Gate

- All tables created
- FK integrity holds
- No conflicts with existing schema

---

# PHASE 2 — INGESTION WORKER (DRY RUN FIRST)

## Objective

Build variant-aware ingestion pipeline using JustTCG bulk API

## Worker Behavior

### Input

- list of mapped JustTCG external_ids (from external_mappings)

### Flow

1. Batch external_ids (e.g. 50–100 per call)
2. Call JustTCG bulk endpoint
3. For each card:
   - iterate variants[]
   - extract:
     - variant_id
     - condition
     - printing
     - price fields
4. Resolve:
   - external_id → card_print_id
5. Prepare output:
   - variant rows
   - snapshot rows

## DRY RUN OUTPUT

Instead of DB writes:

- output JSON file:

```json
{
  "variants": [...],
  "snapshots": [...]
}
```

## Verification

- total variants > 0
- all variant_id unique
- all card_print_id resolved

## Gate

- Dry run passes
- No unresolved mappings
- No duplicate variant_ids

---

# PHASE 3 — APPLY INGESTION (WRITE MODE)

## Objective

Persist JustTCG data safely

## Writes

### Step 1 — Upsert variants

- insert if not exists
- do NOT overwrite existing identity fields

---

### Step 2 — Insert snapshots

- append-only
- no updates

---

### Step 3 — Build latest table

- derive latest per variant
- use MAX(fetched_at)

## Verification Queries

```sql
-- snapshot growth
SELECT COUNT(*) FROM justtcg_variant_price_snapshots;

-- latest integrity
SELECT COUNT(*) FROM justtcg_variant_prices_latest;

-- duplicates check
SELECT variant_id, COUNT(*)
FROM justtcg_variant_prices_latest
GROUP BY variant_id
HAVING COUNT(*) > 1;
```

## Gate

- snapshots populated
- latest table consistent
- no duplicates

---

# PHASE 4 — ISOLATION VALIDATION

## Objective

Ensure JustTCG domain does not leak

## Tests

- confirm no writes to:
  - ebay_* tables
  - card_print_active_prices
- confirm no joins in existing pricing views

## Verification

```sql
-- search dependencies
SELECT viewname, definition
FROM pg_views
WHERE definition ILIKE '%justtcg%';
```

## Gate

- zero references in existing views

---

# PHASE 5 — READ-ONLY EXPLORATION (SAFE)

## Objective

Expose JustTCG data internally for validation

## Allowed

- internal queries
- admin views
- comparison scripts

## Forbidden

- UI integration
- pricing replacement
- user exposure

---

# PHASE 6 — AGGREGATION PREP (NO MERGE)

## Objective

Prepare for future pricing integration

## Tasks

- compare:
  - eBay median vs JustTCG avg
- measure:
  - variance
  - gaps
- log:
  - divergence cases

## Output

- JUSTTCG_VS_EBAY_ANALYSIS.md

---

# PHASE 7 — FINAL VERIFICATION

## System must satisfy:

- variant dimension preserved
- source isolation intact
- no impact to existing pricing
- system runs without JustTCG

---

# ROLLBACK PLAN

If failure occurs:

1. stop ingestion worker
2. drop justtcg_* tables (safe, isolated)
3. no impact to core system

---

# SUCCESS DEFINITION

Implementation is complete when:

- JustTCG variant data exists in DB
- ingestion is replayable
- no system regressions occur
- aggregation remains unchanged

---

# NEXT PHASE (NOT INCLUDED)

JUSTTCG_AGGREGATION_LAYER_V1

---

# FINAL NOTE

This plan is intentionally conservative.

Speed is sacrificed for:

- correctness
- replayability
- zero drift

This ensures Grookai remains:

**source-independent, variant-aware, and architecturally stable**
