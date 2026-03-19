begin;

-- Repair Browse budget RPC contract to match the JS caller exactly.
-- Parameter signatures must remain:
--   get_ebay_browse_daily_budget_snapshot_v1(p_provider, p_daily_budget)
--   consume_ebay_browse_daily_budget_v1(p_provider, p_daily_budget, p_call_units)

drop function if exists public.get_ebay_browse_daily_budget_snapshot_v1(text, integer);
drop function if exists public.get_ebay_browse_daily_budget_snapshot_v1(text, integer, date);

drop function if exists public.consume_ebay_browse_daily_budget_v1(text, integer, integer);
drop function if exists public.consume_ebay_browse_daily_budget_v1(text, integer, integer, date);
drop function if exists public.consume_ebay_browse_daily_budget_v1(text, date, integer);

create or replace function public.get_ebay_browse_daily_budget_snapshot_v1(
  p_provider text,
  p_daily_budget integer
)
returns table (
  provider text,
  usage_date date,
  daily_budget integer,
  consumed_calls integer,
  remaining_calls integer,
  exhausted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := coalesce(nullif(btrim(p_provider), ''), 'ebay_browse');
  v_daily_budget integer := greatest(coalesce(p_daily_budget, 4200), 0);
  v_usage_date date := timezone('utc', now())::date;
begin
  insert into public.ebay_browse_daily_budget_v1 (
    provider,
    usage_date,
    consumed_calls
  )
  values (
    v_provider,
    v_usage_date,
    0
  )
  on conflict (provider, usage_date) do nothing;

  return query
  select
    b.provider,
    b.usage_date,
    v_daily_budget as daily_budget,
    b.consumed_calls,
    greatest(v_daily_budget - b.consumed_calls, 0) as remaining_calls,
    b.consumed_calls >= v_daily_budget as exhausted
  from public.ebay_browse_daily_budget_v1 b
  where b.provider = v_provider
    and b.usage_date = v_usage_date;
end;
$$;

revoke all on function public.get_ebay_browse_daily_budget_snapshot_v1(text, integer)
from public, anon, authenticated;

grant execute on function public.get_ebay_browse_daily_budget_snapshot_v1(text, integer)
to service_role;

create or replace function public.consume_ebay_browse_daily_budget_v1(
  p_provider text,
  p_daily_budget integer,
  p_call_units integer
)
returns table (
  provider text,
  usage_date date,
  daily_budget integer,
  requested_units integer,
  consumed_before integer,
  consumed_after integer,
  remaining_calls integer,
  allowed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := coalesce(nullif(btrim(p_provider), ''), 'ebay_browse');
  v_daily_budget integer := greatest(coalesce(p_daily_budget, 4200), 0);
  v_requested_units integer := greatest(coalesce(p_call_units, 0), 0);
  v_usage_date date := timezone('utc', now())::date;
  v_consumed_before integer := 0;
  v_consumed_after integer := 0;
begin
  insert into public.ebay_browse_daily_budget_v1 (
    provider,
    usage_date,
    consumed_calls
  )
  values (
    v_provider,
    v_usage_date,
    0
  )
  on conflict (provider, usage_date) do nothing;

  update public.ebay_browse_daily_budget_v1 b
     set consumed_calls = b.consumed_calls + v_requested_units,
         updated_at = now()
   where b.provider = v_provider
     and b.usage_date = v_usage_date
     and b.consumed_calls + v_requested_units <= v_daily_budget
  returning b.consumed_calls - v_requested_units,
            b.consumed_calls
       into v_consumed_before,
            v_consumed_after;

  if found then
    return query
    select
      v_provider as provider,
      v_usage_date as usage_date,
      v_daily_budget as daily_budget,
      v_requested_units as requested_units,
      v_consumed_before as consumed_before,
      v_consumed_after as consumed_after,
      greatest(v_daily_budget - v_consumed_after, 0) as remaining_calls,
      true as allowed;
    return;
  end if;

  select b.consumed_calls
    into v_consumed_after
  from public.ebay_browse_daily_budget_v1 b
  where b.provider = v_provider
    and b.usage_date = v_usage_date;

  v_consumed_after := coalesce(v_consumed_after, 0);
  v_consumed_before := v_consumed_after;

  return query
  select
    v_provider as provider,
    v_usage_date as usage_date,
    v_daily_budget as daily_budget,
    v_requested_units as requested_units,
    v_consumed_before as consumed_before,
    v_consumed_after as consumed_after,
    greatest(v_daily_budget - v_consumed_after, 0) as remaining_calls,
    false as allowed;
end;
$$;

revoke all on function public.consume_ebay_browse_daily_budget_v1(text, integer, integer)
from public, anon, authenticated;

grant execute on function public.consume_ebay_browse_daily_budget_v1(text, integer, integer)
to service_role;

commit;
