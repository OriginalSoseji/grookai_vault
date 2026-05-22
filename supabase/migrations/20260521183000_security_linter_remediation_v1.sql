-- SECURITY_LINTER_REMEDIATION_V1
-- Fixes Supabase dashboard security advisor errors:
-- - security_definer_view on app/public read views
-- - rls_disabled_in_public on public-schema helper, backup, scanner, slab, and pricing tables
--
-- This migration does not rewrite data.

begin;

-- Views should evaluate permissions/RLS as the querying role, not as owner.
alter view if exists public.v_wall_cards_v1 set (security_invoker = true);
alter view if exists public.v_grookai_value_v1_clean set (security_invoker = true);
alter view if exists public.v_wall_sections_v1 set (security_invoker = true);
alter view if exists public.v_justtcg_vs_ebay_classified_v1 set (security_invoker = true);
alter view if exists public.v_recently_added set (security_invoker = true);
alter view if exists public.v_card_stream_v1 set (security_invoker = true);
alter view if exists public.v_justtcg_vs_ebay_valid_v1 set (security_invoker = true);
alter view if exists public.v_justtcg_display_summary_v1 set (security_invoker = true);
alter view if exists public.v_section_cards_v1 set (security_invoker = true);
alter view if exists public.v_vault_items_web set (security_invoker = true);
alter view if exists public.v_card_contact_targets_v1 set (security_invoker = true);
alter view if exists public.v_grookai_value_v1_justtcg_bridge set (security_invoker = true);
alter view if exists public.v_best_prices_all_gv_v1 set (security_invoker = true);
alter view if exists public.v_card_pricing_ui_v1 set (security_invoker = true);
alter view if exists public.v_justtcg_vs_ebay_pricing_v1 set (security_invoker = true);
alter view if exists public.v_vault_items set (security_invoker = true);
alter view if exists public.v_vault_items_ext set (security_invoker = true);
alter view if exists public.v_card_print_cameos_public_v1 set (security_invoker = true);

-- Public-schema tables must have RLS enabled even when access is service-only.
alter table if exists public.me03_master_set_repair_v1_warehouse_candidates_backup_20260519 enable row level security;
alter table if exists public.card_fingerprint_index enable row level security;
alter table if exists public.scanner_fingerprint_index enable row level security;
alter table if exists public.contract_violations enable row level security;
alter table if exists public.slab_certs enable row level security;
alter table if exists public.slab_provenance_events enable row level security;
alter table if exists public.collapse_map_phase1 enable row level security;
alter table if exists public.quarantine_records enable row level security;
alter table if exists public.justtcg_variant_price_snapshots enable row level security;
alter table if exists public.justtcg_variants enable row level security;
alter table if exists public.justtcg_variant_prices_latest enable row level security;
alter table if exists public.justtcg_set_mappings enable row level security;
alter table if exists public.justtcg_identity_overrides enable row level security;
alter table if exists public.audit_card_image_backfill_v1_backup_20260520 enable row level security;
alter table if exists public.me03_master_set_repair_v1_card_prints_backup_20260519 enable row level security;
alter table if exists public.me03_master_set_repair_v1_external_mappings_backup_20260519 enable row level security;
alter table if exists public.me03_master_set_repair_v1_card_print_species_backup_20260519 enable row level security;

-- Backup and internal ledger tables should not be directly exposed through PostgREST.
-- Some historical backup tables are present remotely but not in a clean local replay,
-- so optional-table ACL work is guarded explicitly.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'me03_master_set_repair_v1_warehouse_candidates_backup_20260519',
    'audit_card_image_backfill_v1_backup_20260520',
    'me03_master_set_repair_v1_card_prints_backup_20260519',
    'me03_master_set_repair_v1_external_mappings_backup_20260519',
    'me03_master_set_repair_v1_card_print_species_backup_20260519',
    'contract_violations',
    'quarantine_records',
    'collapse_map_phase1',
    'justtcg_variant_price_snapshots',
    'justtcg_set_mappings',
    'justtcg_identity_overrides',
    'slab_provenance_events'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end $$;

-- Public/product read surfaces that are already consumed directly by app/web.
do $$
begin
  if to_regclass('public.slab_certs') is not null then
    grant select on table public.slab_certs to anon, authenticated;
    drop policy if exists "slab_certs public read" on public.slab_certs;
    create policy "slab_certs public read"
    on public.slab_certs
    for select
    to anon, authenticated
    using (true);
    comment on policy "slab_certs public read" on public.slab_certs is
      'SECURITY_LINTER_REMEDIATION_V1: slab identity is public catalog/provenance metadata used by public vault/card surfaces.';
  end if;

  if to_regclass('public.justtcg_variant_prices_latest') is not null then
    grant select on table public.justtcg_variant_prices_latest to anon, authenticated;
    drop policy if exists "justtcg_variant_prices_latest public read" on public.justtcg_variant_prices_latest;
    create policy "justtcg_variant_prices_latest public read"
    on public.justtcg_variant_prices_latest
    for select
    to anon, authenticated
    using (true);
    comment on policy "justtcg_variant_prices_latest public read" on public.justtcg_variant_prices_latest is
      'SECURITY_LINTER_REMEDIATION_V1: latest JustTCG price facts are public pricing read-model inputs.';
  end if;

  if to_regclass('public.justtcg_variants') is not null then
    grant select on table public.justtcg_variants to anon, authenticated;
    drop policy if exists "justtcg_variants public read" on public.justtcg_variants;
    create policy "justtcg_variants public read"
    on public.justtcg_variants
    for select
    to anon, authenticated
    using (true);
    comment on policy "justtcg_variants public read" on public.justtcg_variants is
      'SECURITY_LINTER_REMEDIATION_V1: JustTCG variant facts are public pricing read-model inputs.';
  end if;

  if to_regclass('public.card_fingerprint_index') is not null then
    grant select on table public.card_fingerprint_index to authenticated;
    drop policy if exists "card_fingerprint_index authenticated read" on public.card_fingerprint_index;
    create policy "card_fingerprint_index authenticated read"
    on public.card_fingerprint_index
    for select
    to authenticated
    using (true);
    comment on policy "card_fingerprint_index authenticated read" on public.card_fingerprint_index is
      'SECURITY_LINTER_REMEDIATION_V1: authenticated scanner/search helper read only.';
  end if;

  if to_regclass('public.scanner_fingerprint_index') is not null then
    grant select on table public.scanner_fingerprint_index to authenticated;
    drop policy if exists "scanner_fingerprint_index authenticated read" on public.scanner_fingerprint_index;
    create policy "scanner_fingerprint_index authenticated read"
    on public.scanner_fingerprint_index
    for select
    to authenticated
    using (true);
    comment on policy "scanner_fingerprint_index authenticated read" on public.scanner_fingerprint_index is
      'SECURITY_LINTER_REMEDIATION_V1: authenticated scanner helper read only.';
  end if;
end $$;

commit;
