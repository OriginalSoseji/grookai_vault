-- RETIRE-MEE-PUBLIC-PRICING-COMPATIBILITY-V1
-- Canonical SQL copy of migration 20260826053000.

create or replace view public.v_card_pricing_ui_v1
with (security_invoker = true)
as
select
  null::uuid as card_print_id,
  null::numeric(12,2) as primary_price,
  null::text as primary_source,
  null::numeric as grookai_value,
  null::numeric(12,2) as min_price,
  null::numeric(12,2) as max_price,
  null::bigint as variant_count,
  null::numeric(12,2) as ebay_median_price,
  null::integer as ebay_listing_count,
  null::text as currency,
  null::text as pricing_basis,
  null::text as display_label,
  null::text as confidence_label,
  null::text as freshness_label,
  null::timestamp with time zone as signal_at,
  null::timestamp with time zone as reviewed_at,
  null::boolean as market_truth,
  null::boolean as sold_comp,
  null::boolean as active_listing_evidence
where false;

revoke all on public.v_card_pricing_ui_v1
  from public, anon, authenticated, service_role;
grant select on public.v_card_pricing_ui_v1 to service_role;

comment on view public.v_card_pricing_ui_v1 is
  'Retired compatibility surface. Production V1 clients must use get_market_pricing_read_model_v1; this view intentionally returns zero rows.';
