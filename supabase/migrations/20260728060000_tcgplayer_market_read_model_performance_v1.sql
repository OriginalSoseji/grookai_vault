-- TCGPlayer Market Product V1 read-path performance repair.
--
-- The original shared RPC joined aggregate views before applying requested
-- card IDs. PostgreSQL therefore scanned the full active-listing evidence lane
-- for every detail and grid request. Keep the public contract unchanged while
-- restricting expensive evidence work to the requested current printings.

create index if not exists market_price_qualification_parent_idx
  on public.market_price_qualification_decisions(
    card_print_id,
    evaluated_at desc,
    id desc
  )
  where card_print_id is not null;

create materialized view public.mv_market_listing_active_ask_current_v1 as
select
  active_ask.card_print_id,
  active_ask.card_printing_id,
  active_ask.printing_gv_id,
  active_ask.finish_key,
  active_ask.currency,
  active_ask.lowest_active_ask,
  active_ask.median_active_ask,
  active_ask.listing_count,
  active_ask.seller_count,
  active_ask.observed_at
from public.v_market_listing_variant_active_ask_exact_v1 active_ask
with data;

create unique index mv_market_listing_active_ask_current_printing_uidx
  on public.mv_market_listing_active_ask_current_v1(card_printing_id);

create index mv_market_listing_active_ask_current_parent_idx
  on public.mv_market_listing_active_ask_current_v1(card_print_id);

create or replace function public.get_market_pricing_read_model_v1(
  p_card_print_ids uuid[] default null,
  p_card_printing_ids uuid[] default null
)
returns table (
  pricing_scope text,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  status text,
  unavailable_reason text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  freshness text,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_parents as materialized (
    select distinct requested.card_print_id
    from unnest(coalesce(p_card_print_ids, '{}'::uuid[]))
      as requested(card_print_id)
  ),
  requested_printings as materialized (
    select distinct requested.card_printing_id
    from unnest(coalesce(p_card_printing_ids, '{}'::uuid[]))
      as requested(card_printing_id)
  ),
  requested_parent_prices as materialized (
    select current_price.*
    from requested_parents requested
    join public.v_market_price_current_v1 current_price
      on current_price.card_print_id = requested.card_print_id
  ),
  requested_printing_prices as materialized (
    select current_price.*
    from requested_printings requested
    join public.v_market_price_current_v1 current_price
      on current_price.card_printing_id = requested.card_printing_id
  ),
  parent_summaries as materialized (
    select
      current_price.card_print_id,
      current_price.gv_id,
      current_price.currency,
      min(current_price.market_price)::numeric as market_close,
      count(*)::integer as eligible_printing_count,
      (count(*) > 1) as is_from_price,
      max(current_price.observed_at) as observed_at,
      'fresh'::text as freshness,
      case
        when count(*) = 1
          then (array_agg(current_price.provenance_id))[1]
        else null
      end as provenance_id,
      min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
      sum(coalesce(active_ask.listing_count, 0))::integer
        as active_ask_listing_count,
      max(active_ask.observed_at) as active_ask_observed_at
    from requested_parent_prices current_price
    left join public.mv_market_listing_active_ask_current_v1 active_ask
      on active_ask.card_printing_id = current_price.card_printing_id
    group by
      current_price.card_print_id,
      current_price.gv_id,
      current_price.currency
  ),
  latest_parent_decisions as materialized (
    select
      requested.card_print_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_parents requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_print_id = requested.card_print_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  ),
  latest_printing_decisions as materialized (
    select
      requested.card_printing_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_printings requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_printing_id = requested.card_printing_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  )
  select
    'parent'::text,
    requested.card_print_id,
    null::uuid,
    card.gv_id,
    null::text,
    null::text,
    case when parent.card_print_id is null then 'unavailable' else 'available' end,
    case
      when parent.card_print_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case
      when parent.is_from_price then 'From TCGPlayer Market'
      else 'TCGPlayer Market'
    end,
    parent.observed_at,
    coalesce(parent.freshness, latest.freshness_result, 'unavailable'),
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric,
    coalesce(parent.is_from_price, false),
    coalesce(parent.eligible_printing_count, 0),
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from requested_parents requested
  left join public.card_prints card
    on card.id = requested.card_print_id
  left join parent_summaries parent
    on parent.card_print_id = requested.card_print_id
  left join latest_parent_decisions latest
    on latest.card_print_id = requested.card_print_id

  union all

  select
    'card_printing'::text,
    printing.card_print_id,
    requested.card_printing_id,
    card.gv_id,
    printing.printing_gv_id,
    printing.finish_key,
    case when exact.card_printing_id is null then 'unavailable' else 'available' end,
    case
      when exact.card_printing_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    exact.currency,
    exact.market_price,
    'tcgplayer'::text,
    'TCGPlayer Market'::text,
    exact.observed_at,
    coalesce(exact.freshness, latest.freshness_result, 'unavailable'),
    exact.low_price,
    exact.mid_price,
    exact.high_price,
    exact.direct_low_price,
    false,
    case when exact.card_printing_id is null then 0 else 1 end,
    active_ask.lowest_active_ask,
    active_ask.listing_count,
    active_ask.observed_at,
    exact.provenance_id
  from requested_printings requested
  left join public.card_printings printing
    on printing.id = requested.card_printing_id
  left join public.card_prints card
    on card.id = printing.card_print_id
  left join requested_printing_prices exact
    on exact.card_printing_id = requested.card_printing_id
  left join public.mv_market_listing_active_ask_current_v1 active_ask
    on active_ask.card_printing_id = requested.card_printing_id
  left join latest_printing_decisions latest
    on latest.card_printing_id = requested.card_printing_id
  order by 1, 2, 6 nulls first;
$$;

revoke all on function public.get_market_pricing_read_model_v1(uuid[], uuid[])
  from public, anon;
grant execute on function public.get_market_pricing_read_model_v1(uuid[], uuid[])
  to authenticated, service_role;

revoke all on public.mv_market_listing_active_ask_current_v1
  from public, anon, authenticated;
grant select on public.mv_market_listing_active_ask_current_v1 to service_role;

comment on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) is
  'Authenticated shared TCGPlayer Market pricing read model with request-scoped current-price and latest-decision work plus a background-refreshed exact active-ask snapshot.';

comment on materialized view public.mv_market_listing_active_ask_current_v1 is
  'Background-refreshed exact-printing eBay active-ask signal. Product reads must never scan the raw listing warehouse.';
