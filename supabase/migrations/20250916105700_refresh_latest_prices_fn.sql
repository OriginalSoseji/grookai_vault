-- Recompute the materialized view after imports.
create or replace function public.refresh_latest_prices()
returns void
language sql
as $$
  refresh materialized view concurrently public.latest_prices;
$$;

-- Let the service role call this (edge functions use it).
grant execute on function public.refresh_latest_prices() to service_role;
