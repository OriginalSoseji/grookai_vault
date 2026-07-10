begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'e7_north_star_weekly_rollup_v1';

    perform cron.schedule(
      'e7_north_star_weekly_rollup_v1',
      '17 9 * * 1',
      $cron$
        select public.run_north_star_weekly_rollup_v1(
          (date_trunc('week', now() at time zone 'UTC')::date - 7),
          false
        );
      $cron$
    );
  else
    raise notice 'pg_cron not installed locally; E7 weekly rollup schedule skipped';
  end if;
exception
  when others then
    raise notice 'E7 weekly rollup cron schedule update skipped: %', sqlerrm;
end;
$$;

comment on function public.run_north_star_weekly_rollup_v1(date, boolean) is
'E7 service-role weekly rollup generator. Dry-run returns rows that would be written. Apply mode writes only E7 rollup, breakdown, and advisory recommendation tables. Weekly pg_cron schedule enabled by founder approval in 20260709131000.';

commit;
