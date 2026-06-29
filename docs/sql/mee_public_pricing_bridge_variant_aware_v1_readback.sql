select jsonb_build_object(
  'readback_scope', 'bounded_function_arceus_charizard_and_mightyena',
  'sample_boundary_rows_checked', (
    select count(*)
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id in ('GV-PK-AR-1', 'GV-PK-HP-101')
  ),
  'sample_public_boundary_leak_rows', (
    select count(*)
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id in ('GV-PK-AR-1', 'GV-PK-HP-101')
      and (
        sample.market_truth is true
        or sample.sold_comp is true
        or sample.publishable is true
        or sample.app_visible is true
      )
  ),
  'sample_active_only_grookai_value_leak_rows', (
    select count(*)
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id in ('GV-PK-AR-1', 'GV-PK-HP-101')
      and sample.reference_anchor_mid is null
      and sample.active_ask_mid is not null
      and sample.grookai_value_mid is not null
  ),
  'variant_active_ask_rows', (
    select count(*)
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id = 'GV-PK-AR-1'
      and sample.pricing_scope = 'card_printing'
      and sample.active_ask_mid is not null
  ),
  'variant_grookai_value_rows', (
    select count(*)
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id = 'GV-PK-AR-1'
      and sample.pricing_scope = 'card_printing'
      and sample.grookai_value_mid is not null
  ),
  'arceus_charizard_variant_rows', (
    select jsonb_agg(
      jsonb_build_object(
        'pricing_scope', sample.pricing_scope,
        'gv_id', sample.gv_id,
        'card_printing_id', sample.card_printing_id,
        'printing_gv_id', sample.printing_gv_id,
        'assigned_finish_key', sample.assigned_finish_key,
        'active_ask_mid', sample.active_ask_mid,
        'active_ask_listing_count', sample.active_ask_listing_count,
        'slab_active_ask_mid', sample.slab_active_ask_mid,
        'grookai_value_mid', sample.grookai_value_mid,
        'grookai_value_block_reason', sample.grookai_value_block_reason
      )
      order by sample.pricing_scope, sample.assigned_finish_key nulls first, sample.printing_gv_id nulls first
    )
    from public.card_prints card
    cross join lateral public.get_market_evidence_public_pricing_bridge_variant_aware_v1(card.id) sample
    where card.gv_id = 'GV-PK-AR-1'
  )
) as readback;
