select
  '20260706122000' as migration_id,
  to_regclass('cron.job') is not null as cron_job_relation_exists,
  exists (select 1 from pg_namespace where nspname = 'net') as net_schema_exists,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'jobid', jobid,
          'schedule', schedule,
          'command', command,
          'active', active
        )
        order by jobid
      )
      from cron.job
      where jobname = 'notification-dispatcher-disabled-v1'
    ),
    '[]'::jsonb
  ) as matching_jobs;
