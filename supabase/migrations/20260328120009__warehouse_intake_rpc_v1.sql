drop function if exists public.warehouse_intake_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  jsonb
);

create or replace function public.warehouse_intake_v1(
  p_notes text,
  p_tcgplayer_id text,
  p_submission_intent text,
  p_intake_channel text,
  p_identity_snapshot_id uuid,
  p_condition_snapshot_id uuid,
  p_identity_scan_event_id uuid,
  p_images jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate_id uuid;
  v_now timestamptz := now();
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'auth_required';
  end if;

  p_tcgplayer_id := nullif(trim(p_tcgplayer_id), '');

  if p_notes is null or length(trim(p_notes)) = 0 then
    raise exception 'notes_required';
  end if;

  if p_submission_intent is null then
    raise exception 'submission_intent_required';
  end if;

  if p_submission_intent not in ('MISSING_CARD', 'MISSING_IMAGE') then
    raise exception 'invalid_submission_intent';
  end if;

  if p_intake_channel is null then
    raise exception 'intake_channel_required';
  end if;

  if p_intake_channel not in ('SCAN', 'UPLOAD', 'MANUAL') then
    raise exception 'invalid_intake_channel';
  end if;

  if p_images is not null and jsonb_typeof(p_images) <> 'array' then
    raise exception 'invalid_images_payload';
  end if;

  if p_identity_snapshot_id is null
     and p_condition_snapshot_id is null
     and p_identity_scan_event_id is null
     and coalesce(jsonb_array_length(p_images), 0) = 0 then
    raise exception 'evidence_required';
  end if;

  if p_submission_intent = 'MISSING_IMAGE'
     and p_tcgplayer_id is null
     and p_identity_snapshot_id is null then
    raise exception 'missing_image_requires_reference';
  end if;

  if p_images is not null and exists (
    select 1
    from jsonb_array_elements(p_images) as img
    where img->>'type' not in ('front', 'back')
       or nullif(trim(img->>'storage_path'), '') is null
  ) then
    raise exception 'invalid_images_payload';
  end if;

  insert into public.canon_warehouse_candidates (
    submitted_by_user_id,
    intake_channel,
    submission_type,
    notes,
    tcgplayer_id,
    submission_intent,
    state,
    claimed_identity_payload,
    reference_hints_payload,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    p_intake_channel,
    'USER_SUBMISSION',
    trim(p_notes),
    p_tcgplayer_id,
    p_submission_intent,
    'RAW',
    '{}'::jsonb,
    '{}'::jsonb,
    v_now,
    v_now
  )
  returning id into v_candidate_id;

  if p_identity_snapshot_id is not null then
    insert into public.canon_warehouse_candidate_evidence (
      candidate_id,
      evidence_kind,
      identity_snapshot_id,
      metadata_payload,
      created_by_user_id,
      created_at
    )
    values (
      v_candidate_id,
      'IDENTITY_SNAPSHOT',
      p_identity_snapshot_id,
      '{}'::jsonb,
      v_user_id,
      v_now
    );
  end if;

  if p_condition_snapshot_id is not null then
    insert into public.canon_warehouse_candidate_evidence (
      candidate_id,
      evidence_kind,
      condition_snapshot_id,
      metadata_payload,
      created_by_user_id,
      created_at
    )
    values (
      v_candidate_id,
      'CONDITION_SNAPSHOT',
      p_condition_snapshot_id,
      '{}'::jsonb,
      v_user_id,
      v_now
    );
  end if;

  if p_identity_scan_event_id is not null then
    insert into public.canon_warehouse_candidate_evidence (
      candidate_id,
      evidence_kind,
      identity_scan_event_id,
      metadata_payload,
      created_by_user_id,
      created_at
    )
    values (
      v_candidate_id,
      'SCAN_EVENT',
      p_identity_scan_event_id,
      '{}'::jsonb,
      v_user_id,
      v_now
    );
  end if;

  if p_images is not null then
    insert into public.canon_warehouse_candidate_evidence (
      candidate_id,
      evidence_kind,
      evidence_slot,
      storage_path,
      metadata_payload,
      created_by_user_id,
      created_at
    )
    select
      v_candidate_id,
      'IMAGE',
      img->>'type',
      img->>'storage_path',
      '{}'::jsonb,
      v_user_id,
      v_now
    from jsonb_array_elements(p_images) as img;
  end if;

  insert into public.canon_warehouse_candidate_events (
    candidate_id,
    event_type,
    action,
    next_state,
    actor_user_id,
    actor_type,
    metadata,
    created_at
  )
  values (
    v_candidate_id,
    'INTAKE_CREATED',
    'CREATE',
    'RAW',
    v_user_id,
    'USER',
    '{}'::jsonb,
    v_now
  );

  return v_candidate_id;
exception
  when others then
    raise;
end;
$$;

revoke all on function public.warehouse_intake_v1(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  jsonb
) from public;

grant execute on function public.warehouse_intake_v1(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  jsonb
) to authenticated;

grant execute on function public.warehouse_intake_v1(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  jsonb
) to service_role;
