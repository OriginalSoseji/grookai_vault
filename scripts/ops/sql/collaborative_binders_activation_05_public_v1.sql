with
activation_lock as materialized (
  select pg_try_advisory_xact_lock(
    hashtextextended('GROOKAI_BINDER_FEATURE_ACTIVATION_V1', 0)
  ) as acquired
),
locked_flags as materialized (
  select
    f.flag_key,
    f.enabled,
    f.description,
    f.updated_at
  from public.binder_feature_flags f
  cross join activation_lock activation
  where activation.acquired
  order by f.flag_key
  for update of f nowait
),
flag_state as materialized (
  select
    count(*)::integer as flag_count,
    coalesce(
      array_agg(flag_key order by flag_key),
      array[]::text[]
    ) as all_flags,
    coalesce(
      array_agg(flag_key order by flag_key) filter (where enabled),
      array[]::text[]
    ) as enabled_before
  from locked_flags
),
catalog_state as materialized (
  select
    current_user = 'postgres' as execution_role_ok,
    current_setting('server_version_num')::integer / 10000 = 17
      as server_major_version_ok,
    (
      select count(*)::integer
      from supabase_migrations.schema_migrations
      where version::text = any(array[
        '20260723100000',
        '20260723101000',
        '20260723102000',
        '20260723103000',
        '20260723104000'
      ])
    ) = 5 as package_ledger_ok,
    (
      select count(*)::integer
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
        and (
          relation.relname = 'binders'
          or relation.relname like 'binder\_%' escape '\'
        )
    ) = 21 as table_count_ok,
    (
      select count(*)::integer
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
        and relation.relrowsecurity
        and (
          relation.relname = 'binders'
          or relation.relname like 'binder\_%' escape '\'
        )
    ) = 21 as rls_count_ok,
    (
      select count(*)::integer
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname like 'binder\_%' escape '\'
    ) = 124 as function_count_ok,
    (
      select count(*)::integer
      from pg_index index_row
      join pg_class relation on relation.oid = index_row.indrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and (
          relation.relname = 'binders'
          or relation.relname like 'binder\_%' escape '\'
        )
    ) = 65 as index_count_ok,
    (
      select count(*)::integer
      from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and (
          relation.relname = 'binders'
          or relation.relname like 'binder\_%' escape '\'
        )
    ) = 22 as policy_count_ok,
    (
      select count(*)::integer
      from pg_trigger trigger_row
      join pg_class relation on relation.oid = trigger_row.tgrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and not trigger_row.tgisinternal
        and (
          relation.relname = 'binders'
          or relation.relname like 'binder\_%' escape '\'
          or trigger_row.tgname = any(array[
            'trg_trust_blocks_binder_effect_v1',
            'trg_binder_vault_instance_update_v1',
            'trg_binder_vault_instance_delete_v1',
            'trg_binder_slab_identity_update_v1'
          ])
        )
    ) = 22 as trigger_count_ok
),
domain_state as materialized (
  select
    (
      (select count(*) from public.binders) +
      (select count(*) from public.binder_members) +
      (select count(*) from public.binder_progress_state) +
      (select count(*) from public.binder_custom_revisions) +
      (select count(*) from public.binder_custom_slots) +
      (select count(*) from public.binder_invitations) +
      (select count(*) from public.binder_view_links) +
      (select count(*) from public.binder_join_requests) +
      (select count(*) from public.binder_owner_transfer_offers) +
      (select count(*) from public.binder_contributions) +
      (select count(*) from public.binder_activity_events) +
      (select count(*) from public.binder_progress_crossings) +
      (select count(*) from public.binder_legacy_watch_decisions) +
      (select count(*) from public.binder_templates) +
      (select count(*) from public.binder_template_versions) +
      (select count(*) from public.binder_template_adoptions) +
      (select count(*) from public.binder_idempotency_keys) +
      (select count(*) from public.binder_rate_limit_events) +
      (select count(*) from public.binder_template_version_reviews) +
      (select count(*) from public.binder_refresh_signals)
    ) = 0 as binder_domain_empty,
    not exists (
      select 1
      from public.card_events
      where event_type like 'binder\_%' escape '\'
    ) as binder_card_events_empty,
    not exists (
      select 1
      from public.trust_reports
      where surface in (
        'binder',
        'binder_contribution',
        'binder_member',
        'binder_invitation'
      )
    ) as binder_trust_reports_empty
),
eligible as materialized (
  select state.enabled_before
  from flag_state state
  cross join catalog_state catalog
  cross join domain_state domain
  where state.flag_count = 11
    and state.all_flags = array[
      'community',
      'custom',
      'notifications',
      'personal',
      'public',
      'pulse_milestones',
      'schema_internal',
      'set_binders',
      'shared',
      'templates',
      'view_links'
    ]::text[]
    and state.enabled_before = array['personal','schema_internal','shared','view_links']::text[]
    and catalog.execution_role_ok
    and catalog.server_major_version_ok
    and catalog.package_ledger_ok
    and catalog.table_count_ok
    and catalog.rls_count_ok
    and catalog.function_count_ok
    and catalog.index_count_ok
    and catalog.policy_count_ok
    and catalog.trigger_count_ok
    and domain.binder_domain_empty
    and domain.binder_card_events_empty
    and domain.binder_trust_reports_empty
),
changed as (
  update public.binder_feature_flags target
  set enabled = true
  from eligible
  where target.flag_key = 'public'
    and target.enabled = false
  returning target.flag_key, target.updated_at
),
change_summary as materialized (
  select
    count(*)::integer as updated_rows,
    min(updated_at) as updated_at
  from changed
)
select jsonb_build_object(
  'schema_version', 1,
  'package_id', 'COLLABORATIVE-BINDERS-ACTIVATION-V1',
  'project_ref', 'ycdxbpibncqcchqiihfz',
  'phase_sequence', 5,
  'target_flag', 'public',
  'enabled_before', to_jsonb(flag_state.enabled_before),
  'enabled_after', '["personal","public","schema_internal","shared","view_links"]'::jsonb,
  'updated_rows', change_summary.updated_rows,
  'updated_at_utc', change_summary.updated_at,
  'completed_at_utc', clock_timestamp(),
  'ok', change_summary.updated_rows = 1
) as activation_result
from flag_state
cross join change_summary
where change_summary.updated_rows = 1;
