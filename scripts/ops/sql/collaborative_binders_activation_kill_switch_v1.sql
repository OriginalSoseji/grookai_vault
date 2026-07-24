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
      from pg_proc procedure
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname like 'binder\_%' escape '\'
    ) = 124 as function_count_ok
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
  select
    state.enabled_before,
    case
      when state.enabled_before = array[
        'schema_internal'
      ]::text[] then 1
      when state.enabled_before = array[
        'personal',
        'schema_internal'
      ]::text[] then 2
      when state.enabled_before = array[
        'personal',
        'schema_internal',
        'shared'
      ]::text[] then 3
      when state.enabled_before = array[
        'personal',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[] then 4
      when state.enabled_before = array[
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[] then 5
      when state.enabled_before = array[
        'community',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[] then 6
      when state.enabled_before = array[
        'community',
        'custom',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[] then 7
      when state.enabled_before = array[
        'community',
        'custom',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'templates',
        'view_links'
      ]::text[] then 8
    end::integer as phase_sequence
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
    and (
      state.enabled_before = array[
        'schema_internal'
      ]::text[]
      or state.enabled_before = array[
        'personal',
        'schema_internal'
      ]::text[]
      or state.enabled_before = array[
        'personal',
        'schema_internal',
        'shared'
      ]::text[]
      or state.enabled_before = array[
        'personal',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[]
      or state.enabled_before = array[
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[]
      or state.enabled_before = array[
        'community',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[]
      or state.enabled_before = array[
        'community',
        'custom',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'view_links'
      ]::text[]
      or state.enabled_before = array[
        'community',
        'custom',
        'personal',
        'public',
        'schema_internal',
        'shared',
        'templates',
        'view_links'
      ]::text[]
    )
    and not (
      state.enabled_before && array[
        'notifications',
        'pulse_milestones',
        'set_binders'
      ]::text[]
    )
    and catalog.execution_role_ok
    and catalog.server_major_version_ok
    and catalog.package_ledger_ok
    and catalog.table_count_ok
    and catalog.function_count_ok
    and domain.binder_domain_empty
    and domain.binder_card_events_empty
    and domain.binder_trust_reports_empty
),
changed as (
  update public.binder_feature_flags target
  set enabled = false
  from eligible
  where target.flag_key = 'schema_internal'
    and target.enabled = true
  returning target.flag_key, target.updated_at
),
change_summary as materialized (
  select
    count(*)::integer as updated_rows,
    min(updated_at) as updated_at
  from changed
),
result_state as materialized (
  select
    eligible.enabled_before,
    array_remove(
      eligible.enabled_before,
      'schema_internal'
    ) as enabled_after,
    array[]::text[] as effective_enabled_after,
    eligible.phase_sequence,
    change_summary.updated_rows,
    change_summary.updated_at
  from eligible
  cross join change_summary
  where change_summary.updated_rows = 1
)
select jsonb_build_object(
  'schema_version', 1,
  'package_id', 'COLLABORATIVE-BINDERS-ACTIVATION-V1',
  'project_ref', 'ycdxbpibncqcchqiihfz',
  'operation', 'kill_switch',
  'target_flag', 'schema_internal',
  'set_enabled', false,
  'phase_sequence', result_state.phase_sequence,
  'enabled_before', to_jsonb(result_state.enabled_before),
  'enabled_after', to_jsonb(result_state.enabled_after),
  'effective_enabled_after', '[]'::jsonb,
  'binder_domain_empty', domain_state.binder_domain_empty,
  'binder_card_events_empty', domain_state.binder_card_events_empty,
  'binder_trust_reports_empty', domain_state.binder_trust_reports_empty,
  'updated_rows', result_state.updated_rows,
  'updated_at_utc', result_state.updated_at,
  'completed_at_utc', clock_timestamp(),
  'ok',
    result_state.updated_rows = 1
    and result_state.effective_enabled_after = array[]::text[]
) as kill_switch_result
from result_state
cross join domain_state
where result_state.updated_rows = 1;
