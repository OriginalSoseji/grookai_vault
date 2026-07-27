begin;

-- Collaboration transitions: join requests, member lifecycle, ownership,
-- guarded blocking/reporting, and immutable custom revisions.

create or replace function public.binder_close_member_contributions_v1(
  p_member_id uuid,
  p_active_next_state text,
  p_pending_next_state text,
  p_reason text,
  p_actor_kind text,
  p_actor_user_id uuid default null,
  p_service_source text default null,
  p_correlation_id text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_member public.binder_members%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_next_state text;
  v_count integer := 0;
begin
  select * into v_member
  from public.binder_members
  where id = p_member_id
  for update;
  if not found then return 0; end if;

  if p_active_next_state not in ('withdrawn', 'removed', 'invalidated')
     or p_pending_next_state not in ('withdrawn', 'rejected', 'invalidated') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  for v_contribution in
    select *
    from public.binder_contributions
    where contributor_member_id = p_member_id
      and state in ('pending', 'active')
    for update
  loop
    v_next_state := case
      when v_contribution.state = 'active' then p_active_next_state
      else p_pending_next_state
    end;

    update public.binder_contributions
    set
      state = v_next_state,
      decided_by_user_id = case when v_next_state = 'rejected' then p_actor_user_id else decided_by_user_id end,
      decided_at = case when v_next_state = 'rejected' then now() else decided_at end,
      terminal_by_user_id = p_actor_user_id,
      terminal_at = now()
    where id = v_contribution.id;

    perform public.binder_append_activity_v1(
      p_binder_id => v_member.binder_id,
      p_event_type => 'contribution_' || v_next_state,
      p_actor_kind => p_actor_kind,
      p_actor_user_id => p_actor_user_id,
      p_service_source => p_service_source,
      p_correlation_id => p_correlation_id,
      p_subject_member_id => v_member.id,
      p_contribution_id => v_contribution.id,
      p_payload => jsonb_build_object('reason', p_reason)
    );
    v_count := v_count + 1;
  end loop;

  if v_count > 0 then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_member.binder_id,
      p_actor_kind => p_actor_kind,
      p_actor_user_id => p_actor_user_id,
      p_service_source => p_service_source,
      p_correlation_id => p_correlation_id
    );
  end if;

  return v_count;
end;
$$;

create or replace function public.binder_internal_activate_member_v1(
  p_binder_id uuid,
  p_user_id uuid,
  p_role text,
  p_invited_by_user_id uuid default null
)
returns public.binder_members
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
begin
  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or p_role not in ('contributor', 'viewer', 'manager')
     or public.binder_pair_blocked_v1(p_user_id, v_binder.owner_user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1('binder:membership-user:' || p_user_id::text);
  if (
    select count(*)
    from public.binder_members
    where binder_id = p_binder_id and state in ('active', 'suspended')
  ) >= 50 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.binder_members
    where user_id = p_user_id and state in ('active', 'suspended')
  ) >= 100 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  select * into v_member
  from public.binder_members
  where binder_id = p_binder_id and user_id = p_user_id
  for update;

  if found and v_member.state in ('active', 'suspended') then
    raise exception 'conflict' using errcode = 'P0001';
  elsif found then
    update public.binder_members
    set
      role = p_role,
      state = 'active',
      membership_epoch = membership_epoch + 1,
      public_action_ref = gen_random_uuid(),
      display_alias = null,
      invited_by_user_id = p_invited_by_user_id,
      joined_at = now(),
      ended_at = null,
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null,
      notification_preference = 'digest'
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.binder_members (
      binder_id,
      user_id,
      role,
      state,
      membership_epoch,
      invited_by_user_id,
      joined_at
    ) values (
      p_binder_id,
      p_user_id,
      p_role,
      'active',
      1,
      p_invited_by_user_id,
      now()
    )
    returning * into v_member;
  end if;

  return v_member;
end;
$$;

create or replace function public.binder_join_request_create_v1(
  p_public_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_request public.binder_join_requests%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_join_request_create_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state <> 'clear'
     or v_binder.read_access <> 'public'
     or v_binder.discoverability <> 'listed'
     or v_binder.join_policy <> 'request_to_join'
     or v_binder.contribution_policy <> 'approval_required'
     or not public.binder_feature_enabled_v1('community')
     or public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     or exists (
       select 1 from public.binder_members
       where binder_id = v_binder.id
         and user_id = v_uid
         and state in ('active', 'suspended')
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.binder_join_requests
    where binder_id = v_binder.id
      and requester_user_id = v_uid
      and status = 'pending'
  ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.binder_join_requests
    where binder_id = v_binder.id
      and status = 'pending'
  ) >= 50 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'join_request', 20, 50);
  insert into public.binder_join_requests (
    binder_id,
    requester_user_id,
    requested_role_ceiling
  ) values (
    v_binder.id,
    v_uid,
    'contributor'
  )
  returning * into v_request;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'join_request_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'request_id', v_request.id,
    'status', 'pending',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_join_request_create_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_join_request_decide_v1(
  p_request_id uuid,
  p_decision text,
  p_role text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_binder_id uuid;
  v_requester_user_id uuid;
  v_request public.binder_join_requests%rowtype;
  v_binder public.binders%rowtype;
  v_actor_member public.binder_members%rowtype;
  v_member public.binder_members%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_join_request_decide_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if v_decision not in ('approve', 'reject')
     or (v_decision = 'approve' and v_role not in ('contributor', 'viewer')) then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select binder_id, requester_user_id
  into v_binder_id, v_requester_user_id
  from public.binder_join_requests
  where id = p_request_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_decision = 'approve' and v_requester_user_id is not null then
    perform public.binder_advisory_lock_v1(
      'binder:membership-user:' || v_requester_user_id::text
    );
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.binder_join_requests
  where id = p_request_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_request.status <> 'pending'
     or v_request.requester_user_id is null then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor_member from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';

  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.read_access <> 'public'
     or v_binder.discoverability <> 'listed'
     or v_binder.join_policy <> 'request_to_join'
     or v_binder.contribution_policy <> 'approval_required'
     or not public.binder_feature_enabled_v1('community')
     or v_actor_member.id is null
     or v_actor_member.role not in ('owner', 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_decision = 'approve' then
    if public.binder_role_rank_v1(v_role) > public.binder_role_rank_v1(v_request.requested_role_ceiling)
       or public.binder_pair_blocked_v1(v_request.requester_user_id, v_binder.owner_user_id) then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;
    v_member := public.binder_internal_activate_member_v1(
      v_binder.id,
      v_request.requester_user_id,
      v_role,
      null
    );
    update public.binder_join_requests
    set status = 'approved', decision_user_id = v_uid, responded_at = now()
    where id = v_request.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'join_request_approved',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_member.id,
      p_payload => jsonb_build_object('role', v_role)
    );
    v_event_id := public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'member_joined',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_member.id,
      p_payload => jsonb_build_object(
        'role', v_role,
        'membership_epoch', v_member.membership_epoch,
        'source', 'join_request'
      )
    );
  else
    update public.binder_join_requests
    set status = 'rejected', decision_user_id = v_uid, responded_at = now()
    where id = v_request.id;
    v_event_id := public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'join_request_rejected',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'request_id', v_request.id,
    'decision', v_decision,
    'membership_id', case when v_decision = 'approve' then v_member.id else null end,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_join_request_decide_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_join_request_withdraw_v1(
  p_request_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_request public.binder_join_requests%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_join_request_withdraw_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  select binder_id into v_binder_id
  from public.binder_join_requests
  where id = p_request_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.binder_join_requests
  where id = p_request_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_request.requester_user_id <> v_uid
     or v_request.status <> 'pending' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  update public.binder_join_requests
  set status = 'withdrawn', responded_at = now()
  where id = v_request.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'join_request_withdrawn',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'request_id', v_request.id,
    'status', 'withdrawn',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_join_request_withdraw_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_member_change_role_v1(
  p_member_id uuid,
  p_role text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_binder_id uuid;
  v_target public.binder_members%rowtype;
  v_actor public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_closed integer := 0;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_member_change_role_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select binder_id into v_binder_id
  from public.binder_members
  where id = p_member_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.binder_members
  where id = p_member_id
    and binder_id = v_binder.id
  for update;
  if not found or v_target.state <> 'active' or v_target.role = 'owner' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';

  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_role not in ('manager', 'contributor', 'viewer')
     or v_role = v_target.role
     or (
       v_actor.role = 'owner'
       and v_target.user_id = v_uid
     )
     or (
       v_actor.role = 'manager'
       and (
         v_target.role = 'manager'
         or v_role = 'manager'
         or v_target.user_id = v_uid
       )
     )
     or v_actor.id is null
     or v_actor.role not in ('owner', 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_role = 'viewer' then
    v_closed := public.binder_close_member_contributions_v1(
      v_target.id, 'removed', 'rejected', 'role_changed_to_viewer', 'user', v_uid
    );
  end if;
  update public.binder_members set role = v_role where id = v_target.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_role_changed',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_payload => jsonb_build_object(
      'previous_role', v_target.role,
      'role', v_role,
      'closed_contribution_count', v_closed
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'member_id', v_target.id,
    'role', v_role,
    'closed_contribution_count', v_closed,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_member_change_role_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_member_suspend_v1(
  p_member_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_target_user_id uuid;
  v_target public.binder_members%rowtype;
  v_actor public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_closed integer;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_member_suspend_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  select binder_id, user_id
  into v_binder_id, v_target_user_id
  from public.binder_members
  where id = p_member_id;
  if not found or v_target_user_id is null then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1(
    'binder:membership-user:' || v_target_user_id::text
  );

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.binder_members
  where id = p_member_id
    and binder_id = v_binder.id
  for update;
  if not found or v_target.state <> 'active' or v_target.role = 'owner' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';
  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_actor.id is null
     or v_actor.role not in ('owner', 'manager')
     or (v_actor.role = 'manager' and (
       v_target.role = 'manager' or v_target.user_id = v_uid
     ))
     or char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_closed := public.binder_close_member_contributions_v1(
    v_target.id, 'invalidated', 'rejected', 'member_suspended', 'user', v_uid
  );
  update public.binder_members
  set
    state = 'suspended',
    suspended_at = now(),
    content_scope = 'none',
    content_consent_epoch = null,
    content_consent_revision = null,
    identity_scope = 'none',
    identity_consent_epoch = null,
    identity_consent_revision = null
  where id = v_target.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_suspended',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_payload => jsonb_build_object(
      'reason', left(coalesce(p_reason, ''), 500),
      'closed_contribution_count', v_closed
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'member_id', v_target.id,
    'state', 'suspended',
    'closed_contribution_count', v_closed,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_member_suspend_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_member_reinstate_v1(
  p_member_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_target_user_id uuid;
  v_target public.binder_members%rowtype;
  v_actor public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_member_reinstate_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  select binder_id, user_id
  into v_binder_id, v_target_user_id
  from public.binder_members
  where id = p_member_id;
  if not found or v_target_user_id is null then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1(
    'binder:membership-user:' || v_target_user_id::text
  );

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.binder_members
  where id = p_member_id
    and binder_id = v_binder.id
  for update;
  if not found or v_target.state <> 'suspended' or v_target.role = 'owner' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';
  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or public.binder_pair_blocked_v1(v_target.user_id, v_binder.owner_user_id)
     or v_actor.id is null
     or v_actor.role not in ('owner', 'manager')
     or (v_actor.role = 'manager' and v_target.role = 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.binder_members
    where user_id = v_target.user_id
      and state in ('active', 'suspended')
  ) > 100 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  update public.binder_members
  set
    state = 'active',
    membership_epoch = membership_epoch + 1,
    public_action_ref = gen_random_uuid(),
    joined_at = now(),
    suspended_at = null,
    content_scope = 'none',
    content_consent_epoch = null,
    content_consent_revision = null,
    identity_scope = 'none',
    identity_consent_epoch = null,
    identity_consent_revision = null
  where id = v_target.id
  returning * into v_target;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_reinstated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_payload => jsonb_build_object('membership_epoch', v_target.membership_epoch)
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'member_id', v_target.id,
    'state', 'active',
    'membership_epoch', v_target.membership_epoch,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_member_reinstate_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_member_remove_v1(
  p_member_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_target public.binder_members%rowtype;
  v_actor public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_closed integer;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_member_remove_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  select binder_id into v_binder_id
  from public.binder_members
  where id = p_member_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.binder_members
  where id = p_member_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_target.state not in ('active', 'suspended')
     or v_target.role = 'owner' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';
  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_actor.id is null
     or v_actor.role not in ('owner', 'manager')
     or (v_actor.role = 'manager' and v_target.role = 'manager')
     or char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_closed := public.binder_close_member_contributions_v1(
    v_target.id, 'removed', 'rejected', 'member_removed', 'user', v_uid
  );
  update public.binder_members
  set
    state = 'removed',
    ended_at = now(),
    suspended_at = null,
    content_scope = 'none',
    content_consent_epoch = null,
    content_consent_revision = null,
    identity_scope = 'none',
    identity_consent_epoch = null,
    identity_consent_revision = null
  where id = v_target.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_removed',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_payload => jsonb_build_object(
      'reason', left(coalesce(p_reason, ''), 500),
      'closed_contribution_count', v_closed
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'member_id', v_target.id,
    'state', 'removed',
    'closed_contribution_count', v_closed,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_member_remove_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_leave_v1(
  p_public_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_closed integer;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_leave_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  select * into v_binder from public.binders
  where public_id = p_public_id for update;
  select * into v_member from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid for update;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed'
     or v_member.state not in ('active', 'suspended')
     or v_member.role = 'owner' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  v_closed := public.binder_close_member_contributions_v1(
    v_member.id, 'withdrawn', 'withdrawn', 'member_left', 'user', v_uid
  );
  update public.binder_members
  set
    state = 'left',
    ended_at = now(),
    suspended_at = null,
    content_scope = 'none',
    content_consent_epoch = null,
    content_consent_revision = null,
    identity_scope = 'none',
    identity_consent_epoch = null,
    identity_consent_revision = null
  where id = v_member.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_left',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_member.id,
    p_payload => jsonb_build_object('closed_contribution_count', v_closed)
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'state', 'left',
    'closed_contribution_count', v_closed,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_leave_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_owner_transfer_offer_v1(
  p_public_id uuid,
  p_target_member_id uuid,
  p_former_owner_role text,
  p_idempotency_key text,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_target public.binder_members%rowtype;
  v_former_role text := lower(btrim(coalesce(p_former_owner_role, 'manager')));
  v_expiry timestamptz := coalesce(p_expires_at, now() + interval '7 days');
  v_offer public.binder_owner_transfer_offers%rowtype;
  v_expired_offer public.binder_owner_transfer_offers%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_owner_transfer_offer_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  select * into v_binder from public.binders
  where public_id = p_public_id for update;
  select * into v_target from public.binder_members
  where id = p_target_member_id for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_target.binder_id <> v_binder.id
     or v_target.state <> 'active'
     or v_target.user_id is null
     or v_target.user_id = v_uid
     or v_former_role not in ('manager', 'contributor', 'viewer', 'leave')
     or v_expiry <= now() + interval '5 minutes'
     or v_expiry > now() + interval '30 days'
     or public.binder_pair_blocked_v1(v_uid, v_target.user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  update public.binder_owner_transfer_offers
  set status = 'expired', responded_at = now()
  where binder_id = v_binder.id
    and status = 'pending'
    and expires_at <= now()
  returning * into v_expired_offer;
  if v_expired_offer.id is not null then
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'owner_transfer_expired',
      p_actor_kind => 'service',
      p_service_source => 'capability_expiry',
      p_correlation_id => 'owner-transfer:' || v_expired_offer.id::text,
      p_subject_member_id => v_expired_offer.target_member_id
    );
  end if;
  if exists (
    select 1 from public.binder_owner_transfer_offers
    where binder_id = v_binder.id and status = 'pending'
  ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  insert into public.binder_owner_transfer_offers (
    binder_id,
    current_owner_user_id,
    target_member_id,
    target_user_id,
    former_owner_role,
    expires_at
  ) values (
    v_binder.id,
    v_uid,
    v_target.id,
    v_target.user_id,
    v_former_role,
    v_expiry
  )
  returning * into v_offer;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'owner_transfer_offered',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_payload => jsonb_build_object(
      'former_owner_role', v_former_role,
      'expires_at', v_expiry
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'offer_id', v_offer.id,
    'expires_at', v_expiry,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_owner_transfer_offer_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_owner_transfer_accept_v1(
  p_offer_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_offer public.binder_owner_transfer_offers%rowtype;
  v_binder public.binders%rowtype;
  v_old_owner public.binder_members%rowtype;
  v_new_owner public.binder_members%rowtype;
  v_closed integer := 0;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_owner_transfer_accept_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1(
    'binder:owner-capacity:' || v_uid::text
  );
  perform public.binder_advisory_lock_v1(
    'binder:membership-user:' || v_uid::text
  );

  select binder_id into v_binder_id
  from public.binder_owner_transfer_offers
  where id = p_offer_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_offer
  from public.binder_owner_transfer_offers
  where id = p_offer_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_offer.status <> 'pending'
     or v_offer.target_user_id <> v_uid then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_offer.expires_at <= now() then
    update public.binder_owner_transfer_offers
    set status = 'expired', responded_at = now()
    where id = v_offer.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_offer.binder_id,
      p_event_type => 'owner_transfer_expired',
      p_actor_kind => 'service',
      p_service_source => 'capability_expiry',
      p_correlation_id => 'owner-transfer:' || v_offer.id::text,
      p_subject_member_id => v_offer.target_member_id
    );
    v_response := jsonb_build_object('ok', false, 'code', 'unavailable');
    return public.binder_idempotency_store_v1(
      v_actor_key,
      v_uid,
      'binder_owner_transfer_accept_v1',
      p_idempotency_key,
      v_offer.binder_id,
      v_response
    );
  end if;

  select * into v_old_owner from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_binder.owner_user_id
    and role = 'owner'
    and state = 'active'
  for update;
  select * into v_new_owner from public.binder_members
  where id = v_offer.target_member_id for update;
  if v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.owner_user_id <> v_offer.current_owner_user_id
     or v_new_owner.user_id <> v_uid
     or v_new_owner.state <> 'active'
     or (
       select count(*)
       from public.binders owned
       where owned.owner_user_id = v_uid
         and owned.lifecycle in ('active', 'archived')
     ) >= 20
     or exists (
       select 1
       from public.binder_members retained
       where retained.binder_id = v_binder.id
         and retained.state in ('active', 'suspended')
         and retained.user_id is not null
         and retained.id <> v_new_owner.id
         and not (
           retained.id = v_old_owner.id
           and v_offer.former_owner_role = 'leave'
         )
         and public.binder_pair_blocked_v1(
           retained.user_id,
           v_new_owner.user_id
         )
     ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  if v_offer.former_owner_role = 'viewer' then
    v_closed := public.binder_close_member_contributions_v1(
      v_old_owner.id, 'removed', 'rejected', 'owner_transfer_to_viewer', 'user', v_uid
    );
  elsif v_offer.former_owner_role = 'leave' then
    v_closed := public.binder_close_member_contributions_v1(
      v_old_owner.id, 'withdrawn', 'withdrawn', 'owner_transfer_and_leave', 'user', v_uid
    );
  end if;

  update public.binder_members
  set
    role = case when v_offer.former_owner_role = 'leave' then 'viewer' else v_offer.former_owner_role end,
    state = case when v_offer.former_owner_role = 'leave' then 'left' else 'active' end,
    ended_at = case when v_offer.former_owner_role = 'leave' then now() else null end,
    content_scope = case when v_offer.former_owner_role = 'leave' then 'none' else content_scope end,
    content_consent_epoch = case when v_offer.former_owner_role = 'leave' then null else content_consent_epoch end,
    content_consent_revision = case when v_offer.former_owner_role = 'leave' then null else content_consent_revision end,
    identity_scope = case when v_offer.former_owner_role = 'leave' then 'none' else identity_scope end,
    identity_consent_epoch = case when v_offer.former_owner_role = 'leave' then null else identity_consent_epoch end,
    identity_consent_revision = case when v_offer.former_owner_role = 'leave' then null else identity_consent_revision end
  where id = v_old_owner.id;
  update public.binder_members set role = 'owner' where id = v_new_owner.id;
  update public.binders set owner_user_id = v_uid where id = v_binder.id;
  update public.binder_owner_transfer_offers
  set status = 'accepted', responded_at = now()
  where id = v_offer.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'owner_transferred',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_new_owner.id,
    p_payload => jsonb_build_object(
      'former_owner_member_id', v_old_owner.id,
      'new_owner_member_id', v_new_owner.id,
      'former_owner_role', v_offer.former_owner_role,
      'closed_contribution_count', v_closed
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'offer_id', v_offer.id,
    'former_owner_role', v_offer.former_owner_role,
    'closed_contribution_count', v_closed,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_owner_transfer_accept_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_owner_transfer_revoke_v1(
  p_offer_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_offer public.binder_owner_transfer_offers%rowtype;
  v_binder public.binders%rowtype;
  v_disposition text;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_owner_transfer_revoke_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  select binder_id into v_binder_id
  from public.binder_owner_transfer_offers
  where id = p_offer_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_offer
  from public.binder_owner_transfer_offers
  where id = p_offer_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_offer.status <> 'pending'
     or v_offer.expires_at <= now() then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_binder.owner_user_id = v_uid
     and v_offer.current_owner_user_id = v_uid then
    v_disposition := 'revoked_by_owner';
  elsif v_offer.target_user_id = v_uid
     and exists (
       select 1
       from public.binder_members target
       where target.id = v_offer.target_member_id
         and target.binder_id = v_binder.id
         and target.user_id = v_uid
         and target.state = 'active'
     ) then
    v_disposition := 'declined_by_target';
  else
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.binder_owner_transfer_offers
  set status = 'revoked', responded_at = now()
  where id = v_offer.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'owner_transfer_revoked',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_offer.target_member_id,
    p_payload => jsonb_build_object(
      'disposition', v_disposition,
      'reason', v_disposition
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'offer_id', v_offer.id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_owner_transfer_revoke_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_apply_block_pair_v1(
  p_blocker_user_id uuid,
  p_blocked_user_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row record;
  v_closed integer;
begin
  -- Account-targeted invitations are relationship capabilities. A new block
  -- revokes either-direction inviter/recipient capabilities without emitting
  -- a Binder event that could notify or identify the blocker.
  update public.binder_invitations
  set status = 'revoked', responded_at = now(), revoked_at = now()
  where status = 'pending'
    and is_account_targeted is true
    and (
      (
        inviter_user_id = p_blocker_user_id
        and intended_user_id = p_blocked_user_id
      )
      or (
        inviter_user_id = p_blocked_user_id
        and intended_user_id = p_blocker_user_id
      )
    );

  -- Owner blocks a member: remove member and close live contributions.
  for v_row in
    select b.id as binder_id, m.id as member_id
    from public.binders b
    join public.binder_members m
      on m.binder_id = b.id
     and m.user_id = p_blocked_user_id
     and m.state in ('active', 'suspended')
     and m.role <> 'owner'
    where b.owner_user_id = p_blocker_user_id
      and b.lifecycle in ('active', 'archived')
    for update of b, m
  loop
    v_closed := public.binder_close_member_contributions_v1(
      v_row.member_id, 'removed', 'rejected', 'owner_blocked_member', 'user', p_blocker_user_id
    );
    update public.binder_members
    set
      state = 'removed',
      ended_at = now(),
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null
    where id = v_row.member_id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_row.binder_id,
      p_event_type => 'member_removed',
      p_actor_kind => 'user',
      p_actor_user_id => p_blocker_user_id,
      p_subject_member_id => v_row.member_id,
      p_payload => jsonb_build_object(
        'reason', 'owner_blocked_member',
        'closed_contribution_count', v_closed
      )
    );
  end loop;

  -- A non-Owner member blocks the Owner: leave and withdraw contributions.
  for v_row in
    select b.id as binder_id, m.id as member_id
    from public.binders b
    join public.binder_members m
      on m.binder_id = b.id
     and m.user_id = p_blocker_user_id
     and m.state in ('active', 'suspended')
     and m.role <> 'owner'
    where b.owner_user_id = p_blocked_user_id
      and b.lifecycle in ('active', 'archived')
    for update of b, m
  loop
    v_closed := public.binder_close_member_contributions_v1(
      v_row.member_id, 'withdrawn', 'withdrawn', 'member_blocked_owner', 'user', p_blocker_user_id
    );
    update public.binder_members
    set
      state = 'left',
      ended_at = now(),
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null
    where id = v_row.member_id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_row.binder_id,
      p_event_type => 'member_left',
      p_actor_kind => 'user',
      p_actor_user_id => p_blocker_user_id,
      p_subject_member_id => v_row.member_id,
      p_payload => jsonb_build_object(
        'reason', 'member_blocked_owner',
        'closed_contribution_count', v_closed
      )
    );
  end loop;
end;
$$;

create or replace function public.binder_trust_block_effect_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.binder_apply_block_pair_v1(new.user_id, new.blocked_user_id);
  return new;
end;
$$;

create trigger trg_trust_blocks_binder_effect_v1
after insert on public.trust_blocks
for each row execute function public.binder_trust_block_effect_v1();

create or replace function public.binder_block_owner_v1(
  p_public_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_before integer := 0;
  v_lawful boolean := false;
  v_left boolean := false;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_block_owner_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  select * into v_binder from public.binders
  where public_id = p_public_id for update;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed'
     or v_binder.owner_user_id is null
     or v_binder.owner_user_id = v_uid then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_member from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_uid
    and state = 'active'
    and role <> 'owner'
  for update;
  v_lawful :=
    v_member.id is not null
    or (
      v_binder.lifecycle = 'active'
      and v_binder.moderation_state not in ('frozen', 'removed')
      and v_binder.read_access = 'public'
      and public.binder_feature_enabled_v1('public')
      and public.binder_target_enabled_v1(v_binder.id)
    );
  if not v_lawful then raise exception 'unavailable' using errcode = 'P0001'; end if;

  if v_member.id is not null then
    select count(*)::integer into v_before
    from public.binder_contributions
    where contributor_member_id = v_member.id and state in ('pending', 'active');
  end if;

  insert into public.trust_blocks (user_id, blocked_user_id)
  values (v_uid, v_binder.owner_user_id)
  on conflict (user_id, blocked_user_id) do nothing;
  -- Applies the transition for pre-existing blocks too; it is a no-op if the
  -- INSERT trigger already completed it.
  perform public.binder_apply_block_pair_v1(v_uid, v_binder.owner_user_id);

  if v_member.id is not null then
    select state = 'left' into v_left
    from public.binder_members where id = v_member.id;
    select id into v_event_id
    from public.binder_activity_events
    where binder_id = v_binder.id
      and subject_member_id = v_member.id
      and event_type = 'member_left'
    order by created_at desc, id desc
    limit 1;
  end if;
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'event_id', v_event_id,
    'left_binder', v_left,
    'withdrawn_count', v_before
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_block_owner_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_block_member_v1(
  p_member_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_target public.binder_members%rowtype;
  v_caller public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_effect text := 'none';
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_block_member_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select binder_id into v_binder_id
  from public.binder_members
  where id = p_member_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.binder_members
  where id = p_member_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_target.user_id is null
     or v_target.user_id = v_uid
     or v_target.state not in ('active', 'suspended') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_caller
  from public.binder_members
  where binder_id = v_target.binder_id
    and user_id = v_uid
    and state = 'active'
  for update;
  if v_binder.id is null
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed'
     or v_caller.id is null then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  insert into public.trust_blocks (user_id, blocked_user_id)
  values (v_uid, v_target.user_id)
  on conflict (user_id, blocked_user_id) do nothing;
  perform public.binder_apply_block_pair_v1(v_uid, v_target.user_id);

  if v_caller.role = 'owner' and v_target.role <> 'owner' then
    v_effect := 'target_removed';
    select id into v_event_id
    from public.binder_activity_events
    where binder_id = v_binder.id
      and subject_member_id = v_target.id
      and event_type = 'member_removed'
    order by created_at desc, id desc
    limit 1;
  elsif v_target.role = 'owner' and v_caller.role <> 'owner' then
    v_effect := 'caller_left';
    select id into v_event_id
    from public.binder_activity_events
    where binder_id = v_binder.id
      and subject_member_id = v_caller.id
      and event_type = 'member_left'
    order by created_at desc, id desc
    limit 1;
  else
    -- Two non-Owners remain members. Block filters identity attribution, but
    -- cannot remove a Manager's role-bounded moderation authority.
    v_event_id := public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'member_blocked',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_target.id,
      p_payload => jsonb_build_object('relationship_effect', 'none')
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'event_id', v_event_id,
    'relationship_effect', v_effect
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_block_member_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_report_v1(
  p_surface text,
  p_surface_id uuid,
  p_reason text,
  p_details text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_surface text := lower(btrim(coalesce(p_surface, '')));
  v_reason text := lower(btrim(coalesce(p_reason, 'other')));
  v_binder_id uuid;
  v_internal_surface_id uuid;
  v_reported_user_id uuid;
  v_lawful boolean := false;
  v_response jsonb := jsonb_build_object('ok', true);
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_report_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if v_surface not in ('binder', 'binder_contribution', 'binder_member', 'binder_invitation')
     or v_reason not in ('spam', 'harassment', 'scam', 'inappropriate', 'other')
     or char_length(coalesce(p_details, '')) > 2000
     or not public.binder_text_safe_v1(p_details, true) then
    raise exception 'invalid_report' using errcode = '22023';
  end if;

  -- Reserve the same actor-wide safety bucket before resolving the supplied
  -- surface. Lawful and stale/random probes therefore have the same observable
  -- rate-limit behavior and do not become a target-existence oracle.
  perform public.binder_rate_limit_assert_v1(v_uid, null, 'report', 10, 20);

  if v_surface = 'binder' then
    select b.id, b.id, b.owner_user_id,
      (
        (
          b.read_access = 'public'
          and b.lifecycle = 'active'
          and b.moderation_state not in ('frozen', 'removed')
          and public.binder_feature_enabled_v1('public')
          and public.binder_target_enabled_v1(b.id)
          and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
        )
        or (
          b.lifecycle in ('active', 'archived')
          and b.moderation_state <> 'removed'
          and exists (
            select 1 from public.binder_members m
            where m.binder_id = b.id
              and m.user_id = v_uid
              and m.state in ('active', 'suspended')
          )
        )
      )
    into v_binder_id, v_internal_surface_id, v_reported_user_id, v_lawful
    from public.binders b
    where b.public_id = p_surface_id;
  elsif v_surface = 'binder_contribution' then
    select c.binder_id, c.id, c.contributor_user_id,
      (
        b.lifecycle in ('active', 'archived')
        and b.moderation_state <> 'removed'
        and exists (
          select 1 from public.binder_members m
          where m.binder_id = c.binder_id
            and m.user_id = v_uid
            and m.state in ('active', 'suspended')
        )
      )
    into v_binder_id, v_internal_surface_id, v_reported_user_id, v_lawful
    from public.binder_contributions c
    join public.binders b on b.id = c.binder_id
    where c.id = p_surface_id;
  elsif v_surface = 'binder_member' then
    select target.binder_id, target.id, target.user_id,
      (
        b.lifecycle in ('active', 'archived')
        and b.moderation_state <> 'removed'
        and exists (
          select 1 from public.binder_members viewer
          where viewer.binder_id = target.binder_id
            and viewer.user_id = v_uid
            and viewer.state in ('active', 'suspended')
        )
      )
    into v_binder_id, v_internal_surface_id, v_reported_user_id, v_lawful
    from public.binder_members target
    join public.binders b on b.id = target.binder_id
    where target.id = p_surface_id;
  else
    select i.binder_id, i.id, i.inviter_user_id,
      (
        b.lifecycle in ('active', 'archived')
        and b.moderation_state <> 'removed'
        and (
          (i.is_account_targeted and i.intended_user_id = v_uid)
          or i.inviter_user_id = v_uid
          or exists (
            select 1 from public.binder_members manager
            where manager.binder_id = i.binder_id
              and manager.user_id = v_uid
              and manager.state = 'active'
              and manager.role in ('owner', 'manager')
          )
        )
      )
    into v_binder_id, v_internal_surface_id, v_reported_user_id, v_lawful
    from public.binder_invitations i
    join public.binders b on b.id = i.binder_id
    where i.id = p_surface_id;
  end if;

  if coalesce(v_lawful, false)
     and v_reported_user_id is distinct from v_uid then
    insert into public.trust_reports (
      reporter_user_id,
      reported_user_id,
      surface,
      surface_id,
      reason,
      details
    ) values (
      v_uid,
      v_reported_user_id,
      v_surface,
      v_internal_surface_id::text,
      v_reason,
      nullif(p_details, '')
    );
  end if;

  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_report_v1', p_idempotency_key, v_binder_id, v_response
  );
end;
$$;

create or replace function public.binder_custom_revision_publish_v1(
  p_public_id uuid,
  p_slots jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_old_progress public.binder_progress_state%rowtype;
  v_new_progress public.binder_progress_state%rowtype;
  v_revision integer;
  v_revision_id uuid;
  v_slot jsonb;
  v_position integer := 0;
  v_card_print_id uuid;
  v_card_printing_id uuid;
  v_required integer;
  v_total_required integer := 0;
  v_cover_cleared boolean := false;
  v_contribution public.binder_contributions%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_custom_revision_publish_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if jsonb_typeof(coalesce(p_slots, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_slots) not between 1 and 1000 then
    raise exception 'invalid_custom_slots' using errcode = '22023';
  end if;
  select * into v_binder from public.binders
  where public_id = p_public_id for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.target_kind <> 'custom'
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_feature_enabled_v1('custom') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_old_progress from public.binder_progress_state
  where binder_id = v_binder.id;
  v_revision := v_binder.definition_revision + 1;
  insert into public.binder_custom_revisions (
    binder_id, revision, created_by_user_id
  ) values (
    v_binder.id, v_revision, v_uid
  ) returning id into v_revision_id;

  for v_slot in select value from jsonb_array_elements(p_slots)
  loop
    begin
      v_card_print_id := nullif(v_slot ->> 'card_print_id', '')::uuid;
      v_card_printing_id := nullif(v_slot ->> 'card_printing_id', '')::uuid;
      v_required := coalesce((v_slot ->> 'required_quantity')::integer, 1);
    exception when others then
      raise exception 'invalid_custom_slot' using errcode = '22023';
    end;
    if v_card_print_id is null
       or v_required not between 1 and 100
       or not exists (select 1 from public.card_prints where id = v_card_print_id)
       or (
         v_card_printing_id is not null
         and not exists (
           select 1
           from public.card_printings
           where id = v_card_printing_id
             and card_print_id = v_card_print_id
         )
       ) then
      raise exception 'invalid_custom_slot' using errcode = '22023';
    end if;
    v_total_required := v_total_required + v_required;
    if v_total_required > 25000 then
      raise exception 'custom_copy_capacity_exceeded' using errcode = '22023';
    end if;
    insert into public.binder_custom_slots (
      revision_id,
      binder_id,
      definition_revision,
      card_print_id,
      card_printing_id,
      position,
      required_quantity
    ) values (
      v_revision_id,
      v_binder.id,
      v_revision,
      v_card_print_id,
      v_card_printing_id,
      v_position,
      v_required
    );
    v_position := v_position + 1;
  end loop;

  update public.binders set definition_revision = v_revision
  where id = v_binder.id;
  if v_binder.cover_card_print_id is not null
     and not public.binder_cover_card_matches_v1(
       v_binder.id,
       v_binder.cover_card_print_id
     ) then
    update public.binders
    set cover_card_print_id = null
    where id = v_binder.id;
    v_cover_cleared := true;
  end if;
  for v_contribution in
    select * from public.binder_contributions
    where binder_id = v_binder.id and state in ('pending', 'active')
    for update
  loop
    if not public.binder_contribution_matches_v1(
      v_binder.id,
      v_contribution.snapshot_card_print_id,
      v_contribution.snapshot_card_printing_id
    ) then
      update public.binder_contributions
      set state = 'invalidated', terminal_by_user_id = v_uid, terminal_at = now()
      where id = v_contribution.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'contribution_invalidated',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_subject_member_id => v_contribution.contributor_member_id,
        p_contribution_id => v_contribution.id,
        p_payload => jsonb_build_object('reason', 'custom_revision_changed')
      );
    end if;
  end loop;
  v_new_progress := public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'checklist_updated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'previous_revision', v_binder.definition_revision,
      'definition_revision', v_revision,
      'previous_total', coalesce(v_old_progress.total_slots, 0),
      'total', v_new_progress.total_slots,
      'cover_cleared', v_cover_cleared
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'definition_revision', v_revision,
    'progress', jsonb_build_object(
      'completed', v_new_progress.member_completed_slots,
      'total', v_new_progress.total_slots,
      'unit', v_new_progress.unit
    ),
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_custom_revision_publish_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_contribution_remove_v1(
  p_contribution_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_contribution public.binder_contributions%rowtype;
  v_binder public.binders%rowtype;
  v_actor public.binder_members%rowtype;
  v_target public.binder_members%rowtype;
  v_next_state text;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key,
    'binder_contribution_remove_v1',
    p_idempotency_key
  );
  if v_cached is not null then
    return v_cached;
  end if;
  if not public.binder_feature_enabled_v1('schema_internal')
     or char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select binder_id
  into v_binder_id
  from public.binder_contributions
  where id = p_contribution_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select *
  into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select *
  into v_contribution
  from public.binder_contributions
  where id = p_contribution_id
    and binder_id = v_binder.id
  for update;
  if not found or v_contribution.state not in ('pending', 'active') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select *
  into v_actor
  from public.binder_members
  where binder_id = v_contribution.binder_id
    and user_id = v_uid
    and state = 'active';
  select *
  into v_target
  from public.binder_members
  where id = v_contribution.contributor_member_id
    and binder_id = v_contribution.binder_id;

  if v_binder.id is null
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_actor.id is null
     or v_target.id is null
     or v_target.id = v_actor.id
     or v_actor.role not in ('owner', 'manager') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_rate_limit_assert_v1(
    v_uid,
    v_binder.id,
    'contribution_mutation',
    120,
    null
  );
  v_next_state := case
    when v_contribution.state = 'active' then 'removed'
    else 'rejected'
  end;
  update public.binder_contributions
  set
    state = v_next_state,
    decided_by_user_id = case
      when v_contribution.state = 'pending' then v_uid
      else decided_by_user_id
    end,
    decided_at = case
      when v_contribution.state = 'pending' then now()
      else decided_at
    end,
    terminal_by_user_id = v_uid,
    terminal_at = now()
  where id = v_contribution.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => case
      when v_next_state = 'removed' then 'contribution_removed'
      else 'contribution_rejected'
    end,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_target.id,
    p_contribution_id => v_contribution.id,
    p_payload => jsonb_build_object(
      'reason', left(coalesce(p_reason, ''), 500)
    )
  );
  if v_contribution.state = 'active' then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'contribution_id', v_contribution.id,
    'state', v_next_state,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_contribution_remove_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_invitation_report_v1(
  p_token text,
  p_reason text,
  p_details text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_reason text := lower(btrim(coalesce(p_reason, 'other')));
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_response jsonb := jsonb_build_object('ok', true);
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_invitation_report_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if v_reason not in ('spam', 'harassment', 'scam', 'inappropriate', 'other')
     or char_length(coalesce(p_details, '')) > 2000
     or not public.binder_text_safe_v1(p_details, true)
     or (
       btrim(coalesce(p_token, '')) <> ''
       and position(p_token in coalesce(p_details, '')) > 0
     ) then
    raise exception 'invalid_report' using errcode = '22023';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, null, 'report', 10, 20);

  -- Invalid and unauthorized bearer probes intentionally converge on the same
  -- generic success envelope. The plaintext token is hashed for lookup only
  -- and is never copied into report, activity, or idempotency storage.
  if btrim(coalesce(p_token, '')) <> ''
     and char_length(p_token) <= 512 then
    select * into v_invitation
    from public.binder_invitations
    where token_hash = public.binder_token_hash_v1(p_token)
      and status = 'pending'
      and expires_at > now()
      and (
        is_account_targeted is false
        or intended_user_id = v_uid
      );
  end if;

  if v_invitation.id is not null then
    select * into v_binder
    from public.binders
    where id = v_invitation.binder_id
      and lifecycle in ('active', 'archived')
      and moderation_state <> 'removed';
  end if;

  if v_binder.id is not null
     and v_invitation.inviter_user_id is not null
     and v_invitation.inviter_user_id <> v_uid then
    insert into public.trust_reports (
      reporter_user_id,
      reported_user_id,
      surface,
      surface_id,
      reason,
      details
    ) values (
      v_uid,
      v_invitation.inviter_user_id,
      'binder_invitation',
      v_invitation.id::text,
      v_reason,
      nullif(p_details, '')
    );
  end if;

  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_invitation_report_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

-- Private helpers.
revoke all on function public.binder_close_member_contributions_v1(uuid,text,text,text,text,uuid,text,text)
from public, anon, authenticated;
revoke all on function public.binder_internal_activate_member_v1(uuid,uuid,text,uuid)
from public, anon, authenticated;
revoke all on function public.binder_apply_block_pair_v1(uuid,uuid)
from public, anon, authenticated;
revoke all on function public.binder_trust_block_effect_v1()
from public, anon, authenticated;

-- Guarded authenticated entrypoints.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_join_request_create_v1(uuid,text)',
    'public.binder_join_request_decide_v1(uuid,text,text,text)',
    'public.binder_join_request_withdraw_v1(uuid,text)',
    'public.binder_member_change_role_v1(uuid,text,text)',
    'public.binder_member_suspend_v1(uuid,text,text)',
    'public.binder_member_reinstate_v1(uuid,text)',
    'public.binder_member_remove_v1(uuid,text,text)',
    'public.binder_leave_v1(uuid,text)',
    'public.binder_owner_transfer_offer_v1(uuid,uuid,text,text,timestamptz)',
    'public.binder_owner_transfer_accept_v1(uuid,text)',
    'public.binder_owner_transfer_revoke_v1(uuid,text)',
    'public.binder_block_owner_v1(uuid,text)',
    'public.binder_block_member_v1(uuid,text)',
    'public.binder_report_v1(text,uuid,text,text,text)',
    'public.binder_invitation_report_v1(text,text,text,text)',
    'public.binder_custom_revision_publish_v1(uuid,jsonb,text)',
    'public.binder_contribution_remove_v1(uuid,text,text)'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon';
    execute 'grant execute on function ' || v_signature || ' to authenticated, service_role';
  end loop;
end;
$$;

commit;
