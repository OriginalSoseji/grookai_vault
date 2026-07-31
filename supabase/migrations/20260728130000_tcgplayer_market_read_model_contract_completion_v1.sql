-- Complete the TCGPlayer Market Product V1 shared read contract.
--
-- The existing V1 function omitted the publication timestamp and discarded
-- exact-printing identity from parent results. Parent summaries are now
-- grounded in the deterministic minimum eligible exact printing. The
-- pricing_scope and is_from_price fields continue to distinguish a parent
-- summary from an exact-printing request.

drop function if exists public.get_market_pricing_read_model_v1(uuid[], uuid[]);

create function public.get_market_pricing_read_model_v1(
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
  published_at timestamptz,
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
  ranked_parent_prices as materialized (
    select
      current_price.*,
      count(*) over (
        partition by current_price.card_print_id
      )::integer as eligible_printing_count,
      row_number() over (
        partition by current_price.card_print_id
        order by
          current_price.market_price asc,
          current_price.published_at desc,
          current_price.observed_at desc,
          current_price.card_printing_id asc
      ) as parent_price_rank
    from requested_parent_prices current_price
  ),
  parent_active_asks as materialized (
    select
      current_price.card_print_id,
      min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
      sum(coalesce(active_ask.listing_count, 0))::integer
        as active_ask_listing_count,
      max(active_ask.observed_at) as active_ask_observed_at
    from requested_parent_prices current_price
    left join public.mv_market_listing_active_ask_current_v1 active_ask
      on active_ask.card_printing_id = current_price.card_printing_id
    group by current_price.card_print_id
  ),
  parent_summaries as materialized (
    select
      selected.card_print_id,
      selected.card_printing_id,
      selected.gv_id,
      selected.printing_gv_id,
      selected.finish_key,
      selected.currency,
      selected.market_price::numeric as market_close,
      selected.eligible_printing_count,
      (selected.eligible_printing_count > 1) as is_from_price,
      selected.observed_at,
      selected.published_at,
      selected.freshness,
      selected.provenance_id,
      active_ask.lowest_active_ask,
      active_ask.active_ask_listing_count,
      active_ask.active_ask_observed_at
    from ranked_parent_prices selected
    left join parent_active_asks active_ask
      on active_ask.card_print_id = selected.card_print_id
    where selected.parent_price_rank = 1
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
    parent.card_printing_id,
    card.gv_id,
    parent.printing_gv_id,
    parent.finish_key,
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
    parent.published_at,
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
    exact.published_at,
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
  from public, anon, authenticated, service_role;
grant execute on function public.get_market_pricing_read_model_v1(uuid[], uuid[])
  to authenticated, service_role;

create or replace view public.v_market_price_parent_summary_v1 as
with ranked_parent_prices as (
  select
    current_price.*,
    count(*) over (
      partition by current_price.card_print_id
    )::integer as eligible_printing_count,
    row_number() over (
      partition by current_price.card_print_id
      order by
        current_price.market_price asc,
        current_price.published_at desc,
        current_price.observed_at desc,
        current_price.card_printing_id asc
    ) as parent_price_rank
  from public.v_market_price_current_v1 current_price
),
parent_active_asks as (
  select
    current_price.card_print_id,
    min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
    sum(coalesce(active_ask.listing_count, 0))::integer
      as active_ask_listing_count,
    max(active_ask.observed_at) as active_ask_observed_at
  from public.v_market_price_current_v1 current_price
  left join public.mv_market_listing_active_ask_current_v1 active_ask
    on active_ask.card_printing_id = current_price.card_printing_id
  group by current_price.card_print_id
)
select
  selected.card_print_id,
  selected.gv_id,
  selected.currency,
  selected.market_price::numeric as market_close,
  selected.eligible_printing_count,
  (selected.eligible_printing_count > 1) as is_from_price,
  selected.observed_at,
  selected.freshness,
  selected.provenance_id,
  active_ask.lowest_active_ask,
  active_ask.active_ask_listing_count,
  active_ask.active_ask_observed_at,
  selected.card_printing_id,
  selected.printing_gv_id,
  selected.finish_key,
  selected.published_at
from ranked_parent_prices selected
left join parent_active_asks active_ask
  on active_ask.card_print_id = selected.card_print_id
where selected.parent_price_rank = 1;

revoke all on public.v_market_price_parent_summary_v1
  from public, anon, authenticated;
grant select on public.v_market_price_parent_summary_v1 to service_role;

drop function if exists public.get_top_market_pricing_v1(integer);

create function public.get_top_market_pricing_v1(p_limit integer default 100)
returns table (
  card_print_id uuid,
  gv_id text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  freshness text,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid,
  card_printing_id uuid,
  printing_gv_id text,
  finish_key text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    parent.card_print_id,
    parent.gv_id,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case
      when parent.is_from_price then 'From TCGPlayer Market'
      else 'TCGPlayer Market'
    end,
    parent.observed_at,
    parent.freshness,
    parent.is_from_price,
    parent.eligible_printing_count,
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id,
    parent.card_printing_id,
    parent.printing_gv_id,
    parent.finish_key,
    parent.published_at
  from public.v_market_price_parent_summary_v1 parent
  order by parent.market_close desc, parent.card_print_id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.get_top_market_pricing_v1(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_top_market_pricing_v1(integer)
  to authenticated, service_role;

comment on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) is
  'Authenticated TCGPlayer Market V1 read model. Parent summaries retain the deterministic minimum eligible exact printing identity and provenance; all available values expose observation and publication timestamps.';

comment on view public.v_market_price_parent_summary_v1 is
  'Service-role parent summary grounded in the deterministic minimum eligible exact printing. Active asks come only from the background-refreshed exact-printing materialized view.';

comment on function public.get_top_market_pricing_v1(integer) is
  'Authenticated ranked parent-card pricing read. Each row retains the selected minimum exact printing identity, provenance, observation timestamp, and publication timestamp.';
