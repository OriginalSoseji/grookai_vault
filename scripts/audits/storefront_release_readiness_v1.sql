-- Read-only production metadata/count preflight. No user rows or credentials.
-- This is diagnostic evidence, not the strict schema-diff/replay apply gate.
begin isolation level repeatable read read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';
select jsonb_build_object(
  'recorded_at', now(),
  'transaction_read_only', current_setting('transaction_read_only'),
  'sanity', jsonb_build_object(
    'card_prints', (select count(*) from public.card_prints),
    'sets', (select count(*) from public.sets),
    'card_print_traits', (select count(*) from public.card_print_traits)
  ),
  'migration_versions', (select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations),
  'store_tables', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity)
      order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
      and (c.relname like 'vendor_store%' or c.relname='vendor_referral_signups')),
  'store_functions', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef, 'configuration', p.proconfig) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like 'vendor_store%' or p.proname='vendor_referral_credit_v1')),
  'store_bucket', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'public', public, 'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types)), '[]'::jsonb)
    from storage.buckets where id='vendor-store-media'),
  'store_policies', (select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname,
      'roles', roles, 'command', cmd) order by schemaname,tablename,policyname), '[]'::jsonb)
    from pg_policies where policyname like 'vendor_store%'),
  'store_entitlement_counts', (select jsonb_build_object(
      'app', count(*) filter (where is_active and features->>'store_app'='true'),
      'web', count(*) filter (where is_active and features->>'store_web'='true'))
    from public.user_entitlements),
  'foreign_keys', (select coalesce(jsonb_agg(jsonb_build_object(
      'schema', ns.nspname, 'table', src.relname, 'name', k.conname,
      'target_schema', nt.nspname, 'target_table', dst.relname,
      'definition', pg_get_constraintdef(k.oid))
      order by ns.nspname,src.relname,k.conname), '[]'::jsonb)
    from pg_constraint k join pg_class src on src.oid=k.conrelid
    join pg_namespace ns on ns.oid=src.relnamespace
    join pg_class dst on dst.oid=k.confrelid
    join pg_namespace nt on nt.oid=dst.relnamespace
    where k.contype='f' and nt.nspname='public'
      and dst.relname in ('card_prints','card_printings','vault_item_instances','wall_sections','user_entitlements')),
  'entitlement_triggers', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid))
      order by t.tgname), '[]'::jsonb)
    from pg_trigger t where t.tgrelid='public.user_entitlements'::regclass and not t.tgisinternal)
) as receipt;
rollback;
