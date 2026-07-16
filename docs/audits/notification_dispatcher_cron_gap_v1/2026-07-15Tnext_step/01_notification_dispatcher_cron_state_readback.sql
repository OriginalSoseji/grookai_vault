with migration_rows as (
  select
    version::text as migration_id,
    true as present_in_remote_history
  from supabase_migrations.schema_migrations
  where version in ('20260706122000', '20260707182000')
),
cron_state as (
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'jobid', jobid,
          'jobname', jobname,
          'schedule', schedule,
          'command', command,
          'active', active
        )
        order by jobname, jobid
      )
      from cron.job
      where jobname in (
        'notification-dispatcher-disabled-v1',
        'notification-dispatcher-every-minute-v1'
      )
      or command ilike '%notification_dispatcher_scheduled_http_v1%'
    ),
    '[]'::jsonb
  ) as jobs
),
runtime_table as (
  select
    to_regclass('public.notification_dispatcher_runtime_config') is not null as exists_remote,
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'notification_dispatcher_runtime_config'
      limit 1
    ), false) as rls_enabled,
    coalesce((
      select jsonb_agg(policyname order by policyname)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'notification_dispatcher_runtime_config'
    ), '[]'::jsonb) as policies
),
runtime_keys as (
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'key', key,
          'value_present', value is not null and value <> '',
          'updated_at', updated_at
        )
        order by key
      )
      from public.notification_dispatcher_runtime_config
      where key in ('enabled', 'url', 'shared_secret')
    ),
    '[]'::jsonb
  ) as keys
  where to_regclass('public.notification_dispatcher_runtime_config') is not null
),
scheduled_function as (
  select
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'notification_dispatcher_scheduled_http_v1'
    ) as exists_remote,
    coalesce((
      select bool_or(p.prosecdef)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'notification_dispatcher_scheduled_http_v1'
    ), false) as has_security_definer,
    coalesce((
      select bool_or(pg_get_functiondef(p.oid) ilike '%notification_dispatcher_runtime_config%')
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'notification_dispatcher_scheduled_http_v1'
    ), false) as uses_runtime_config,
    coalesce((
      select bool_or(pg_get_functiondef(p.oid) ilike '%current_setting%notification_dispatcher%')
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'notification_dispatcher_scheduled_http_v1'
    ), false) as uses_legacy_current_setting
)
select jsonb_build_object(
  'migration_history', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'migration_id', m.migration_id,
        'present_in_remote_history', m.present_in_remote_history
      )
      order by m.migration_id
    )
    from migration_rows m
  ), '[]'::jsonb),
  'cron_job_relation_exists', to_regclass('cron.job') is not null,
  'net_schema_exists', exists (select 1 from pg_namespace where nspname = 'net'),
  'cron_jobs', (select jobs from cron_state),
  'runtime_config_table', (select to_jsonb(runtime_table) from runtime_table),
  'runtime_config_keys_secret_values_excluded', coalesce((select keys from runtime_keys), '[]'::jsonb),
  'scheduled_function', (select to_jsonb(scheduled_function) from scheduled_function)
) as notification_dispatcher_cron_state;
