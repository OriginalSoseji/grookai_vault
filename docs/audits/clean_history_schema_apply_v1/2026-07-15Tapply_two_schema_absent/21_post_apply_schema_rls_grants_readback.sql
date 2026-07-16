select jsonb_build_object(
  'printing_truth', jsonb_build_object(
    'table', (
      select jsonb_build_object(
        'exists', true,
        'rls_enabled', c.relrowsecurity,
        'columns', (
          select jsonb_agg(jsonb_build_object('name', a.attname, 'type', pg_catalog.format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull) order by a.attnum)
          from pg_attribute a
          where a.attrelid = c.oid
            and a.attnum > 0
            and not a.attisdropped
        ),
        'grants', jsonb_build_object(
          'anon_select', has_table_privilege('anon', c.oid, 'select'),
          'authenticated_select', has_table_privilege('authenticated', c.oid, 'select'),
          'service_role_select', has_table_privilege('service_role', c.oid, 'select'),
          'service_role_insert', has_table_privilege('service_role', c.oid, 'insert'),
          'service_role_update', has_table_privilege('service_role', c.oid, 'update')
        )
      )
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'card_printing_truth_reviews'
    ),
    'view_exists', to_regclass('public.v_card_printing_truth_current_v1') is not null,
    'policies', coalesce((
      select jsonb_agg(policyname order by policyname)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'card_printing_truth_reviews'
    ), '[]'::jsonb),
    'trigger_exists', exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'card_printing_truth_reviews'
        and t.tgname = 'trg_card_printing_truth_reviews_updated_at_v1'
        and not t.tgisinternal
    )
  ),
  'trust_safety', jsonb_build_object(
    'trust_blocks_table', (
      select jsonb_build_object(
        'exists', true,
        'rls_enabled', c.relrowsecurity,
        'grants', jsonb_build_object(
          'anon_select', has_table_privilege('anon', c.oid, 'select'),
          'authenticated_select', has_table_privilege('authenticated', c.oid, 'select'),
          'authenticated_insert', has_table_privilege('authenticated', c.oid, 'insert'),
          'authenticated_delete', has_table_privilege('authenticated', c.oid, 'delete'),
          'service_role_all', has_table_privilege('service_role', c.oid, 'select')
            and has_table_privilege('service_role', c.oid, 'insert')
            and has_table_privilege('service_role', c.oid, 'update')
            and has_table_privilege('service_role', c.oid, 'delete')
        )
      )
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'trust_blocks'
    ),
    'trust_reports_table', (
      select jsonb_build_object(
        'exists', true,
        'rls_enabled', c.relrowsecurity,
        'grants', jsonb_build_object(
          'anon_select', has_table_privilege('anon', c.oid, 'select'),
          'authenticated_select', has_table_privilege('authenticated', c.oid, 'select'),
          'authenticated_insert', has_table_privilege('authenticated', c.oid, 'insert'),
          'service_role_all', has_table_privilege('service_role', c.oid, 'select')
            and has_table_privilege('service_role', c.oid, 'insert')
            and has_table_privilege('service_role', c.oid, 'update')
            and has_table_privilege('service_role', c.oid, 'delete')
        )
      )
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'trust_reports'
    ),
    'policies', coalesce((
      select jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname) order by tablename, policyname)
      from pg_policies
      where schemaname = 'public'
        and tablename in ('trust_blocks', 'trust_reports')
    ), '[]'::jsonb),
    'function', (
      select jsonb_agg(jsonb_build_object(
        'identity_arguments', pg_get_function_identity_arguments(p.oid),
        'security_definer', p.prosecdef,
        'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
        'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute'),
        'service_role_execute', has_function_privilege('service_role', p.oid, 'execute')
      ))
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'trust_block_exists_between_v1'
    ),
    'card_interactions_insert_sender_policy_exists', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'card_interactions'
        and policyname = 'card_interactions_insert_sender'
    ),
    'card_contact_targets_view_exists', to_regclass('public.v_card_contact_targets_v1') is not null
  ),
  'card_visual_description_boundary', jsonb_build_object(
    'runs_table_exists', to_regclass('public.card_visual_description_runs') is not null,
    'descriptions_table_exists', to_regclass('public.card_print_visual_descriptions') is not null,
    'migration_20260715120000_applied', exists (
      select 1
      from supabase_migrations.schema_migrations
      where version = '20260715120000'
    )
  )
) as post_apply_schema_state;
