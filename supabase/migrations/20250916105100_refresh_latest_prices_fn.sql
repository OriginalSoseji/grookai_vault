create or replace function public.refresh_latest_prices()
returns void
language sql
as $$
  refresh materialized view concurrently public.latest_prices;
$$;
grant execute on function public.refresh_latest_prices() to service_role;
