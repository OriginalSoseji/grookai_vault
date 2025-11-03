-- Weekly purge of finished jobs/logs older than 30 days
create or replace function public.prune_old_jobs()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.job_logs where at < now() - interval '30 days';
  delete from public.jobs where status in ('finished','failed') and finished_at < now() - interval '30 days';
end $$;

grants:
revoke all on function public.prune_old_jobs() from public, anon, authenticated;
grant execute on function public.prune_old_jobs() to service_role;

-- Schedule weekly via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('gv_prune_jobs_weekly');
    EXCEPTION WHEN undefined_function THEN NULL; END;
    PERFORM cron.schedule('gv_prune_jobs_weekly', '0 3 * * 0', $$select public.prune_old_jobs();$$);
  END IF;
END$$;

-- Simple alerting view (pull-based) for dashboards
create or replace view public.pricing_alerts_v as
select
  (select max(observed_at) from public.latest_card_prices_mv) as mv_latest_observed_at,
  (select count(*) filter (where status='failed') from public.jobs where created_at > now() - interval '24 hours') as jobs_failed_24h,
  (case when (select max(observed_at) from public.latest_card_prices_mv) < now() - interval '60 minutes' then true else false end) as is_stale_60m;
