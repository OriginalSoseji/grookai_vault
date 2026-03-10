-- RLS_SWEEP_V1
-- Enable RLS for remaining reachable public tables and apply category posture.

BEGIN;

DO $$
DECLARE
  tbl text;
  pol record;
  system_tables text[] := ARRAY['ai_decision_logs', 'app_settings', 'card_embeddings', 'card_price_observations', 'card_price_rollups', 'card_print_file_paths', 'card_print_price_curves', 'card_print_traits', 'dev_audit', 'ebay_active_price_snapshots', 'ebay_active_prices_latest', 'external_cache', 'external_mappings', 'external_printing_mappings', 'external_provider_stats', 'import_image_errors', 'job_logs', 'jobs', 'mapping_conflicts', 'pricing_watch', 'raw_imports', 'tcgdex_set_audit']::text[];
  reference_tables text[] := ARRAY['card_printings', 'condition_multipliers', 'condition_prices', 'finish_keys', 'fx_daily', 'graded_prices', 'premium_parallel_eligibility', 'price_rollup_config', 'price_sources', 'set_code_classification', 'tcgdex_cards', 'tcgdex_sets']::text[];
  backup_tables text[] := ARRAY['_import_card_prints', '_import_sets', 'backup_card_prints_null_utc', 'card_prints_backup_20251115', 'has_currency', 'has_high', 'has_low', 'has_mid', 'has_source', 'price_observations_backup_20251115', 'user_card_photos', 'vault_items_backup_20251115']::text[];
BEGIN
  -- Enable RLS and clear existing policies so posture is deterministic.
  FOREACH tbl IN ARRAY system_tables || reference_tables || backup_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;

  -- SYSTEM tables: service_role-only policy; no anon/auth access.
  FOREACH tbl IN ARRAY system_tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', 'service role all', tbl);
  END LOOP;

  -- REFERENCE tables: read allowed, writes blocked.
  FOREACH tbl IN ARRAY reference_tables LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'reference read', tbl);
  END LOOP;

  -- BACKUP tables: deny all for anon/auth.
  FOREACH tbl IN ARRAY backup_tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
  END LOOP;
END $$;

COMMIT;
