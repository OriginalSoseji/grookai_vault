# RLS_TRIAGE_CLASSIFICATION_V1

Date: 2026-03-04
Scope: PROD_HARDENING_V1_STEP3_1 (classification only; no policy/schema/grant changes)

## Inputs Used

- `docs/release/logs/STEP3_public_tables_no_rls_reachable.log`
- `docs/release/logs/STEP3_surface_inventory_grouped.csv`
- `docs/release/logs/STEP3_write_targets_rls.log`
- `docs/release/logs/STEP3_1_non_rls_columns.csv`

## Summary Counts

- Total non-RLS public tables reachable by `anon/authenticated`: **50**
- Bucket A (User-owned data): **2**
- Bucket B (System internal control-plane): **24**
- Bucket C (Reference/catalog read-only safe): **12**
- Bucket D (Legacy/unused/backup): **12**

## Classification Table

| Table | Bucket | Reason | App Reachable? | Direct Client Write? | Notes |
|---|---|---|---|---|---|
| `_import_card_prints` | D | Legacy import staging table; not referenced by current app surface | No | No | Legacy import artifact |
| `_import_sets` | D | Legacy set import staging table; not referenced by current app surface | No | No | Legacy import artifact |
| `ai_decision_logs` | B | Internal AI/mapping decision log table for pipeline operations | No | No | Control-plane telemetry |
| `app_settings` | B | System-wide control/config row; not per-user owned data | No | No | Control-plane config |
| `backup_card_prints_null_utc` | D | Backup table snapshot | No | No | Backup suffix/purpose |
| `card_embeddings` | B | Internal embedding index used by backend/ML processes | No | No | Pipeline internal data |
| `card_price_observations` | B | Internal price ingestion observations store | No | No | Pricing pipeline table |
| `card_price_rollups` | B | Internal aggregated price rollup output | No | No | Pricing pipeline table |
| `card_print_file_paths` | B | Internal file path normalization/promotions for prints | No | No | Ingestion/media pipeline |
| `card_print_price_curves` | B | Control-plane pricing curve data written by backend workers | Yes | No | Areas: backend_workers. Backend worker writes |
| `card_print_traits` | B | Control-plane enrichment traits written by backend workers | Yes | No | Areas: backend_workers. Backend worker writes |
| `card_printings` | C | Catalog/variant reference layer (finish mapping) | No | No | Reference finish surface |
| `card_prints_backup_20251115` | D | Backup table snapshot | No | No | Backup suffix/purpose |
| `condition_multipliers` | C | Lookup table for condition value multipliers | No | No | Reference lookup |
| `condition_prices` | C | Reference price surface by condition; not user-owned content | No | No | Read-oriented reference data |
| `dev_audit` | B | Internal developer/system audit event table | No | No | Control-plane telemetry |
| `ebay_accounts` | A | Per-user connected account + token material (`user_id`, token columns) | Yes | No | Areas: backend_workers;edge_functions. User-owned sensitive account linkage |
| `ebay_active_price_snapshots` | B | Internal marketplace snapshot pipeline output | Yes | No | Areas: backend_workers. Pricing worker output |
| `ebay_active_prices_latest` | B | Internal latest-price cache table for pipeline | Yes | No | Areas: backend_workers. Pricing worker output |
| `external_cache` | B | Internal provider response cache | No | No | Control-plane cache |
| `external_mappings` | B | Internal external-id mapping ledger | Yes | No | Areas: backend_workers. Mapping pipeline table |
| `external_printing_mappings` | B | Internal external mapping table for printings | No | No | Mapping pipeline table |
| `external_provider_stats` | B | Internal provider metric table | No | No | Control-plane telemetry |
| `finish_keys` | C | Reference lookup of allowed finish keys | No | No | Catalog lookup |
| `fx_daily` | C | Reference FX rates table | No | No | Read-only reference data |
| `graded_prices` | C | Reference graded pricing data | No | No | Read-oriented reference data |
| `has_currency` | D | Ephemeral/helper table shape (`exists` only); not app-referenced | No | No | Likely diagnostic leftover |
| `has_high` | D | Ephemeral/helper table shape (`exists` only); not app-referenced | No | No | Likely diagnostic leftover |
| `has_low` | D | Ephemeral/helper table shape (`exists` only); not app-referenced | No | No | Likely diagnostic leftover |
| `has_mid` | D | Ephemeral/helper table shape (`exists` only); not app-referenced | No | No | Likely diagnostic leftover |
| `has_source` | D | Ephemeral/helper table shape (`exists` only); not app-referenced | No | No | Likely diagnostic leftover |
| `import_image_errors` | B | Internal ingestion error log table | No | No | Pipeline diagnostics |
| `ingestion_jobs` | B | Control-plane job queue table | Yes | Yes | Areas: backend_workers;client_flutter. Client has direct write path (high risk) |
| `job_logs` | B | Control-plane job logging table | No | No | Pipeline diagnostics |
| `jobs` | B | Generic control-plane queue/scheduler table | No | No | Pipeline control surface |
| `mapping_conflicts` | B | Control-plane conflict review queue for mappings | Yes | No | Areas: backend_workers. Pipeline conflict handling |
| `premium_parallel_eligibility` | C | Contract/reference eligibility table for premium finishes | No | No | Reference contract table |
| `price_observations_backup_20251115` | D | Backup table snapshot | No | No | Backup suffix/purpose |
| `price_rollup_config` | C | Reference/config lookup for rollup strategy | No | No | Read-only config lookup |
| `price_sources` | C | Reference lookup of pricing sources | No | No | Catalog lookup |
| `pricing_jobs` | B | Control-plane pricing queue table | Yes | Yes | Areas: backend_workers;client_flutter;edge_functions. Client has direct write path (high risk) |
| `pricing_watch` | B | Control-plane scheduling/watch table for pricing jobs | No | No | Pipeline scheduler state |
| `raw_imports` | B | Control-plane raw ingestion payload staging | Yes | No | Areas: backend_workers. Backend ingestion writes |
| `set_code_classification` | C | Reference set-code mapping/classification lookup | No | No | Catalog lookup |
| `tcgdex_cards` | C | Reference/staging card catalog records from upstream | No | No | Catalog reference data |
| `tcgdex_set_audit` | B | Control-plane import audit table for set sync runs | No | No | Pipeline audit surface |
| `tcgdex_sets` | C | Reference/staging set catalog records from upstream | No | No | Catalog reference data |
| `user_card_images` | A | Per-user image metadata (`user_id`, `vault_item_id`) | No | No | User-owned content linkage |
| `user_card_photos` | D | Legacy/unused photo normalization surface; no current app references | No | No | Not present in current app surface inventory |
| `vault_items_backup_20251115` | D | Backup table snapshot (contains historical user vault rows) | No | No | Backup suffix/purpose |

## High-Risk Highlights

### Bucket A with RLS disabled (highest risk)

- `ebay_accounts` (app reachable via backend workers and edge functions; contains tokens and `user_id`)
- `user_card_images` (contains `user_id` and user image linkage metadata)

### Bucket B with direct client writes (control-plane risk)

- `ingestion_jobs` (`client_flutter` write path present)
- `pricing_jobs` (`client_flutter` write path present)

No remediation applied in this step.
