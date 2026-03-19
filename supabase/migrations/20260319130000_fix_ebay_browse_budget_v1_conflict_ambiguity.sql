-- Repair V1 browse budget RPC bodies without changing the JS contract.
-- Root fix: avoid ambiguous identifier resolution inside RETURNS TABLE PL/pgSQL
-- by replacing ON CONFLICT(column_list) with ON CONFLICT ON CONSTRAINT(...).

drop function if exists public.get_ebay_browse_daily_budget_snapshot_v1(text, integer);
drop function if exists public.consume_ebay_browse_daily_budget_v1(text, integer, integer);

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
as $$
declare
  v_usage_date date := (now() at time zone 'utc')::date;
begin
  insert into public.ebay_browse_daily_budget_v1 (
    provider,
    usage_date,
    consumed_calls
  )
  values (
    p_provider,
    v_usage_date,
    0
  )
  on conflict on constraint ebay_browse_daily_budget_v1_pkey do nothing;

  return query
  select
    b.provider,
    b.usage_date,
    p_daily_budget as daily_budget,
    b.consumed_calls,
    greatest(p_daily_budget - b.consumed_calls, 0) as remaining_calls,
    (b.consumed_calls >= p_daily_budget) as exhausted
  from public.ebay_browse_daily_budget_v1 b
  where b.provider = p_provider
    and b.usage_date = v_usage_date;
end;
$$;

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
as $$
declare
  v_usage_date date := (now() at time zone 'utc')::date;
  v_requested_units integer := greatest(coalesce(p_call_units, 0), 0);
  v_consumed_before integer := 0;
  v_consumed_after integer := 0;
begin
  insert into public.ebay_browse_daily_budget_v1 (
    provider,
    usage_date,
    consumed_calls
  )
  values (
    p_provider,
    v_usage_date,
    0
  )
  on conflict on constraint ebay_browse_daily_budget_v1_pkey do nothing;

  select b.consumed_calls
    into v_consumed_before
  from public.ebay_browse_daily_budget_v1 b
  where b.provider = p_provider
    and b.usage_date = v_usage_date;

  if v_consumed_before + v_requested_units <= p_daily_budget then
    update public.ebay_browse_daily_budget_v1 b
    set consumed_calls = b.consumed_calls + v_requested_units
    where b.provider = p_provider
      and b.usage_date = v_usage_date;

    select b.consumed_calls
      into v_consumed_after
    from public.ebay_browse_daily_budget_v1 b
    where b.provider = p_provider
      and b.usage_date = v_usage_date;

    return query
    select
      b.provider,
      b.usage_date,
      p_daily_budget as daily_budget,
      v_requested_units as requested_units,
      v_consumed_before as consumed_before,
      v_consumed_after as consumed_after,
      greatest(p_daily_budget - v_consumed_after, 0) as remaining_calls,
      true as allowed
    from public.ebay_browse_daily_budget_v1 b
    where b.provider = p_provider
      and b.usage_date = v_usage_date;
  else
    return query
    select
      b.provider,
      b.usage_date,
      p_daily_budget as daily_budget,
      v_requested_units as requested_units,
      v_consumed_before as consumed_before,
      v_consumed_before as consumed_after,
      greatest(p_daily_budget - v_consumed_before, 0) as remaining_calls,
      false as allowed
    from public.ebay_browse_daily_budget_v1 b
    where b.provider = p_provider
      and b.usage_date = v_usage_date;
  end if;
end;
$$;
