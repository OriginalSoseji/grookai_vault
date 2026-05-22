-- SECURITY_INFO_RLS_NO_POLICY_V1
-- Make the deny posture explicit for RLS-enabled internal/backup tables.
--
-- Supabase reports RLS-enabled tables without policies as informational security
-- findings. These tables are not direct app-role surfaces; adding explicit
-- deny-all policies preserves the existing closed posture while clearing the
-- linter noise.

begin;

do $$
declare
  table_name text;
  target_tables text[] := array[
    'audit_card_image_backfill_v1_backup_20260520',
    'collapse_map_phase1',
    'contract_violations',
    'justtcg_identity_overrides',
    'justtcg_set_mappings',
    'justtcg_variant_price_snapshots',
    'me03_master_set_repair_v1_card_print_species_backup_20260519',
    'me03_master_set_repair_v1_card_prints_backup_20260519',
    'me03_master_set_repair_v1_external_mappings_backup_20260519',
    'me03_master_set_repair_v1_warehouse_candidates_backup_20260519',
    'quarantine_records',
    'slab_provenance_events',
    'web_events'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);

      execute format(
        'drop policy if exists %I on public.%I',
        'security_info_deny_all_anon_v1',
        table_name
      );
      execute format(
        'drop policy if exists %I on public.%I',
        'security_info_deny_all_authenticated_v1',
        table_name
      );

      execute format(
        'create policy %I on public.%I for all to anon using (false) with check (false)',
        'security_info_deny_all_anon_v1',
        table_name
      );
      execute format(
        'create policy %I on public.%I for all to authenticated using (false) with check (false)',
        'security_info_deny_all_authenticated_v1',
        table_name
      );

      execute format(
        'comment on policy %I on public.%I is %L',
        'security_info_deny_all_anon_v1',
        table_name,
        'SECURITY_INFO_RLS_NO_POLICY_V1: explicit deny-all policy for closed internal/backup table.'
      );
      execute format(
        'comment on policy %I on public.%I is %L',
        'security_info_deny_all_authenticated_v1',
        table_name,
        'SECURITY_INFO_RLS_NO_POLICY_V1: explicit deny-all policy for closed internal/backup table.'
      );
    end if;
  end loop;
end $$;

commit;
