-- MEE_REFERENCE_ANCHORED_PRICING_COMPAT_VIEW_V1
-- DB-wide compatibility bridge for legacy app surfaces that still read
-- public.v_card_pricing_ui_v1.
--
-- This does not write prices. It redefines the compatibility view so
-- primary_price is Grookai Value from the reference/evidence-anchored bridge,
-- never active eBay ask.

do $$
begin
  if to_regclass('public.v_market_evidence_public_pricing_bridge_reference_anchored_v1') is null then
    raise notice 'Skipping v_card_pricing_ui_v1 reference-anchored compat rewrite; source view is not present in this migration chain.';
    return;
  end if;

  execute $view$
    create or replace view public.v_card_pricing_ui_v1
    with (security_invoker = true)
    as
    select
      bridge.card_print_id::uuid as card_print_id,
      bridge.grookai_value_mid::numeric(12,2) as primary_price,
      'grookai_value'::text as primary_source,
      bridge.grookai_value_mid::numeric as grookai_value,
      bridge.grookai_value_low::numeric(12,2) as min_price,
      bridge.grookai_value_high::numeric(12,2) as max_price,
      coalesce(bridge.reference_eligible_evidence_count, 0)::bigint as variant_count,
      bridge.active_ask_mid::numeric(12,2) as ebay_median_price,
      bridge.active_ask_listing_count::integer as ebay_listing_count,
      coalesce(bridge.currency, 'USD')::text as currency,
      'evidence_anchored_grookai_value'::text as pricing_basis,
      'Evidence-anchored Grookai Value'::text as display_label,
      bridge.confidence_label::text as confidence_label,
      bridge.freshness_label::text as freshness_label,
      bridge.active_ask_signal_at as signal_at,
      null::timestamp with time zone as reviewed_at,
      false::boolean as market_truth,
      false::boolean as sold_comp,
      bridge.active_listing_evidence::boolean as active_listing_evidence
    from public.v_market_evidence_public_pricing_bridge_reference_anchored_v1 bridge
    where bridge.grookai_value_mid is not null
      and bridge.grookai_value_block_reason is null
      and bridge.market_truth = false
      and bridge.sold_comp = false
      and bridge.publishable = false
      and bridge.app_visible = false
  $view$;

  execute 'revoke all on public.v_card_pricing_ui_v1 from public, anon, authenticated, service_role';
  execute 'grant select on public.v_card_pricing_ui_v1 to authenticated, service_role';
end
$$;
