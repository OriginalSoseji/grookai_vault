
-- MEE_CORE_LIFECYCLE_BACKFILL_BATCH_V1 readback SQL.
-- Run only after an explicitly approved apply package.
with expected_observations(id) as (
  values
    
),
expected_events(event_hash) as (
  values
    
),
obs as (
  select o.*
  from public.market_evidence_observations o
  join expected_observations e on e.id = o.id
),
evt as (
  select e.*
  from public.market_evidence_lifecycle_events e
  join expected_events x on x.event_hash = e.event_hash
),
stage_sequences as (
  select
    observation_id,
    jsonb_agg(to_state order by stage_order) as stages,
    count(*) as event_count,
    bool_or(publishable is distinct from false) as publishable_leak,
    bool_or(app_visible is distinct from false) as app_visible_leak,
    bool_or(market_truth is distinct from false) as market_truth_leak,
    bool_or(needs_review is distinct from true) as needs_review_leak
  from evt
  group by observation_id
)
select jsonb_build_object(
  'observations', jsonb_build_object(
    'expected', 0,
    'actual', (select count(*) from obs)
  ),
  'events', jsonb_build_object(
    'expected', 0,
    'actual', (select count(*) from evt),
    'distinct_event_hashes', (select count(distinct event_hash) from evt)
  ),
  'current_view', jsonb_build_object(
    'expected', 0,
    'actual', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
    ),
    'app_visible_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.app_visible is distinct from false
    ),
    'market_truth_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.market_truth is distinct from false
    )
  ),
  'stage_sequences', coalesce((
    select jsonb_agg(to_jsonb(stage_sequences) order by observation_id)
    from stage_sequences
  ), '[]'::jsonb),
  'public_pricing_surface', jsonb_build_object(
    'pricing_observations_count', (select count(*) from public.pricing_observations),
    'v_card_pricing_references_market_evidence', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%'
  )
)::text as report;
