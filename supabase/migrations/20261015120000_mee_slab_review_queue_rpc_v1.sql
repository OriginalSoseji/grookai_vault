-- MEE_SLAB_REVIEW_QUEUE_RPC_V1
-- Founder-only read queue for internal slab evidence review.
-- This exposes review context, never an app pricing read model.

begin;

create or replace function public.get_market_evidence_slab_review_queue_v1(
  p_limit integer default 100,
  p_review_states text[] default null::text[]
)
returns table (
  event_id uuid,
  card_print_id uuid,
  gv_id text,
  source_rollup_id text,
  currency text,
  candidate_median numeric,
  candidate_low numeric,
  candidate_high numeric,
  minimum_active_ask numeric,
  maximum_active_ask numeric,
  evidence_count integer,
  seller_count integer,
  action_name text,
  review_state text,
  reason_code text,
  review_note text,
  model_review jsonb,
  signal_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null or not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;

  return query
  with current_events as (
    select distinct on (event.source_rollup_id)
      event.id,
      event.card_print_id,
      event.gv_id,
      event.source_rollup_id,
      event.currency,
      event.candidate_median,
      event.candidate_low,
      event.candidate_high,
      event.minimum_active_ask,
      event.maximum_active_ask,
      event.evidence_count,
      event.seller_count,
      event.action_name,
      event.review_state,
      event.reason_code,
      event.review_note,
      event.action_payload -> 'model_review' as model_review,
      event.signal_at,
      event.created_at
    from public.market_evidence_slab_review_events event
    where p_review_states is null
       or event.review_state = any (p_review_states)
    order by event.source_rollup_id, event.created_at desc, event.id desc
  )
  select
    current_events.id,
    current_events.card_print_id,
    current_events.gv_id,
    current_events.source_rollup_id,
    current_events.currency,
    current_events.candidate_median,
    current_events.candidate_low,
    current_events.candidate_high,
    current_events.minimum_active_ask,
    current_events.maximum_active_ask,
    current_events.evidence_count,
    current_events.seller_count,
    current_events.action_name,
    current_events.review_state,
    current_events.reason_code,
    current_events.review_note,
    current_events.model_review,
    current_events.signal_at,
    current_events.created_at
  from current_events
  order by
    case current_events.review_state
      when 'manual_hold' then 0
      when 'deferred' then 1
      when 'rejected' then 2
      else 3
    end,
    current_events.created_at asc,
    current_events.id asc
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$function$;

revoke all on function public.get_market_evidence_slab_review_queue_v1(integer, text[])
  from public, anon, authenticated;
grant execute on function public.get_market_evidence_slab_review_queue_v1(integer, text[])
  to authenticated, service_role;

comment on function public.get_market_evidence_slab_review_queue_v1(integer, text[]) is
  'Founder-only internal slab evidence review queue. Read-only; never an app pricing or publication source.';

commit;
