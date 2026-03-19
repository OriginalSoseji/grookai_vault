begin;

create table if not exists public.ebay_browse_daily_budget_v1 (
  provider text not null,
  usage_date date not null,
  consumed_calls integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ebay_browse_daily_budget_v1_pkey primary key (provider, usage_date),
  constraint ebay_browse_daily_budget_v1_consumed_nonnegative check (consumed_calls >= 0)
);

comment on table public.ebay_browse_daily_budget_v1 is
  'Authoritative daily Browse API usage counter keyed by provider + UTC date.';

comment on column public.ebay_browse_daily_budget_v1.provider is
  'Provider key for the guarded API lane. Current value: ebay_browse.';

comment on column public.ebay_browse_daily_budget_v1.usage_date is
  'UTC calendar date for the tracked Browse usage bucket.';

comment on column public.ebay_browse_daily_budget_v1.consumed_calls is
  'Count of outbound Browse API calls already consumed for the provider/date bucket.';

revoke all on table public.ebay_browse_daily_budget_v1
from public, anon, authenticated;

create or replace function public.get_ebay_browse_daily_budget_snapshot_v1(
  p_provider text default 'ebay_browse',
  p_daily_budget integer default 4200,
  p_usage_date date default null
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
  v_usage_date date := coalesce(p_usage_date, timezone('utc', now())::date);
  v_daily_budget integer := greatest(coalesce(p_daily_budget, 4200), 0);
  v_consumed_calls integer := 0;
begin
  select d.consumed_calls
    into v_consumed_calls
  from public.ebay_browse_daily_budget_v1 d
  where d.provider = v_provider
    and d.usage_date = v_usage_date;

  v_consumed_calls := coalesce(v_consumed_calls, 0);

  return query
  select
    v_provider,
    v_usage_date,
    v_daily_budget,
    v_consumed_calls,
    greatest(v_daily_budget - v_consumed_calls, 0),
    v_consumed_calls >= v_daily_budget;
end;
$$;

revoke all on function public.get_ebay_browse_daily_budget_snapshot_v1(text, integer, date)
from public, anon, authenticated;

grant execute on function public.get_ebay_browse_daily_budget_snapshot_v1(text, integer, date)
to service_role;

create or replace function public.consume_ebay_browse_daily_budget_v1(
  p_provider text default 'ebay_browse',
  p_daily_budget integer default 4200,
  p_call_units integer default 1,
  p_usage_date date default null
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
  v_usage_date date := coalesce(p_usage_date, timezone('utc', now())::date);
  v_daily_budget integer := greatest(coalesce(p_daily_budget, 4200), 0);
  v_requested_units integer := greatest(coalesce(p_call_units, 1), 0);
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

  update public.ebay_browse_daily_budget_v1 d
     set consumed_calls = d.consumed_calls + v_requested_units,
         updated_at = now()
   where d.provider = v_provider
     and d.usage_date = v_usage_date
     and d.consumed_calls + v_requested_units <= v_daily_budget
  returning d.consumed_calls - v_requested_units,
            d.consumed_calls
       into v_consumed_before,
            v_consumed_after;

  if found then
    return query
    select
      v_provider,
      v_usage_date,
      v_daily_budget,
      v_requested_units,
      v_consumed_before,
      v_consumed_after,
      greatest(v_daily_budget - v_consumed_after, 0),
      true;
    return;
  end if;

  select d.consumed_calls
    into v_consumed_after
  from public.ebay_browse_daily_budget_v1 d
  where d.provider = v_provider
    and d.usage_date = v_usage_date;

  v_consumed_after := coalesce(v_consumed_after, 0);
  v_consumed_before := v_consumed_after;

  return query
  select
    v_provider,
    v_usage_date,
    v_daily_budget,
    v_requested_units,
    v_consumed_before,
    v_consumed_after,
    greatest(v_daily_budget - v_consumed_after, 0),
    false;
end;
$$;

revoke all on function public.consume_ebay_browse_daily_budget_v1(text, integer, integer, date)
from public, anon, authenticated;

grant execute on function public.consume_ebay_browse_daily_budget_v1(text, integer, integer, date)
to service_role;

commit;
