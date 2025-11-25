# Audit: Mapping Enforcement for price_observations (L2)

## 1. Overview
This audit takes stock of every schema element and code path that touches pricing data so we can safely enforce `card_print_id` on `price_observations`. Today, multiple tables (`price_observations`, `card_price_observations`, `unmatched_price_rows`) exist, and new eBay workers still write unmapped rows. The goal is to document where mapping belongs, which writers are partial or legacy, and what steps are needed before we flip the switch to “mapped-only” pricing ingestion.

## 2. Schema Summary
| Table | Purpose | Key Columns | Status |
| --- | --- | --- | --- |
| `public.price_observations` | Canonical raw marketplace sales table used by new pipelines. | `card_print_id uuid NULL`, `source text`, `listing_type`, `currency`, `price_usd`, `observed_at`, `marketplace_id`, `order_id`, `order_line_item_id`, `shipping_amount`, `seller_location`, `raw_payload`. Constraints on condition/grade/listing_type/price. | **CANONICAL** (target for future ingestion). Null `card_print_id` currently allowed. |
| `public.card_price_observations` | Table targeted by `admin.import_prices_do`; requires `card_print_id` + `source_id`. | `card_print_id uuid NOT NULL`, `source_id text NOT NULL`, `value numeric`, `observed_at`… | **LEGACY** (RPC path). No current worker writes to it after eBay pivot but still available. |
| `public.unmatched_price_rows` | Storage for rejects from `admin.import_prices_do`. | `raw_payload jsonb`, `reason text`, `created_at`. | **STAGING** (legacy path). Not used by eBay workers yet; ideal place to stage unmapped pricing events. |
| `price_*` rollup tables / views (`card_price_rollups`, `card_price_ticks`, etc.) | Legacy aggregated structures. | Various historical pricing metrics. | **LEGACY** (unused by new pipelines). |
| `price_aggregates_v1` (MV) | 30/90/365-day aggregates built from `price_observations`. | `card_print_id`, `window`, `sale_count`, `floor`, `median`, `mean`, `volatility`, `last_sale`. | **CANONICAL** aggregator for Pricing Index. Filters rows inside SQL. |
| `price_index_v1` (view) | Final Grookai Pricing Index per `card_print_id`. | `price`, `floor`, `volatility`, `confidence`, `window_used`, `sale_count`, `last_sale`. | **CANONICAL** view; depends on Mapped rows only. |

Observations:
- `price_observations.card_print_id` is nullable; current eBay workers intentionally insert nulls until mapping is wired.
- `card_price_observations` enforces mapping today but is part of the legacy RPC pipeline.
- `unmatched_price_rows` fits the “staging/unmapped” role but is only used by `admin.import_prices_do`.

## 3. Writers Summary
| Writer | File/Function | Mapping Behavior | Classification |
| --- | --- | --- | --- |
| eBay “self” smoke worker | `backend/ebay/ebay_self_orders_worker.mjs` | Writes directly to `price_observations` with `card_print_id = null`. No mapping. | **PARTIAL** (demo only). |
| Multi-seller sync worker | `backend/ebay/ebay_sellers_sync_worker.mjs` | Inserts into `price_observations`; warns when `card_print_id` is null but still allows it. No mapping yet. | **PARTIAL** (Phase 1). |
| Admin RPC | `supabase/migrations/20251118235959_import_prices_impl_v1.sql` (`admin.import_prices_do`) | Requires `_payload.card_print_id`, `_payload.source_id`. Inserts into `card_price_observations` and logs rejects to `unmatched_price_rows`. | **SAFE (legacy)** – already mapping-aware. |
| Edge functions `import-prices*` | `supabase/functions/import-prices/index.ts`, etc. | Call `admin.import_prices_do`, so same behavior as above. | **LEGACY SAFE**. |
| Any other backend workers | None found that mention `price_observations`. Pokemon/TCG workers explicitly say “no pricing fields touched”. | — | — |

Conclusion: only the two eBay workers write to `price_observations`, both currently allow null `card_print_id`. All other pricing ingestion paths target `card_price_observations` via the RPC. No other writers found.

## 4. Mapping Layer Touchpoints
- Pokemon/TCG pipelines (`pokemonapi_normalize_worker`, `tcgdex_normalize_worker`) resolve set/card IDs before writing to canonical tables; they rely on helper modules (`pokemonapi_mapping_helpers`, `ensureTcgdexMapping`) and use `mapping_conflicts` when ambiguous.
- `backend/ebay/ebay_tokens.mjs` + `ebay_*` workers currently **do not** perform mapping; they just store the raw order payload.
- `docs/AUDIT_EBAY_MAPPING_L2.md` already outlines the need for an eBay mapping helper (e.g., match listing IDs → `card_print_id`, log conflicts, stage unmatched data).
- Pattern for pricing: resolve external ID to `card_print_id`. If ambiguous/missing, send to a staging queue (`unmatched_price_rows` or a future eBay-specific queue) until resolved.

## 5. Pricing Index Implications
- `price_aggregates_v1` query explicitly filters `price_observations` rows where `card_print_id IS NOT NULL`, `price_usd IS NOT NULL`, and `observed_at IS NOT NULL`. So null `card_print_id` rows are ignored by the MV, meaning they never reach `price_index_v1`.
- `price_index_v1` selects from the MV, so it inherits the same assumption: only mapped rows matter.
- No documented source filtering beyond the window priority, so once rows are mapped (`card_print_id` set), they’re eligible regardless of `source` (ebay_self, future `gv_market`, etc.).

Implication: we can allow staging rows with null `card_print_id` as long as the Index layers ignore them. But we should aim to keep `price_observations` canonical by enforcing mapping at ingestion time.

## 6. Existing vs Partial vs Missing
| Area | Status | Notes |
| --- | --- | --- |
| Mapping helpers for Pokemon/TCG | EXISTING | Provide a template for resolution, conflict logging, unmatched handling. |
| Mapping helpers for eBay | MISSING | No helper exists yet; both eBay workers bypass mapping. |
| Staging area for unmapped pricing | PARTIAL | `unmatched_price_rows` exists, but eBay workers do not use it. |
| Worker enforcement (`card_print_id` non-null) | MISSING | Should log/warn today; need future blocking behavior. |
| Pricing Index filters | EXISTING | Already ignore null `card_print_id`. |
| Legacy RPC path (`card_price_observations`) | SAFE LEGACY | Already enforces mapping; can be kept for existing pipelines or retired later. |

## 7. Risks & Red Flags
- `price_observations` already contains rows with null `card_print_id` (from eBay workers). Enforcing a DB-level constraint now would fail unless existing data is cleaned/migrated.
- Multi-seller worker updates `last_sync_at` even if rows were unmapped (WRITE mode) – though we now warn loudly. A future enforcement step should block the insert and perhaps log to a staging table.
- Two parallel observation tables (price_observations vs card_price_observations) risk confusion. Enforcing in one but not the other could lead to inconsistent expectations.
- No staging table dedicated to eBay unmapped rows; `unmatched_price_rows` is tied to the RPC schema but could be reused once the columns are aligned.

## 8. Recommended Enforcement Strategy
1. **Worker-level enforcement (short-term)**  
   - Implement mapping resolution inside `ebay_sellers_sync_worker` (and eBay-self worker) using a dedicated helper.  
   - If mapping succeeds → insert into `price_observations`.  
   - If mapping fails → write to a “staging/unmatched” surface (`unmatched_price_rows` or a new `ebay_price_unmatched` table) and do **not** insert into the canonical table.
2. **Staging contract**  
   - Document where unmapped pricing data goes (similar to Pokemon raw_imports + mapping_conflicts).  
   - This gives us a place to queue manual reviews or automated remapping.
3. **Cleanup**  
   - Identify existing `price_observations` rows with null `card_print_id` (added by eBay worker).  
   - Either map them retroactively or remove them from canonical tables once a staging path exists.
4. **DB-level guard (later)**  
   - After workers enforce mapping and staging is in place, consider adding a constraint or trigger that blocks inserts into `price_observations` when `card_print_id` is null, except for legacy/whitelisted sources.  
   - Alternatively, enforce at the API layer and rely on indexes + queries to skip null rows.

## 9. Final Recommendations
- **Design & implement an eBay mapping helper** that resolves listing/item identifiers to `card_print_id` before ingestion, mirroring how Pokemon/TCG helpers work.
- **Introduce a staging queue** (reuse `unmatched_price_rows` or add an `ebay_unmatched_prices` table) for events that fail to map. Log conflicts there instead of canonical `price_observations`.
- **Update eBay workers** to:  
  - resolve mapping → insert only when `card_print_id` is set;  
  - otherwise log to staging and skip canonical insert;  
  - continue warning until mapping enforcement is fully rolled out.
- **Clean existing null `card_print_id` rows** in `price_observations` once the staging path is available.
- **Plan a phased DB constraint**: enforce at the application layer first; when the staging path + cleanup are done, add a NOT NULL constraint or a trigger to ensure canonical data stays mapped.
- **Document the contract** (update `docs/AUDIT_PRICING_ENGINE_L2.md` / `EBAY_SELLER_SYNC_V1.md`) so future work aligns with the “mapping before pricing” rule of the Pricing Index.
