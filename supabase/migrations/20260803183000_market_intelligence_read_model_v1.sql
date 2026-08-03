-- MARKET_INTELLIGENCE_READ_MODEL_V1
-- Signed-in, exact-printing active-ask intelligence.
-- TCGPlayer Market remains the pricing authority. This function exposes no
-- completed-sale or market-value claim and never reads the raw warehouse.

begin;

create or replace function public.get_market_intelligence_read_model_v1(
  p_card_print_ids uuid[] default null,
  p_card_printing_ids uuid[] default null
)
returns table (
  market_intelligence_version text,
  card_print_id uuid,
  card_printing_id uuid,
  printing_gv_id text,
  finish_key text,
  status text,
  unavailable_reason text,
  currency text,
  lowest_active_ask numeric,
  median_active_ask numeric,
  listing_count integer,
  seller_count integer,
  ask_spread numeric,
  ask_spread_pct numeric,
  observed_at timestamptz,
  freshness text,
  evidence_strength text,
  source_name text,
  source_label text,
  evidence_kind text,
  is_market_value boolean,
  is_completed_sale boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with requested_printings as materialized (
    select requested.card_printing_id
    from (
      select unnest(coalesce(p_card_printing_ids, '{}'::uuid[])) as card_printing_id

      union

      select printing.id
      from unnest(coalesce(p_card_print_ids, '{}'::uuid[])) parent(card_print_id)
      join public.card_printings printing
        on printing.card_print_id = parent.card_print_id
    ) requested
    where requested.card_printing_id is not null
    order by requested.card_printing_id
    limit 500
  ),
  evidence as materialized (
    select
      requested.card_printing_id,
      active_ask.card_print_id,
      active_ask.printing_gv_id,
      active_ask.finish_key,
      active_ask.currency,
      active_ask.lowest_active_ask,
      active_ask.median_active_ask,
      active_ask.listing_count,
      active_ask.seller_count,
      active_ask.observed_at,
      active_ask.currency = 'USD'
        and active_ask.lowest_active_ask > 0
        and active_ask.median_active_ask >= active_ask.lowest_active_ask
        and active_ask.listing_count >= 1
        and active_ask.seller_count >= 0
        and active_ask.observed_at >= now() - interval '72 hours' as is_usable
    from requested_printings requested
    left join public.mv_market_listing_active_ask_current_v1 active_ask
      on active_ask.card_printing_id = requested.card_printing_id
  )
  select
    'MARKET_INTELLIGENCE_READ_MODEL_V1'::text,
    printing.card_print_id,
    printing.id,
    printing.printing_gv_id,
    printing.finish_key,
    case
      when evidence.card_print_id is null then 'unavailable'
      when evidence.is_usable is not true then 'unavailable'
      else 'available'
    end::text,
    case
      when evidence.card_print_id is null then 'no_exact_active_ask_evidence'
      when evidence.observed_at < now() - interval '72 hours'
        then 'stale_active_ask_snapshot'
      when evidence.is_usable is not true then 'invalid_active_ask_evidence'
      else null
    end::text,
    case when evidence.is_usable then evidence.currency else null end,
    case when evidence.is_usable then evidence.lowest_active_ask else null end,
    case when evidence.is_usable then evidence.median_active_ask else null end,
    case when evidence.is_usable then evidence.listing_count else 0 end,
    case when evidence.is_usable then evidence.seller_count else 0 end,
    case
      when evidence.is_usable then round(
        greatest(evidence.median_active_ask - evidence.lowest_active_ask, 0),
        2
      )
      else null
    end,
    case
      when evidence.is_usable and evidence.median_active_ask > 0 then round(
        greatest(
          ((evidence.median_active_ask - evidence.lowest_active_ask)
            / evidence.median_active_ask) * 100,
          0
        ),
        2
      )
      else null
    end,
    case when evidence.is_usable then evidence.observed_at else null end,
    case
      when evidence.card_print_id is null then 'unavailable'
      when evidence.is_usable then 'fresh'
      else 'stale'
    end::text,
    case
      when not coalesce(evidence.is_usable, false) then null
      when evidence.listing_count >= 5 and evidence.seller_count >= 3 then 'strong'
      when evidence.listing_count >= 2 and evidence.seller_count >= 2 then 'moderate'
      else 'limited'
    end::text,
    'ebay_active'::text,
    'eBay active asks'::text,
    'active_listing_ask'::text,
    false,
    false
  from requested_printings requested
  join public.card_printings printing
    on printing.id = requested.card_printing_id
  left join evidence
    on evidence.card_printing_id = requested.card_printing_id
  order by printing.card_print_id, printing.finish_key, printing.id;
$$;

revoke all on function public.get_market_intelligence_read_model_v1(uuid[], uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.get_market_intelligence_read_model_v1(uuid[], uuid[])
  to authenticated, service_role;

comment on function public.get_market_intelligence_read_model_v1(uuid[], uuid[]) is
  'Authenticated exact-printing eBay active-ask intelligence. Values are asking-price evidence, not TCGPlayer Market, completed sales, or Grookai Value.';

commit;
