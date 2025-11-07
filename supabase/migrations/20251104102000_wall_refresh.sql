-- Grookai Vault — Refresh helpers for materialized view

-- Safe refresh function
create or replace function public.refresh_wall_thumbs_3x4()
returns void
language plpgsql
security definer
as $$
begin
  perform 1;
  -- Only refresh if the matview exists
  if exists (
    select 1 from pg_matviews
    where schemaname = 'public' and matviewname = 'wall_thumbs_3x4'
  ) then
    refresh materialized view concurrently public.wall_thumbs_3x4;
  end if;
end;
$$;

-- Expose RPC endpoint for PostgREST (optional, controlled by RLS grants)
create or replace function public.rpc_refresh_wall()
returns text
language sql
security definer
stable
as $$
  select (public.refresh_wall_thumbs_3x4(), 'ok')::text;
$$;

-- Minimal grants: allow authenticated users to call; restrict anon if desired
grant execute on function public.rpc_refresh_wall() to authenticated;
-- (service_role inherently allowed; adjust as needed.)
-- NOTE: You can wire a nightly Edge job to POST /rest/v1/rpc/rpc_refresh_wall.

