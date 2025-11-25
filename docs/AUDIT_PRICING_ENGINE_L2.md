# Audit: Pricing Engine Layer (L2)

## 1. Overview
Grookai Vault already has several pricing-oriented tables (`price_observations`, `card_price_observations`, `card_price_rollups`, legacy `card_prices`/`price_ticks`) plus legacy RPCs (`admin.import_prices_do`) and Edge wrappers (`import-prices*`). However, only a single backend worker (`backend/ebay/ebay_self_orders_worker.mjs`) writes to pricing data, and it is a dry-run friendly skeleton that currently inserts unmapped rows. No pricing aggregates, Grookai Index contract, or UI consumers exist yet. This audit catalogs what is ready, what is partial, and what is missing before defining Pricing Index v1.

## 2. Pricing Schema Summary
- **`price_observations`** (`supabase/000_baseline_prod.sql`, `supabase/migrations/20251120120000_pricing_ebay_self_extension.sql`)
  - Columns: `id bigint PK`, `print_id uuid` (nullable), `condition text`, `grade_agency text`, `grade_value text`, `grade_qualifier text`, `source text NOT NULL`, `listing_type text`, `currency text DEFAULT 'USD'`, `price_usd numeric(12,2)`, `quantity integer`, `observed_at timestamptz NOT NULL`, `imported_at timestamptz DEFAULT now()`, `set_code text`, `number text`, `variant text`, `price_market/mid/low/high numeric`, plus marketplace metadata (`marketplace_id`, `order_id`, `order_line_item_id`, `shipping_amount numeric(12,2)`, `seller_location text`, `raw_payload jsonb`).
  - Constraints: checks on condition/grade_agency/listing_type/price_usd, unique key on `(print_id, condition, grade_agency, grade_value, source, observed_at)` from baseline, listing type constraint expanded to include uppercase eBay enums (migration 20251120120000), but `print_id` remains nullable.
  - Indexes: baseline created btree indexes on `(print_id, observed_at DESC)`, `(condition, grade_agency, grade_value)`, `(set_code, number, variant, observed_at DESC)`.
  - Supports multi-marketplace data via `marketplace_id`, `order_*`, `raw_payload`, but nothing populates them beyond the eBay skeleton.

- **`price_sources`** (`supabase/migrations/20251117004358_remote_schema.sql`, `20251120120000_pricing_ebay_self_extension.sql`)
  - Columns: `id text PRIMARY KEY`, `display_name text`, `is_active boolean DEFAULT true`.
  - Migration 20251120120000 upserts `('ebay_self','eBay - Self Sales',true)`. No other seed values are defined in repo; existing deployments may already contain `tcgplayer`, `cardmarket`, etc., but the repo provides no seed script.
  - Referenced by `card_price_observations.source_id` with FK enforcement; new pricing code should also reference it.

- **`card_price_observations`** (`supabase/migrations/20251117004358_remote_schema.sql`)
  - Columns: `id bigint PK`, `card_print_id uuid NOT NULL`, `source_id text NOT NULL REFERENCES price_sources(id)`, `observed_at timestamptz DEFAULT now()`, `currency price_currency DEFAULT 'USD'`, `value numeric(12,2)`, `kind price_kind`, `qty integer DEFAULT 1`, `meta jsonb`.
  - This is the destination for `admin.import_prices_do` and represents the legacy canonical feed for RPC-based imports.

- **Legacy price structures** (baseline schema)
  - `card_price_rollups`, `card_price_ticks`, `card_prices`, `prices`, `latest_card_prices_v`, `latest_card_prices_mv`, `v_card_prices_usd`, `price_rollup_config`, `card_price_ticks_id_seq`, etc. These tables/views assume `card_prices` rows from sources such as `tcgplayer`/`cardmarket`, with functions to refresh materialized views. No current backend worker writes to them.
  - `unmatched_price_rows` collects rejected rows from `admin.import_prices_do`.

- **`card_prints` identity fields** (`docs/GV_SCHEMA_CONTRACT_V1.md`)
  - Identity: `(set_id, number_plain, variant_key)` plus `print_identity_key`.
  - `external_ids` JSON stores per-source catalog IDs; `ai_metadata`, `card_print_traits`, and other metadata can assist future pricing intelligence (e.g., condition heuristics).

- **Missing schema elements for future analytics**
  - No tables/views for medians, rolling windows, volatility, floor price, or multi-source merging rules.
  - No currency conversion tables beyond enumerated `price_currency` enum.

## 3. Pricing Workers / Code Summary
- **`backend/ebay/ebay_self_orders_worker.mjs`** – *PARTIAL*  
  Skeleton worker that fetches orders via `EbayClient`, builds price observation payloads (including marketplace metadata), but inserts rows with `print_id: null` and bypasses any validation. Supports `--since/--limit/--dry-run`.

- **`backend/pricing/import_prices_worker.mjs`** – *LEGACY PLACEHOLDER*  
  Tunnel check hitting `card_prices` with a `select * limit 1`. No real pricing logic.

- **`backend/pricing/import_prices_bridge_smoke.mjs`** – *EXISTING DIAGNOSTIC*  
  CLI smoke test hitting the deployed Edge function `import-prices-bridge` with a dry-run payload.

- **Supabase Edge functions** (`supabase/functions/import-prices`, `import-prices-v3`, `import-prices-bridge`) – *LEGACY*  
  Each enforces bridge tokens and calls `admin.import_prices_do`. They are flagged with LEGACY NOTICE comments and primarily serve historical pipelines.

- **`admin.import_prices_do` RPC** (`supabase/migrations/20251118235959_import_prices_impl_v1.sql`) – *EXISTING*  
  Validates rows, requires `card_print_id`, ensures `source_id` exists in `price_sources`, writes to `card_price_observations`, and logs rejects to `unmatched_price_rows`.

- **No other backend helpers** currently manipulate pricing data; Pokemon/TCG workers explicitly state “no pricing fields touched.”

## 4. Existing vs Partial vs Missing
| Area | Status | Notes |
| --- | --- | --- |
| `price_observations` schema | EXISTING | Columns/indexes ready for multi-marketplace data; no ingestion pipeline populates it with canonical data. |
| `price_sources` entries | PARTIAL | Table exists with `ebay_self` upsert, but no seed values for other sources and no admin tooling. |
| `card_price_observations` + RPC | EXISTING | Ready for structured imports via `admin.import_prices_do`, but unused by eBay worker. |
| Price ingestion worker | PARTIAL | `ebay_self` worker fetches data but lacks mapping, validation, batching, or integration with RPCs/unmatched table. |
| Aggregations / Grookai Index | MISSING | No tables, views, or materialized computations for floor/median/trend; legacy `card_price_rollups` is unused. |
| Multi-source merge rules | MISSING | No code describes how to merge `ebay_self`, future `marketplace_self`, or `ebay_market`. |
| Condition/grading tiers | PARTIAL | `price_observations` has columns/constraints, but no logic enforces or derives them. |
| Currency handling | PARTIAL | `price_observations.currency` exists; no conversion tables or multi-currency strategy documented. |
| UI/API consumption | MISSING | No Flutter or API code reads pricing data; pricing remains backend-only. |

## 5. UI / API Expectations
- **Flutter app (`lib/**`)** – No references to “price”, “floor”, or “market” were found via repo search, implying the UI currently does not display pricing data.
- **Docs** – Roadmaps mention “Grookai Pricing Index” and “market pricing + alerts” (README roadmap), but no API contract is defined.
- **Expectation for Pricing Index v1** – Frontend will likely require aggregated metrics per `card_print` (floor, median, trend) plus metadata (sample sizes, confidence). No contract is in place, so the Pricing Index spec will need to define payloads and caching behavior from scratch.

## 6. Risks & Red Flags
- **Null `print_id` inserts** – `backend/ebay/ebay_self_orders_worker.mjs` writes `price_observations` without resolving `card_print_id`, which will invalidate future aggregates and violates the `card_print`-centric schema.
- **Source divergence** – There are *two* observation tables (`price_observations` and `card_price_observations`). The RPC populates the latter; the eBay worker writes to the former. Without a plan to consolidate, pricing logic may fragment.
- **Legacy tables clutter** – `card_prices`, `card_price_rollups`, `price_ticks`, and materialized views remain in schema but unused, risking confusion or accidental use. Their `source` constraints (only `tcgplayer`, `cardmarket`) clash with new marketplace plans.
- **No aggregation indexes/infra** – While `price_observations` has per-print indexes, the lack of time-series partitions or observed_at indexes for `card_price_observations` may hinder 30/90-day queries.
- **Missing `price_sources` catalog** – Without seeded entries or admin tooling, new sources (marketplace_self, ebay_market) might not be created consistently.
- **Outlier handling absent** – No schema or code tracks sample sizes, z-scores, or volatility; raw inserts could skew any future average/median calculations.
- **No UI safeguards** – Because the frontend ignores pricing, issues might go unnoticed until after the Pricing Index ships.

## 7. Safe Areas
- `price_observations` already stores marketplace metadata; new ingestion (including eBay) can safely write there once `print_id` is resolved and validation exists.
- `price_sources` table + FK on `card_price_observations` ensures each price row references a known source.
- `unmatched_price_rows` provides a logging surface for rejected payloads, making it safe to implement stricter validation.
- `admin.import_prices_do` enforces structure for RPC-based imports; once mapping is solved, eBay pipelines can reuse it instead of rolling custom inserts.
- Existing indexes on `price_observations` and `card_price_observations` can support time-series queries once data arrives; materialized views for `card_prices` could be repurposed.

## 8. Prerequisites for Pricing Index v1
1. **Decide on canonical storage**: unify on either `price_observations` or `card_price_observations` for raw sold listings, or define how both interact.
2. **Enforce `card_print_id` mapping**: block inserts (or route to `unmatched_price_rows`) when `print_id` is null; complete the eBay mapping layer first.
3. **Seed `price_sources`**: define IDs for `ebay_self`, `marketplace_self`, `ebay_market`, future partners, and add tooling to manage them.
4. **Ingestion contract**: specify required fields (condition, listing_type, currency, observed_at) and acceptable ranges; add unit tests/workers to enforce.
5. **Aggregation design**: decide how to compute 30-day floor, median, trend, volatility, confidence, condition tiers, and multi-source rules; identify whether new tables/materialized views are needed.
6. **Outlier filters & confidence**: design heuristics (min sample size, outlier rejection) and decide how to store supporting metrics (counts, pct_error).
7. **UI/API schema**: document the payload the app will consume (per-print pricing summary, historical trends) to ensure backend design supplies necessary fields.
8. **Legacy cleanup plan**: mark `card_prices`/`price_ticks`/`card_price_rollups` as legacy or adapt them to the new model to avoid regressions.

## 9. Final Recommendations
1. **Consolidate ingestion** – Route all new pricing data through a single validated path (preferably via `admin.import_prices_do` after it supports marketplace metadata) so observations land in one canonical table with non-null `card_print_id`.
2. **Implement mapping-first eBay pipeline** – Update the eBay worker to resolve prints before insert, storing failed matches in `unmatched_price_rows` and/or `mapping_conflicts`.
3. **Design Pricing Index schema** – Introduce tables/views for per-print aggregates (floor, median, trend, sample counts) backed by 30/90-day rolling windows and referencing `price_sources`.
4. **Document source taxonomy** – Publish a list of accepted sources (`ebay_self`, future `marketplace_self`, `ebay_market`, etc.) and required metadata (marketplace_id, listing_type) to prevent drift.
5. **Plan UI contract** – Coordinate with the Flutter team to define GraphQL/REST endpoints exposing the new Grookai Pricing Index so backend designs align with UI expectations.
6. **Monitor legacy data** – Either sunset or clearly label `card_prices`/`price_ticks` structures to avoid mixing them with new pipelines; create migration notes for eventual removal.
7. **Add analytics instrumentation** – Once ingestion stabilizes, add dashboards or Supabase views to monitor sample sizes, source mix, and null print_id counts to catch regressions early.
