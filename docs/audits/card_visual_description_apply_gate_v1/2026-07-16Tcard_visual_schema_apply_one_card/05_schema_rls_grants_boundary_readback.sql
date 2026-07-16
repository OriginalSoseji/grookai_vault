with target_tables as (
  select *
  from (values
    ('public'::text, 'card_visual_description_runs'::text),
    ('public'::text, 'card_print_visual_descriptions'::text)
  ) as t(schema_name, table_name)
),
table_readback as (
  select
    t.table_name,
    jsonb_build_object(
      'exists', c.oid is not null,
      'rls_enabled', coalesce(c.relrowsecurity, false),
      'force_rls', coalesce(c.relforcerowsecurity, false),
      'anon_select', case when c.oid is null then null else has_table_privilege('anon', c.oid, 'select') end,
      'anon_insert', case when c.oid is null then null else has_table_privilege('anon', c.oid, 'insert') end,
      'anon_update', case when c.oid is null then null else has_table_privilege('anon', c.oid, 'update') end,
      'anon_delete', case when c.oid is null then null else has_table_privilege('anon', c.oid, 'delete') end,
      'authenticated_select', case when c.oid is null then null else has_table_privilege('authenticated', c.oid, 'select') end,
      'authenticated_insert', case when c.oid is null then null else has_table_privilege('authenticated', c.oid, 'insert') end,
      'authenticated_update', case when c.oid is null then null else has_table_privilege('authenticated', c.oid, 'update') end,
      'authenticated_delete', case when c.oid is null then null else has_table_privilege('authenticated', c.oid, 'delete') end,
      'service_role_select', case when c.oid is null then null else has_table_privilege('service_role', c.oid, 'select') end,
      'service_role_insert', case when c.oid is null then null else has_table_privilege('service_role', c.oid, 'insert') end,
      'service_role_update', case when c.oid is null then null else has_table_privilege('service_role', c.oid, 'update') end,
      'service_role_delete', case when c.oid is null then null else has_table_privilege('service_role', c.oid, 'delete') end,
      'policy_count', (
        select count(*)::int
        from pg_policies p
        where p.schemaname = t.schema_name
          and p.tablename = t.table_name
      ),
      'columns', (
        select jsonb_agg(jsonb_build_object(
          'name', a.attname,
          'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
          'not_null', a.attnotnull
        ) order by a.attnum)
        from pg_attribute a
        where a.attrelid = c.oid
          and a.attnum > 0
          and not a.attisdropped
      )
    ) as details
  from target_tables t
  left join pg_namespace n
    on n.nspname = t.schema_name
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = t.table_name
   and c.relkind = 'r'
),
index_readback as (
  select jsonb_object_agg(expected.index_name, to_regclass(expected.index_name) is not null order by expected.index_name) as details
  from (values
    ('public.card_print_visual_descriptions_current_unique_idx'::text),
    ('public.card_print_visual_descriptions_version_unique_idx'::text),
    ('public.card_print_visual_descriptions_card_idx'::text),
    ('public.card_print_visual_descriptions_review_idx'::text),
    ('public.card_print_visual_descriptions_tags_idx'::text)
  ) as expected(index_name)
),
trigger_readback as (
  select jsonb_object_agg(expected.trigger_name, exists (
    select 1
    from pg_trigger trg
    join pg_class c on c.oid = trg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = expected.schema_name
      and c.relname = expected.table_name
      and trg.tgname = expected.trigger_name
      and not trg.tgisinternal
  ) order by expected.trigger_name) as details
  from (values
    ('public'::text, 'card_visual_description_runs'::text, 'trg_card_visual_description_runs_updated_at'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'trg_card_print_visual_descriptions_updated_at'::text)
  ) as expected(schema_name, table_name, trigger_name)
),
constraint_readback as (
  select jsonb_object_agg(expected.constraint_name, exists (
    select 1
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = expected.schema_name
      and c.relname = expected.table_name
      and con.conname = expected.constraint_name
  ) order by expected.constraint_name) as details
  from (values
    ('public'::text, 'card_visual_description_runs'::text, 'card_visual_description_runs_mode_check'::text),
    ('public'::text, 'card_visual_description_runs'::text, 'card_visual_description_runs_status_check'::text),
    ('public'::text, 'card_visual_description_runs'::text, 'card_visual_description_runs_counts_nonnegative_check'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'card_print_visual_descriptions_review_status_check'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'card_print_visual_descriptions_usage_nonnegative_check'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'card_print_visual_descriptions_confidence_range_check'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'card_print_visual_descriptions_approved_fields_check'::text),
    ('public'::text, 'card_print_visual_descriptions'::text, 'card_print_visual_descriptions_embedding_dimensions_check'::text)
  ) as expected(schema_name, table_name, constraint_name)
),
boundary_readback as (
  select jsonb_build_object(
    'card_prints_visual_columns_added', (
      select coalesce(jsonb_agg(column_name order by column_name), '[]'::jsonb)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'card_prints'
        and (
          column_name ilike '%visual%'
          or column_name ilike '%description%'
          or column_name ilike '%embedding%'
          or column_name ilike '%semantic%'
        )
    ),
    'app_role_grants_on_visual_tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'grantee', grantee,
        'table_name', table_name,
        'privilege_type', privilege_type
      ) order by grantee, table_name, privilege_type), '[]'::jsonb)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('card_visual_description_runs', 'card_print_visual_descriptions')
        and grantee in ('anon', 'authenticated')
    ),
    'app_facing_views_referencing_visual_tables', (
      select coalesce(jsonb_agg((schemaname || '.' || viewname) order by schemaname, viewname), '[]'::jsonb)
      from pg_views
      where schemaname in ('public', 'api')
        and definition ilike any (array[
          '%card_visual_description_runs%',
          '%card_print_visual_descriptions%'
        ])
    ),
    'canonical_tables_mutated_by_name', (
      select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('card_prints', 'cards', 'canonical_cards')
        and table_type = 'BASE TABLE'
    ),
    'new_tables_only_derived_private_layer', (
      select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('card_visual_description_runs', 'card_print_visual_descriptions')
    )
  ) as details
)
select jsonb_pretty(jsonb_build_object(
  'migration_applied', exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260715120000'
  ),
  'tables', (select jsonb_object_agg(table_name, details order by table_name) from table_readback),
  'indexes', (select details from index_readback),
  'triggers', (select details from trigger_readback),
  'constraints', (select details from constraint_readback),
  'boundary', (select details from boundary_readback)
)) as readback;
