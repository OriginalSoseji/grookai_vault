select jsonb_build_object(
  'package_id', 'MEE-REFERENCE-ANCHORED-PRICING-COMPAT-VIEW-V1',
  'compat_rows', (select count(*) from public.v_card_pricing_ui_v1),
  'compat_value_rows', (select count(*) from public.v_card_pricing_ui_v1 where primary_price is not null),
  'bridge_value_rows', (
    select count(*)
    from public.v_market_evidence_public_pricing_bridge_reference_anchored_v1
    where grookai_value_mid is not null
      and grookai_value_block_reason is null
      and market_truth = false
      and sold_comp = false
      and publishable = false
      and app_visible = false
  ),
  'boundary', jsonb_build_object(
    'ebay_primary_source_rows', (select count(*) from public.v_card_pricing_ui_v1 where primary_source = 'ebay'),
    'active_listing_market_estimate_rows', (select count(*) from public.v_card_pricing_ui_v1 where pricing_basis = 'active_listing_market_estimate'),
    'market_truth_rows', (select count(*) from public.v_card_pricing_ui_v1 where market_truth is true),
    'sold_comp_rows', (select count(*) from public.v_card_pricing_ui_v1 where sold_comp is true),
    'null_primary_price_rows', (select count(*) from public.v_card_pricing_ui_v1 where primary_price is null)
  ),
  'mightyena_regression_row', (
    select to_jsonb(row)
    from (
      select
        bridge.gv_id,
        compat.primary_price,
        compat.primary_source,
        compat.pricing_basis,
        compat.grookai_value,
        compat.ebay_median_price,
        bridge.grookai_value_mid,
        bridge.active_ask_mid,
        bridge.market_pressure_status,
        bridge.market_pressure_pct
      from public.v_market_evidence_public_pricing_bridge_reference_anchored_v1 bridge
      join public.v_card_pricing_ui_v1 compat
        on compat.card_print_id = bridge.card_print_id
      where bridge.gv_id = 'GV-PK-HP-101'
      limit 1
    ) row
  )
) as readback;
