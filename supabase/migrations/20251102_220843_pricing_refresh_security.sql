-- Security hardening for pricing refresh worker
revoke execute on function public.process_jobs(int) from public, anon, authenticated;
revoke execute on function public.job_log(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.process_jobs(int) to service_role;
grant execute on function public.job_log(uuid, text, text, jsonb) to service_role;

-- Keep jobs tables private from anon/auth
revoke all on table public.jobs from anon, authenticated;
revoke all on table public.job_logs from anon, authenticated;

-- Observability: pricing health view (service/internal use)
create or replace view public.pricing_health_v as
select
  (select max(observed_at) from public.latest_card_prices_mv) as mv_latest_observed_at,
  (select count(*) from public.latest_card_prices_mv)         as mv_rows,
  (select count(*) filter (where status='failed') from public.jobs
     where created_at > now() - interval '24 hours')          as jobs_failed_24h,
  (select count(*) filter (where status='finished') from public.jobs
     where created_at > now() - interval '24 hours')          as jobs_finished_24h;
