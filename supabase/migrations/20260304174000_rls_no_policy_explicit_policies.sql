-- LINTER_RLS_NO_POLICY_FIX_V1
-- Add explicit deny-all policies for RLS-enabled public tables with no policies.

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    '_import_card_prints',
    '_import_sets',
    'backup_card_prints_null_utc',
    'card_prints_backup_20251115',
    'has_currency',
    'has_high',
    'has_low',
    'has_mid',
    'has_source',
    'price_observations_backup_20251115',
    'user_card_photos',
    'vault_items_backup_20251115'
  ]::text[];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_anon', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_authenticated', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon USING (false) WITH CHECK (false)',
      'deny_all_anon',
      tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (false) WITH CHECK (false)',
      'deny_all_authenticated',
      tbl
    );
  END LOOP;
END $$;
