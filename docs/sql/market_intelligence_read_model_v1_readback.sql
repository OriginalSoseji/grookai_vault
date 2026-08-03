-- MARKET_INTELLIGENCE_READ_MODEL_V1 production readback.

select
  to_regprocedure(
    'public.get_market_intelligence_read_model_v1(uuid[],uuid[])'
  ) is not null as function_exists,
  has_function_privilege(
    'anon',
    'public.get_market_intelligence_read_model_v1(uuid[],uuid[])',
    'EXECUTE'
  ) as anon_execute,
  has_function_privilege(
    'authenticated',
    'public.get_market_intelligence_read_model_v1(uuid[],uuid[])',
    'EXECUTE'
  ) as authenticated_execute,
  has_function_privilege(
    'service_role',
    'public.get_market_intelligence_read_model_v1(uuid[],uuid[])',
    'EXECUTE'
  ) as service_role_execute;

select
  count(*)::bigint as snapshot_rows,
  count(*) filter (where currency <> 'USD')::bigint as non_usd_rows,
  count(*) filter (
    where lowest_active_ask is null
       or median_active_ask is null
       or lowest_active_ask <= 0
       or round(median_active_ask, 2) < round(lowest_active_ask, 2)
       or listing_count < 1
       or seller_count < 0
  )::bigint as invalid_rows,
  count(*) filter (
    where observed_at < now() - interval '72 hours'
  )::bigint as stale_rows,
  min(observed_at) as oldest_observed_at,
  max(observed_at) as newest_observed_at
from public.mv_market_listing_active_ask_current_v1;

select
  count(*)::bigint as available_rows,
  count(*) filter (where is_market_value)::bigint as market_value_claim_rows,
  count(*) filter (where is_completed_sale)::bigint as completed_sale_claim_rows,
  count(*) filter (
    where source_name <> 'ebay_active'
       or source_label <> 'eBay active asks'
       or evidence_kind <> 'active_listing_ask'
  )::bigint as authority_mismatch_rows
from public.get_market_intelligence_read_model_v1(
  null,
  array(
    select card_printing_id
    from public.mv_market_listing_active_ask_current_v1
    order by observed_at desc, card_printing_id
    limit 25
  )
)
where status = 'available';
