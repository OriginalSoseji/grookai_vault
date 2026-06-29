-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 local migration candidate.
-- Purpose: service-role-only Market Evidence Engine review action apply function.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- The function may write only when later invoked: one action event insert and one matching
-- review disposition update under optimistic locking. This candidate does not invoke it.

begin;

create or replace function public.apply_market_evidence_review_action_v1(
  p_disposition_id uuid,
  p_expected_updated_at timestamptz,
  p_action_name text,
  p_review_actor text,
  p_reason_code text default null,
  p_review_note text default null,
  p_action_payload jsonb default '{}'::jsonb
)
returns table (
  action_event_id uuid,
  disposition_id uuid,
  card_print_id uuid,
  action_name text,
  from_status text,
  to_status text,
  from_disposition text,
  to_disposition text,
  review_actor text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.market_evidence_review_dispositions%rowtype;
  v_to_status text;
  v_to_disposition text;
  v_event_id uuid;
  v_action_payload jsonb := coalesce(p_action_payload, '{}'::jsonb);
begin
  if p_disposition_id is null then
    raise exception 'disposition_id_required' using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    raise exception 'expected_updated_at_required' using errcode = '22023';
  end if;

  if p_review_actor is null or btrim(p_review_actor) = '' then
    raise exception 'review_actor_required' using errcode = '22023';
  end if;

  if p_action_name not in (
    'start_review',
    'confirm_internal_candidate',
    'require_split',
    'block_evidence',
    'block_classification',
    'request_reclassification',
    'defer_more_evidence',
    'reference_crosscheck',
    'defer_active_market_evidence',
    'confirm_monitor_only'
  ) then
    raise exception 'invalid_review_action: %', p_action_name using errcode = '22023';
  end if;

  if p_reason_code is not null and p_reason_code not in (
    'approved_internal_raw_single_signal',
    'approved_internal_slab_signal',
    'mixed_raw_slab_requires_split',
    'classification_noise',
    'wrong_identity',
    'unresolved_match_ambiguity',
    'lot_bulk_sealed_proxy_noise',
    'reference_only_no_market_support',
    'low_signal_sample',
    'insufficient_source_independence',
    'stale_signal',
    'special_lane_ambiguous',
    'manual_hold'
  ) then
    raise exception 'invalid_review_reason_code: %', p_reason_code using errcode = '22023';
  end if;

  if p_action_name not in ('start_review', 'confirm_monitor_only') and p_reason_code is null then
    raise exception 'reason_code_required_for_action: %', p_action_name using errcode = '22023';
  end if;

  select *
    into v_row
  from public.market_evidence_review_dispositions
  where id = p_disposition_id
  for update;

  if not found then
    raise exception 'review_disposition_not_found: %', p_disposition_id using errcode = 'P0002';
  end if;

  if v_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'review_disposition_optimistic_lock_failed' using errcode = '40001';
  end if;

  if v_row.publication_gate_candidate
    or v_row.can_publish_price_directly
    or v_row.publishable
    or v_row.app_visible
    or v_row.market_truth then
    raise exception 'review_disposition_public_flags_present' using errcode = '23514';
  end if;

  case p_action_name
    when 'start_review' then
      if v_row.review_status <> 'pending'
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'classification_review', 'reference_only_review') then
        raise exception 'invalid_transition_start_review' using errcode = '23514';
      end if;
      v_to_status := 'in_review';
      v_to_disposition := v_row.review_disposition;

    when 'confirm_internal_candidate' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review')
        or v_row.evidence_lane not in ('raw_single', 'slab') then
        raise exception 'invalid_transition_confirm_internal_candidate' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_confirmed_internal_candidate';

    when 'require_split' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.evidence_lane <> 'mixed_raw_slab' then
        raise exception 'invalid_transition_require_split' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_split_required';

    when 'block_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'reference_only_review', 'low_signal_monitor') then
        raise exception 'invalid_transition_block_evidence' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_blocked';

    when 'block_classification' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'classification_review'
        or v_row.evidence_lane <> 'classification_blocked' then
        raise exception 'invalid_transition_block_classification' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_blocked_classification';

    when 'request_reclassification' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'classification_review' then
        raise exception 'invalid_transition_request_reclassification' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_reclassify';

    when 'defer_more_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'classification_review', 'low_signal_monitor') then
        raise exception 'invalid_transition_defer_more_evidence' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_defer_more_evidence';

    when 'reference_crosscheck' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'reference_only_review'
        or v_row.evidence_lane <> 'reference_metric' then
        raise exception 'invalid_transition_reference_crosscheck' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_reference_crosscheck';

    when 'defer_active_market_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'reference_only_review'
        or v_row.evidence_lane <> 'reference_metric' then
        raise exception 'invalid_transition_defer_active_market_evidence' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_defer_active_market_evidence';

    when 'confirm_monitor_only' then
      if v_row.review_status not in ('pending', 'in_review', 'resolved')
        or v_row.review_lane <> 'low_signal_monitor' then
        raise exception 'invalid_transition_confirm_monitor_only' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'monitor_only';
  end case;

  insert into public.market_evidence_review_action_events (
    disposition_id,
    card_print_id,
    gv_id,
    action_name,
    from_status,
    to_status,
    from_disposition,
    to_disposition,
    review_lane,
    evidence_lane,
    reason_code,
    review_note,
    action_payload,
    review_actor,
    expected_disposition_updated_at,
    publication_gate_candidate,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  )
  values (
    v_row.id,
    v_row.card_print_id,
    v_row.gv_id,
    p_action_name,
    v_row.review_status,
    v_to_status,
    v_row.review_disposition,
    v_to_disposition,
    v_row.review_lane,
    v_row.evidence_lane,
    p_reason_code,
    p_review_note,
    v_action_payload,
    p_review_actor,
    p_expected_updated_at,
    false,
    false,
    false,
    false,
    false
  )
  returning id into v_event_id;

  update public.market_evidence_review_dispositions
  set
    review_status = v_to_status,
    review_disposition = v_to_disposition,
    review_actor = p_review_actor,
    reviewed_at = now(),
    review_payload = coalesce(review_payload, '{}'::jsonb) || jsonb_build_object(
      'last_action_name', p_action_name,
      'last_reason_code', p_reason_code,
      'last_action_event_id', v_event_id,
      'last_review_note_present', p_review_note is not null
    ),
    needs_review = case when v_to_status in ('resolved', 'blocked') then false else true end,
    publication_gate_candidate = false,
    can_publish_price_directly = false,
    publishable = false,
    app_visible = false,
    market_truth = false,
    updated_at = now()
  where id = v_row.id
    and updated_at is not distinct from p_expected_updated_at;

  if not found then
    raise exception 'review_disposition_update_lost_optimistic_lock' using errcode = '40001';
  end if;

  return query
  select
    v_event_id,
    v_row.id,
    v_row.card_print_id,
    p_action_name,
    v_row.review_status,
    v_to_status,
    v_row.review_disposition,
    v_to_disposition,
    p_review_actor;
end;
$$;

revoke all on function public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1'::text as package_id,
  1::int as proposed_function_count,
  true::boolean as service_role_only,
  true::boolean as optimistic_locking,
  true::boolean as inserts_one_action_event_when_invoked,
  true::boolean as updates_one_disposition_when_invoked,
  false::boolean as invoked_by_this_migration,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

commit;
