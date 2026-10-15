-- MEE_SLAB_LISTING_IDENTITY_READ_MODEL_V1
-- Normalize slab grader/grade evidence at listing level for internal policy review.
-- This is a service-role read model; it is not a pricing or publication source.

begin;

create or replace view public.v_market_evidence_slab_listing_identity_v1
with (security_invoker = true)
as
with extracted as (
  select
    event.id as event_id,
    event.observation_id,
    event.source_listing_id,
    event.event_payload -> 'target' ->> 'card_print_id' as card_print_id,
    coalesce(
      event.event_payload -> 'target' ->> 'gv_id',
      event.event_payload ->> 'gv_id'
    ) as gv_id,
    case
      when jsonb_typeof(event.event_payload -> 'slab_features' -> 'graders') = 'array'
        then event.event_payload -> 'slab_features' -> 'graders' ->> 0
      else null
    end as raw_grader,
    event.event_payload -> 'slab_features' ->> 'grade' as raw_grade,
    observation.listing_title,
    observation.condition_text,
    event.observed_at
  from public.market_listing_price_events event
  join public.market_listing_observations observation
    on observation.id = event.observation_id
  where event.event_payload ->> 'listing_evidence_class' = 'slab'
), normalized as (
  select
    extracted.*,
    public.normalize_slab_grader_v1(extracted.raw_grader) as grader,
    case
      when extracted.raw_grade ~ '^[0-9]+(\.[0-9]+)?$'
        then extracted.raw_grade::numeric
      else null
    end as grade_value
  from extracted
)
select
  normalized.event_id,
  normalized.observation_id,
  normalized.source_listing_id,
  normalized.card_print_id,
  normalized.gv_id,
  normalized.grader,
  normalized.grade_value,
  case
    when normalized.grader is null then 'missing_grader'
    when normalized.grade_value is null then 'missing_grade'
    else 'identified'
  end as identity_status,
  normalized.listing_title,
  normalized.condition_text,
  normalized.observed_at
from normalized;

revoke all on public.v_market_evidence_slab_listing_identity_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_slab_listing_identity_v1 to service_role;

comment on view public.v_market_evidence_slab_listing_identity_v1 is
  'Service-role slab listing identity read model. Normalizes grader and numeric grade for internal policy review only.';

commit;
