# PRICING_SCHEMA_AUDIT_V1

## 1. SYSTEM OVERVIEW

This audit used:

- local Supabase Postgres running from this repo at `postgresql://postgres:postgres@127.0.0.1:54330/postgres`
- repository code under `backend/`, `supabase/functions/`, and `apps/web/src/lib/pricing/`

Read-only audit outcome:

- the current active Grookai pricing path is **eBay browse snapshots -> active price compatibility view -> Grookai Value views**
- the schema still contains older pricing lanes (`prices`, `condition_prices`, `graded_prices`, `market_prices`, `card_prices`, `card_price_ticks`, `card_price_observations`)
- local pricing data is currently empty, so live source-value contents are **UNVERIFIED from data** and must be classified from code and schema

Current active raw-value chain, proven by DB view definitions:

```text
ebay_active_price_snapshots
-> ebay_active_prices_latest
-> card_print_active_prices
-> v_grookai_value_v1 / v1_1 / v2
-> v_best_prices_all_gv_v1
-> web/public pricing consumers
```

## 2. TABLE INVENTORY

### Live SQL inventory

`information_schema.tables` for `ILIKE '%price%'` returned:

- `card_price_observations` — base table
- `card_price_rollups` — base table
- `card_price_ticks` — base table
- `card_prices` — base table
- `card_print_active_prices` — view
- `card_print_latest_price_curve` — view
- `card_print_price_curves` — base table
- `condition_prices` — base table
- `ebay_active_price_snapshots` — base table
- `ebay_active_prices_latest` — base table
- `graded_prices` — base table
- `latest_card_prices_v` — view
- `market_prices` — base table
- `price_observations` — base table
- `price_observations_backup_20251115` — base table
- `price_rollup_config` — base table
- `price_sources` — base table
- `prices` — base table
- `unmatched_price_rows` — base table
- `v_best_prices_all` — view
- `v_best_prices_all_gv_v1` — view
- `v_card_prices_usd` — view
- `v_latest_price` — view
- `v_latest_price_by_card` — view
- `v_latest_price_clean` — view
- `v_latest_price_pref` — view
- `v_latest_prices` — view

### Core active-path tables/views

#### `price_observations`

Columns:

- `print_id uuid`
- `condition text`
- `grade_agency text`
- `grade_value text`
- `grade_qualifier text`
- `source text`
- `listing_type text`
- `currency text`
- `price_usd numeric`
- `quantity integer`
- `observed_at timestamptz`
- `imported_at timestamptz`
- `marketplace_id text`
- `order_id text`
- `order_line_item_id text`
- `shipping_amount numeric`
- `seller_location text`
- `raw_payload jsonb`

Assessment:

- this is the most slab-capable raw observation table already present in schema
- it has grade dimensions
- it does **not** have `cert_number`
- it does **not** have `market_type`

#### `card_price_observations`

Columns:

- `card_print_id uuid`
- `source_id text`
- `observed_at timestamptz`
- `currency`
- `value numeric`
- `kind`
- `qty integer`
- `meta jsonb`

Assessment:

- normalized observation lane exists
- no explicit grader / grade / cert columns
- extensibility would have to go through `meta` or schema expansion

#### `card_print_price_curves`

Columns:

- `card_print_id uuid`
- per-condition medians/floors/samples:
  - `nm_*`
  - `lp_*`
  - `mp_*`
  - `hp_*`
  - `dmg_*`
- `confidence numeric`
- `listing_count integer`
- `raw_json jsonb`

Assessment:

- current canonical rollup table is **raw-condition oriented**
- no slab dimension
- no grader / grade / cert

#### `ebay_active_price_snapshots`

Columns:

- `card_print_id uuid`
- `source text`
- `captured_at timestamptz`
- `nm_floor`
- `nm_median`
- `lp_floor`
- `lp_median`
- `listing_count`
- `raw_sample_count_nm`
- `raw_sample_count_lp`

Assessment:

- active browse snapshot table is explicitly raw-NM/LP oriented
- no slab dimension

#### `ebay_active_prices_latest`

Columns:

- `card_print_id uuid`
- `source text`
- `nm_floor`
- `nm_median`
- `lp_floor`
- `lp_median`
- `listing_count`
- `confidence`
- `last_snapshot_at`
- `updated_at`

Assessment:

- this is the live compatibility table feeding `card_print_active_prices`
- raw-only price shape
- no slab dimension

#### `graded_prices`

Columns:

- `card_id uuid`
- `grade_company text`
- `grade_value numeric`
- `grade_label text`
- `market_price numeric`
- `last_sold_price numeric`
- `source text`
- `ts timestamptz`

Assessment:

- historical graded pricing lane exists
- keyed by `card_id`, not object or cert
- not used by current Grookai Value path

#### `condition_prices`

Columns:

- `card_id uuid`
- `condition_label text`
- `market_price numeric`
- `last_sold_price numeric`
- `source text`
- `ts timestamptz`

Assessment:

- older raw-condition lane still exists

#### `prices`

Columns:

- `card_id uuid`
- `ts timestamptz`
- `market_price numeric`
- `source text`
- `set_code text`
- `number text`
- `mapped_via text`
- `currency text`
- `name text`
- `image_url text`

Assessment:

- older base price lane still exists

### Row-count proof from local DB

Local counts are all zero for:

- `price_observations`
- `card_price_observations`
- `card_print_price_curves`
- `ebay_active_price_snapshots`
- `ebay_active_prices_latest`
- `price_sources`
- `pricing_jobs`

That means:

- data-backed source enumeration is **UNVERIFIED locally**
- schema and code-backed flow classification is still valid

## 3. DATA FLOW (RAW -> VALUE)

### Active browse pricing flow

Proven from code and view definitions:

1. [ebay_browse_prices_worker.mjs](../../backend/pricing/ebay_browse_prices_worker.mjs)
   - fetches active eBay browse listings
   - classifies listings into raw condition buckets (`nm`, `lp`, `mp`, `hp`, `dmg`)
   - computes medians/floors/confidence/listing count
   - writes:
     - `ebay_active_price_snapshots`
     - `ebay_active_prices_latest`
     - `card_print_price_curves`

2. `card_print_active_prices` view
   - joins `card_prints` to `ebay_active_prices_latest`
   - exposes `nm_floor`, `nm_median`, `lp_floor`, `lp_median`, `listing_count`, `confidence`

3. `v_grookai_value_v1 / v1_1 / v2`
   - derive a Grookai NM value from `card_print_active_prices`

4. `v_best_prices_all_gv_v1`
   - turns Grookai NM into the compatibility output shape:
     - `base_market`
     - `base_source`
     - `base_ts`
     - null graded / condition fields

5. Web/public consumers
   - [getPublicPricingByCardIds.ts](../../apps/web/src/lib/pricing/getPublicPricingByCardIds.ts)
   - reads:
     - `v_best_prices_all_gv_v1`
     - `card_print_active_prices`

### Legacy/parallel pricing flow

Still present in schema/code:

- `prices`
- `condition_prices`
- `graded_prices`
- `market_prices`
- `card_prices`
- `card_price_ticks`
- `latest_card_prices_v`
- `v_best_prices_all`
- `admin.import_prices_do` via:
  - [supabase/functions/import-prices/index.ts](../../supabase/functions/import-prices/index.ts)
  - [supabase/functions/import-prices-v3/index.ts](../../supabase/functions/import-prices-v3/index.ts)
  - [supabase/functions/import-prices-bridge/index.ts](../../supabase/functions/import-prices-bridge/index.ts)

Assessment:

- these lanes remain in repo and schema
- the current Grookai/public price path is not deriving from them directly
- `v_best_prices_all_gv_v1` is the compatibility bridge currently consumed by web and scheduler

## 4. VIEW DEPENDENCIES

### `card_print_active_prices`

Definition proves:

```text
card_prints
left join ebay_active_prices_latest
```

Fields surfaced:

- `source`
- `nm_floor`
- `nm_median`
- `lp_floor`
- `lp_median`
- `listing_count`
- `confidence`
- freshness timestamps

### `v_grookai_value_v1`

Definition proves:

- base table/view: `card_print_active_prices`
- only NM fields are used:
  - `nm_floor`
  - `nm_median`
  - `listing_count`
  - `confidence`
- derived logic:
  - `listing_count_eff`
  - `w_liquidity`
  - `conf_factor`
  - bounded `grookai_value_nm`

This is a **raw-NM value model**, not a general object-market model.

### `v_grookai_value_v1_1`

Adds:

- `effective_floor_nm`
- bounded floor guardrail at `nm_median * 0.70`
- `confidence_out`

Still raw-NM only.

### `v_grookai_value_v2`

Adds:

- `spread_ratio`
- `w_spread`
- `w_median`
- stronger floor/median spread weighting

Still raw-NM only.

### `v_best_prices_all_gv_v1`

Definition proves:

- source:
  - `card_print_active_prices`
  - `v_grookai_value_v1_1`
- output:
  - `base_market = grookai_value_nm`
  - `base_source = 'grookai.value.v1_1'`
  - `base_ts = last_snapshot_at/updated_at`
  - graded and condition fields returned as `NULL`

This is the current compatibility surface used by web/public code.

### `v_best_prices_all`

Definition proves it is a legacy compatibility union across:

- `prices` as base
- `condition_prices`
- `graded_prices`

It is not the current active Grookai Value source for web/public price display.

## 5. WORKER PIPELINES

### Active pricing workers

- [backend/pricing/ebay_browse_prices_worker.mjs](../../backend/pricing/ebay_browse_prices_worker.mjs)
  - fetches active eBay browse listings
  - condition-buckets raw cards
  - writes:
    - `ebay_active_price_snapshots`
    - `ebay_active_prices_latest`
    - `card_print_price_curves`

- [backend/pricing/pricing_scheduler_v1.mjs](../../backend/pricing/pricing_scheduler_v1.mjs)
  - reads:
    - `card_print_active_prices`
    - `v_best_prices_all_gv_v1`
    - `ebay_active_prices_latest`
    - `vault_item_instances`
    - `slab_certs`
    - `pricing_jobs`
  - prioritizes freshening based on:
    - listing count
    - active ownership activity
    - current Grookai value

- [backend/pricing/pricing_backfill_worker_v1.mjs](../../backend/pricing/pricing_backfill_worker_v1.mjs)
  - selects unpriced higher-rarity cards
  - uses:
    - `ebay_active_prices_latest`
    - `vault_item_instances`
    - `slab_certs`
    - `pricing_jobs`

- [backend/pricing/pricing_queue_worker.mjs](../../backend/pricing/pricing_queue_worker.mjs)
- [backend/pricing/pricing_job_runner_v1.mjs](../../backend/pricing/pricing_job_runner_v1.mjs)
  - queue execution for `pricing_jobs`

### Legacy / alternate ingestion workers

- [backend/ebay/ebay_self_orders_worker.mjs](../../backend/ebay/ebay_self_orders_worker.mjs)
  - inserts into `price_observations`
  - `print_id` intentionally remains `null`
  - source hard-coded to `ebay_self`
  - marked in file comments as a skeleton/future phase

- [backend/ebay/ebay_sellers_sync_worker.mjs](../../backend/ebay/ebay_sellers_sync_worker.mjs)
  - same general order-sync lineage

- [backend/pricing/import_prices_worker.mjs](../../backend/pricing/import_prices_worker.mjs)
- [backend/pricing/import_prices_bridge_smoke.mjs](../../backend/pricing/import_prices_bridge_smoke.mjs)
- [supabase/functions/import-prices*.ts](../../supabase/functions/import-prices/index.ts)
  - bridge into `admin.import_prices_do`

### Live request / consumer path

- [supabase/functions/pricing-live-request/index.ts](../../supabase/functions/pricing-live-request/index.ts)
  - reads:
    - `ebay_active_prices_latest`
    - `v_best_prices_all_gv_v1`
    - `vault_item_instances`
    - `slab_certs`
    - `pricing_jobs`
  - uses canonical ownership activity to decide refresh priority

- [apps/web/src/lib/pricing/getPublicPricingByCardIds.ts](../../apps/web/src/lib/pricing/getPublicPricingByCardIds.ts)
  - public web helper
  - reads:
    - `v_best_prices_all_gv_v1`
    - `card_print_active_prices`

## 6. EXTENSION ANALYSIS (SLAB READINESS)

### Existing components

- Raw price ingestion tables:
  - `price_observations`
  - `card_price_observations`
  - `prices`
  - `card_prices`
  - `card_price_ticks`

- Aggregation/storage layers:
  - `card_print_price_curves`
  - `ebay_active_price_snapshots`
  - `ebay_active_prices_latest`
  - `card_price_rollups`

- Derived views:
  - `card_print_active_prices`
  - `v_grookai_value_v1`
  - `v_grookai_value_v1_1`
  - `v_grookai_value_v2`
  - `v_best_prices_all_gv_v1`
  - `v_best_prices_all`

- Worker pipelines:
  - eBay browse active listing worker
  - pricing scheduler / queue / job runner / backfill
  - legacy import bridge
  - legacy eBay self-orders observation worker

### Partial / extensible

- Condition modeling:
  - strong in `card_print_price_curves`
  - active path currently only uses NM/LP in latest browse snapshots and only NM in Grookai Value views

- Source weighting:
  - present in `source`, `source_id`, `price_sources`, and Grookai view logic
  - not currently multi-source in live local data

- Confidence scoring:
  - present in:
    - `card_print_price_curves.confidence`
    - `ebay_active_prices_latest.confidence`
    - `card_print_active_prices.confidence`
    - Grookai Value views

### Missing for slab pricing

Explicitly absent from the active pricing chain:

- no `cert_number` in active pricing tables/views
- no `grader` / `grade` in:
  - `card_print_price_curves`
  - `ebay_active_price_snapshots`
  - `ebay_active_prices_latest`
  - `card_print_active_prices`
  - `v_grookai_value_v1*`
- no `market_type` dimension distinguishing raw vs slab
- no object-level or cert-level active-price table

Important nuance:

- `price_observations` already has:
  - `grade_agency`
  - `grade_value`
  - `grade_qualifier`
- `graded_prices` already has:
  - `grade_company`
  - `grade_value`
  - `grade_label`

So slab/graded dimensions exist in older or lower-level lanes, but **not** in the current active Grookai Value path.

## 7. RISKS

- The current Grookai Value model is tightly coupled to **raw NM/LP active listings**.
- Extending slab pricing directly into `ebay_active_prices_latest` without a dimension split would mix:
  - raw NM/LP
  - graded/slab markets
- `card_print_price_curves` assumes one condition curve per `card_print_id`, not per market/object subtype.
- `v_grookai_value_v1*` assumes:
  - one base active-price row per `card_print_id`
  - NM floor/median are the governing inputs
- `v_best_prices_all_gv_v1` nulls all graded fields today; current public compatibility assumes a single base market output.
- `price_sources` is empty locally, so older bridge/import lanes are not currently evidenced by live local data.
- `ebay_self_orders_worker.mjs` writes `print_id = null` into `price_observations`; that path is not ready to become canonical slab pricing without mapping work.

## 8. SAFE EXTENSION PLAN (NO IMPLEMENTATION)

### Safe extension points

1. Ingestion layer
   - exact file: [backend/pricing/ebay_browse_prices_worker.mjs](../../backend/pricing/ebay_browse_prices_worker.mjs)
   - current role: classify active listings into raw condition buckets
   - safe slab extension point:
     - branch slab/graded listings before raw condition aggregation
     - do not merge slab comps into raw NM/LP arrays

2. Raw normalized observation lane
   - exact table: `price_observations`
   - reason:
     - already carries `grade_agency`, `grade_value`, `grade_qualifier`
     - best existing place to capture slab/graded observation facts without overloading raw curve tables first
   - limitation:
     - no `cert_number`
     - no explicit `market_type`

3. Aggregate storage layer
   - exact current table: `card_print_price_curves`
   - reason:
     - current table is raw-condition specific
   - safe extension direction:
     - use a parallel slab aggregate lane rather than widening raw condition columns in place
     - otherwise raw and slab markets will collide at `card_print_id`

4. Active compatibility layer
   - exact tables/views:
     - `ebay_active_prices_latest`
     - `card_print_active_prices`
     - `v_grookai_value_v1*`
     - `v_best_prices_all_gv_v1`
   - safe extension direction:
     - branch slab pricing into a parallel compatibility/view lane
     - do not widen `v_grookai_value_v1` directly until market dimension semantics are explicit

5. Consumer layer
   - exact files:
     - [apps/web/src/lib/pricing/getPublicPricingByCardIds.ts](../../apps/web/src/lib/pricing/getPublicPricingByCardIds.ts)
     - [supabase/functions/pricing-live-request/index.ts](../../supabase/functions/pricing-live-request/index.ts)
   - safe extension direction:
     - keep current raw/base compatibility behavior stable
     - add explicit slab-aware price selection later rather than silently reusing raw `base_market`

### Recommended extension stance

Smallest safe slab-pricing direction, based on current architecture:

- keep the current raw Grookai Value chain intact
- add slab pricing as a **parallel market dimension**, not as extra meaning inside `nm_floor` / `nm_median`
- reuse `price_observations` for normalized graded observation capture where possible
- avoid duplicating the public compatibility lane until a distinct slab market output contract is defined

### Verified vs unverified notes

- Verified by live SQL:
  - table/view inventory
  - column shapes
  - Grookai Value view definitions
  - active-price compatibility chain
  - local row counts are zero

- Verified by code:
  - eBay browse worker is the active raw pricing writer
  - web/public pricing consumers read `v_best_prices_all_gv_v1` + `card_print_active_prices`
  - pricing queue/scheduler/backfill depend on canonical ownership activity

- Unverified from local data:
  - actual live `source` values in pricing tables
  - live sample payloads in price tables/views
  - production weighting behavior under real data
