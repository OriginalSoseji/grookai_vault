# Migration Healthcheck (2025-11-25)

Healthcheck scope: inventory local migrations, outline remote status checks, and document drift detection steps for canonical Supabase project `ycdxbpibncqcchqiihfz`. No schema changes or migrations were run.

## Phase 0 – Local Migration Inventory
Local files in `supabase/migrations/` (sorted):
- 20251109072935_import_prices_definer.sql
- 20251112143000_admin_import_runs.sql
- 20251115031000_sets_card_prints_contract_v1.sql
- 20251115040000_ai_ingestion_schema_v1.sql
- 20251115041500_card_print_traits_v1.sql
- 20251117004358_remote_schema.sql
- 20251117042207_remote_schema.sql
- 20251117042329_remote_schema.sql
- 20251117120000_allow_pokemonapi_image_source.sql
- 20251117123000_enrichment_hp_dex.sql
- 20251117124500_external_mappings_pokemonapi.sql
- 20251117130000_enrichment_types_rarity.sql
- 20251117133000_dedupe_card_print_traits.sql
- 20251118235959_import_prices_impl_v1.sql
- 20251120120000_pricing_ebay_self_extension.sql
- 20251120220749_remote_schema.sql
- 20251121030107_remote_schema.sql
- 20251121130000_mapping_conflicts_uuid_candidates.sql
- 20251122120000_price_sources_seed_gv_market.sql
- 20251122121000_price_index_aggregates_v1.sql
- 20251123_pricing_ebay_active_v1.sql
- 20251123090000_ebay_accounts_v1.sql
- 20251124010000_pricing_v3_snapshots.sql

## Phase 1 – Remote Migration Status (human-run commands)
Run in PowerShell (not executed here):
```powershell
cd C:\grookai_vault
supabase migration list
```

Interpretation guide for the output table:
- **Applied locally**: migration exists on your machine (`supabase/migrations`) and was applied in the local database.
- **Applied remotely**: migration exists and was applied in the remote Supabase project.
- **Local-only**: appears in files but not applied remotely → likely pending to push; verify intent.
- **Remote-only (ghost)**: applied remotely but missing in files → drift; must be repaired before new schema work.
- **Error/Pending**: indicates failed or incomplete migration; block new migrations until resolved.

Document the findings:
- Confirm every file above appears as applied both locally and remotely.
- Note any remote-only or local-only rows and resolve before further schema work.

## Phase 2 – Drift Check Plan
Recommended manual drift check (do not run unless verifying):
```powershell
cd C:\grookai_vault
supabase db pull      # optional schema comparison, no edits made here
supabase migration list
```

Actions based on results:
- If any migration is in `error` or `pending` → fix before creating new migrations.
- If remote-only entries exist → stop and repair (e.g., `supabase migration repair` or align files) before proceeding.
- No new migrations should be created until the list is fully clean.

## Status
- Local inventory captured.
- Remote status not executed here; follow commands above and record results before schema work.
