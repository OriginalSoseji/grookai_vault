-- MARKET_EVIDENCE_VARIANT_READ_MODELS_V1 readback.

select
  count(*)::bigint as reference_variant_rollup_rows,
  count(*) filter (where publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_reference_variant_signal_rollups_v1;

select
  count(*)::bigint as listing_variant_rollup_rows,
  count(*) filter (where evidence_lane = 'raw_single')::bigint as raw_single_variant_rollup_rows,
  count(*) filter (where evidence_lane = 'slab')::bigint as slab_variant_rollup_rows,
  count(*) filter (where publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_listing_variant_active_ask_rollups_v1;

select
  count(*)::bigint as variant_query_target_rows,
  count(*) filter (where finish_key = 'reverse')::bigint as reverse_query_targets,
  count(*) filter (where finish_key = 'holo')::bigint as holo_query_targets,
  count(*) filter (where finish_key = 'cracked_ice')::bigint as cracked_ice_query_targets,
  count(*) filter (where finish_key = 'cosmos')::bigint as cosmos_query_targets,
  count(*) filter (where source_fetch_allowed_by_this_view or can_publish_price_directly or app_visible or market_truth)::bigint as boundary_leak_rows
from public.v_market_listing_variant_query_targets_v1;

select
  card_print_id,
  gv_id,
  card_printing_id,
  printing_gv_id,
  assigned_finish_key,
  reference_low,
  reference_median,
  reference_high,
  source_count,
  eligible_evidence_count,
  publishable,
  app_visible,
  market_truth
from public.v_market_reference_variant_signal_rollups_v1
where card_print_id = 'a02f871c-fe3e-432b-944d-6decea0eecdf'
order by assigned_finish_key;

select
  card_print_id,
  gv_id,
  card_printing_id,
  printing_gv_id,
  finish_key,
  ebay_finish_phrase,
  ebay_query_text,
  acquisition_priority,
  source_fetch_allowed_by_this_view,
  can_publish_price_directly,
  app_visible,
  market_truth
from public.v_market_listing_variant_query_targets_v1
where card_print_id = 'a02f871c-fe3e-432b-944d-6decea0eecdf'
order by finish_key;
