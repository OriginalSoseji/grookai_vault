-- MEE_INTERNAL_PRICE_READ_MODEL_V1
-- Signed-in fallback read model for internal Ollama-approved raw-single signals.
-- TCGPlayer remains the primary pricing source in get_market_pricing_read_model_v1.
-- This function never writes, publishes market truth, or exposes anonymous pricing.

begin;

create or replace function public.get_market_evidence_pricing_read_model_v1(
  p_card_print_ids uuid[] default null::uuid[]
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
set search_path = public, pg_temp
as $$
  select
    'parent'::text,
    signal.card_print_id,
    null::uuid,
    signal.gv_id,
    null::text,
    null::text,
    'available'::text,
    null::text,
    signal.currency,
    signal.candidate_median,
    'ebay'::text,
    'eBay Active Listings'::text,
    signal.signal_at,
    signal.price_review_event_created_at,
    case
      when signal.signal_at >= now() - interval '3 days' then 'fresh'
      when signal.signal_at >= now() - interval '14 days' then 'aging'
      else 'stale'
    end,
    signal.candidate_low,
    signal.candidate_median,
    signal.candidate_high,
    signal.candidate_low,
    false,
    1,
    signal.minimum_active_ask,
    signal.evidence_count,
    signal.signal_at,
    case
      when signal.source_rollup_id ~ '^[0-9a-fA-F-]{36}$'
        then signal.source_rollup_id::uuid
      else (
        substr(md5(coalesce(signal.source_rollup_id, signal.gv_id)), 1, 8) || '-' ||
        substr(md5(coalesce(signal.source_rollup_id, signal.gv_id)), 9, 4) || '-' ||
        substr(md5(coalesce(signal.source_rollup_id, signal.gv_id)), 13, 4) || '-' ||
        substr(md5(coalesce(signal.source_rollup_id, signal.gv_id)), 17, 4) || '-' ||
        substr(md5(coalesce(signal.source_rollup_id, signal.gv_id)), 21, 12)
      )::uuid
    end
  from public.v_market_evidence_internal_approved_price_signals_v1 signal
  where signal.source_type = 'active_listing'
    and signal.evidence_lane = 'raw_single'
    and signal.card_print_id = any(coalesce(p_card_print_ids, '{}'::uuid[]))
    and signal.currency = 'USD'
    and signal.candidate_median is not null
    and signal.candidate_median > 0
    and signal.signal_at >= now() - interval '14 days';
$$;

revoke all on function public.get_market_evidence_pricing_read_model_v1(uuid[])
  from public, anon;
grant execute on function public.get_market_evidence_pricing_read_model_v1(uuid[])
  to authenticated, service_role;

comment on function public.get_market_evidence_pricing_read_model_v1(uuid[]) is
  'Signed-in MEE raw-single fallback read model. TCGPlayer remains primary; no writes or anonymous access.';

commit;
