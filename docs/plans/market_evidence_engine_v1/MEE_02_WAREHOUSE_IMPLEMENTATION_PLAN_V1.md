# MEE_02_WAREHOUSE_IMPLEMENTATION_PLAN_V1

## Status

Implementation plan only.

No migration was created. No database writes, provider calls, scraper jobs, or pricing rollups were executed.

## Purpose

Define the first implementation-ready shape for the Market Evidence Engine warehouse layer.

The goal is to make eBay pricing replayable without letting raw provider data become pricing truth.

## Governing Rules

This plan is subordinate to:

- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
- `docs/contracts/WAREHOUSE_CONTRACT_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_14_WAREHOUSE_CONTRACT_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_11_THREE_LANE_PRICING_MODEL.md`

Locked invariants:

- Market Truth remains eBay-only.
- Raw warehouse rows are not pricing truth.
- Normalized warehouse rows are not pricing truth.
- Only `pricing_observations` plus `classification = accepted` and `mapping_status = mapped` can feed market pricing.
- Reference providers remain separate.
- Projection remains separate.
- Broad backfill remains disabled unless explicitly approved.

## Current Runtime Observation

Current worker path:

- `backend/pricing/ebay_browse_prices_worker.mjs`

Current behavior:

1. Load `card_prints` context.
2. Build eBay Browse search query.
3. Fetch active listings.
4. Fetch item details per listing.
5. Classify listings.
6. Insert all classified rows into `pricing_observations`.
7. Read accepted mapped observations.
8. Compute bucketed price summary.
9. Write `ebay_active_price_snapshots`.
10. Upsert `ebay_active_prices_latest`.
11. Write legacy/curve snapshot.

Problem:

- Provider acquisition, raw evidence retention, normalization, classification, and rollup writes are coupled.
- If classifier logic changes later, old provider payloads cannot be replayed unless they were preserved inside `pricing_observations.raw_payload`.
- The system cannot cleanly prove "same raw evidence, new classifier result" without another provider call.

## Target Architecture

```text
eBay Browse
  -> market_evidence_raw_snapshots
  -> market_evidence_normalized_listings
  -> pricing_observations
  -> v_pricing_observations_accepted
  -> ebay_active_price_snapshots / ebay_active_prices_latest
  -> pricing UI / comps / trust
```

## Proposed Tables

### 1. `market_evidence_raw_snapshots`

Role:

- Append-only provider evidence storage.
- Stores source payload and fetch context.
- Does not classify.
- Does not map.
- Does not feed UI directly.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
source text not null,
source_object_id text not null,
source_object_type text not null default 'listing',
provider_marketplace text,
card_print_id_hint uuid null references public.card_prints(id) on delete set null,
pricing_job_id uuid null,
query_text text,
query_context jsonb not null default '{}'::jsonb,
raw_payload jsonb not null,
observed_at timestamptz not null,
ingested_at timestamptz not null default now(),
payload_hash text not null,
created_at timestamptz not null default now()
```

Required checks:

```sql
source in ('ebay')
source_object_type in ('listing', 'item_details', 'search_result')
```

Required indexes:

```sql
(source, source_object_id, observed_at)
(source, payload_hash)
(card_print_id_hint, observed_at desc)
(pricing_job_id)
```

Recommended uniqueness:

```sql
unique (source, source_object_id, observed_at, payload_hash)
```

Reason:

- Allows repeated snapshots for the same listing over time.
- Blocks exact duplicate ingestion of the same payload in the same observation event.

### 2. `market_evidence_normalized_listings`

Role:

- Deterministic projection from raw provider payloads.
- Extracts fields needed by the existing classifier.
- Does not classify.
- Does not map.
- Does not feed pricing UI directly.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
raw_snapshot_id uuid not null references public.market_evidence_raw_snapshots(id) on delete cascade,
source text not null,
source_object_id text not null,
card_print_id_hint uuid null references public.card_prints(id) on delete set null,
title text,
listing_url text,
price numeric not null default 0,
shipping numeric not null default 0,
currency text not null default 'USD',
condition_raw text,
listing_type text,
buying_options text[] not null default '{}',
item_specifics jsonb not null default '{}'::jsonb,
description_text text,
normalized_payload jsonb not null default '{}'::jsonb,
observed_at timestamptz not null,
normalized_at timestamptz not null default now(),
normalizer_version text not null
```

Required indexes:

```sql
(raw_snapshot_id)
(source, source_object_id, observed_at)
(card_print_id_hint, observed_at desc)
(normalizer_version)
```

Recommended uniqueness:

```sql
unique (raw_snapshot_id, normalizer_version)
```

Reason:

- Lets a later normalizer version re-project the same raw evidence without another provider call.

## Worker Split

### A. Acquisition Worker

Future file:

- `backend/pricing/market_evidence_ebay_acquire_worker_v1.mjs`

Responsibilities:

- Load card context.
- Build current eBay query using existing `buildSearchQueryForPrint`.
- Call eBay Browse under existing budget guard.
- Fetch item details where budget allows.
- Insert raw snapshots only.
- Stop immediately on 429 or budget exhaustion.

Must not:

- Insert `pricing_observations`.
- Write latest price tables.
- Classify listings.
- Display prices.

### B. Normalization Worker

Future file:

- `backend/pricing/market_evidence_normalize_ebay_v1.mjs`

Responsibilities:

- Read raw snapshots.
- Project listing fields into `market_evidence_normalized_listings`.
- Use deterministic parser version labels.
- Be replayable for a bounded raw snapshot set.

Must not:

- Classify.
- Map.
- Write `pricing_observations`.
- Fetch provider data.

### C. Observation Replay Worker

Future file:

- `backend/pricing/market_evidence_replay_observations_v1.mjs`

Responsibilities:

- Read normalized listings.
- Use existing classifier logic from `ebay_browse_prices_worker.mjs`.
- Insert rows into `pricing_observations`.
- Stamp replay metadata into `raw_payload`, including:
  - `market_evidence_raw_snapshot_id`
  - `market_evidence_normalized_listing_id`
  - `classifier_version`
  - `replay_run_id`

Must not:

- Fetch provider data.
- Write latest price tables directly.
- Treat normalized rows as accepted unless classifier says accepted and mapped.

### D. Rollup Worker

Future file:

- `backend/pricing/market_evidence_rollup_from_observations_v1.mjs`

Responsibilities:

- Read `v_pricing_observations_accepted`.
- Compute the same bucket summary currently computed after worker insert.
- Write `ebay_active_price_snapshots`, `ebay_active_prices_latest`, and compatible curve rows only after accepted observation proof passes.

Must not:

- Read raw warehouse tables directly.
- Read normalized warehouse tables directly.
- Blend JustTCG/reference/projection data.

## First Migration Boundary

Migration should be separate and explicit:

- `supabase/migrations/<timestamp>_market_evidence_warehouse_v1.sql`

This migration should only create:

- `market_evidence_raw_snapshots`
- `market_evidence_normalized_listings`
- RLS/service-role policies
- indexes
- read-only audit views

It should not:

- modify `pricing_observations`
- modify pricing UI views
- modify `card_prints`
- modify `external_mappings`
- modify latest price rollups
- insert rows
- backfill rows

## Required Audit Views

### `v_market_evidence_raw_snapshot_audit_v1`

Purpose:

- Count raw snapshots by source/date/card hint.

Fields:

```sql
source,
provider_marketplace,
card_print_id_hint,
observed_date,
snapshot_count,
distinct_source_object_count,
first_ingested_at,
last_ingested_at
```

### `v_market_evidence_normalization_audit_v1`

Purpose:

- Prove raw snapshots have or have not been normalized.

Fields:

```sql
source,
normalizer_version,
raw_snapshot_count,
normalized_listing_count,
missing_normalized_count
```

### `v_market_evidence_observation_replay_audit_v1`

Purpose:

- Prove normalized rows flowed into `pricing_observations` only through replay metadata.

Fields:

```sql
replay_run_id,
classifier_version,
source,
card_print_id,
total_observations,
accepted_mapped_count,
accepted_unmapped_violation_count,
rejected_count,
staged_count
```

## Proof Queries

### 1. No Raw Or Normalized Direct Pricing Consumers

```sql
select
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_table.relname as source_table
from pg_depend d
join pg_rewrite r on r.oid = d.objid
join pg_class dependent_view on dependent_view.oid = r.ev_class
join pg_namespace dependent_ns on dependent_ns.oid = dependent_view.relnamespace
join pg_class source_table on source_table.oid = d.refobjid
where source_table.relname in (
  'market_evidence_raw_snapshots',
  'market_evidence_normalized_listings'
)
and dependent_view.relname in (
  'v_card_pricing_ui_v1',
  'v_grookai_value_v1_clean',
  'v_justtcg_vs_ebay_pricing_v1',
  'v_best_prices_all_gv_v1'
);
```

Expected:

- `0 rows`

### 2. Accepted Observations Are Still Mapped

```sql
select count(*) as violations
from public.pricing_observations
where classification = 'accepted'
  and mapping_status <> 'mapped';
```

Expected:

- `0`

### 3. Warehouse Rows Do Not Claim Truth

```sql
select count(*) as violations
from public.market_evidence_normalized_listings
where normalized_payload ? 'classification'
   or normalized_payload ? 'mapping_status'
   or normalized_payload ? 'grookai_value'
   or normalized_payload ? 'market_truth';
```

Expected:

- `0`

### 4. Replay Rows Are Traceable

```sql
select count(*) as replay_rows_missing_trace
from public.pricing_observations
where source = 'ebay'
  and raw_payload ? 'market_evidence_replay_run_id'
  and not (
    raw_payload ? 'market_evidence_raw_snapshot_id'
    and raw_payload ? 'market_evidence_normalized_listing_id'
    and raw_payload ? 'classifier_version'
  );
```

Expected:

- `0`

### 5. No Broad Backfill By Default

Runtime proof should assert:

```text
PRICING_ENABLE_BROAD_BACKFILL != 1
```

unless an explicit founder-approved execution contract is present.

## Implementation Sequence

### MEE-02A: Migration Draft Only

Create a SQL migration draft and contract tests, but do not apply it.

Outputs:

- migration file
- contract test that verifies table names, constraints, policies, and no writes
- dry-run proof text

### MEE-02B: Normalizer Fixture Harness

Build local fixtures from existing eBay response shapes already present in worker code.

Outputs:

- fixture JSON
- deterministic normalization test
- no provider calls

### MEE-02C: Replay Harness

Extract classifier-compatible listing shape and replay it into in-memory observation records.

Outputs:

- no DB writes
- proof that accepted rows require `mapped`
- proof that raw/normalized lanes cannot bypass classifier

### MEE-02D: Controlled Migration Apply

Only after review/approval:

- apply schema-only migration
- no backfill
- no provider fetch
- no pricing rollup

### MEE-02E: Single-Card End-To-End Dry Run

Use one card:

- acquire dry-run or fixture
- normalize
- replay dry-run
- rollup dry-run

No production writes until separately approved.

## Explicit Non-Goals

This plan does not start:

- scraping
- free API provider integration
- PriceCharting ingestion
- TCGplayer ingestion
- JustTCG as market truth
- broad eBay backfill
- slab pricing
- marketplace pricing

## Decision

Proceed next with `MEE-02A`: migration draft and contract tests only.

Do not apply the migration until the user approves the exact migration scope and fingerprint.
