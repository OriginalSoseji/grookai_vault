-- Public diagnostics RPCs (created 2025-11-03)

-- pricing_health_get(): expose health summary via RPC
create or replace function public.pricing_health_get()
returns table(observed_at timestamptz, mv_rows int, jobs_24h int)
language sql
security definer
set search_path = public
as $$
  select mv_latest_observed_at as observed_at,
         mv_rows::int,
         jobs_failed_24h::int as jobs_24h
  from public.pricing_health_v
  limit 1
$$;

grant execute on function public.pricing_health_get() to anon, authenticated;

-- pricing_alerts_list(limit_n): derive alerts from pricing_alerts_v
create or replace function public.pricing_alerts_list(limit_n int default 20)
returns table(code text, message text, observed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with base as (
    select mv_latest_observed_at, jobs_failed_24h, is_stale_60m from public.pricing_alerts_v
  ), alerts as (
    select case when is_stale_60m then 'STALE_MV' else null end as code,
           case when is_stale_60m then 'Latest prices older than 60 minutes' else null end as message,
           mv_latest_observed_at as observed_at
      from base
    union all
    select case when jobs_failed_24h > 0 then 'FAILED_JOBS' else null end,
           case when jobs_failed_24h > 0 then (jobs_failed_24h||' job(s) failed in last 24h') else null end,
           mv_latest_observed_at
      from base
  )
  select code, message, observed_at from alerts where code is not null and message is not null order by observed_at desc limit limit_n;
end;
$$;

grant execute on function public.pricing_alerts_list(int) to anon, authenticated;

-- wall_feed_list(limit, offset): expose wall feed via RPC
create or replace function public.wall_feed_list(limit_n int default 20, offset_n int default 0)
returns setof public.wall_feed_v
language sql
security definer
set search_path = public
as $$
  select * from public.wall_feed_v order by created_at desc limit limit_n offset offset_n
$$;

grant execute on function public.wall_feed_list(int,int) to anon, authenticated;
