begin;

create or replace function public.founder_operations_counts_v1()
returns table (
  needs_action integer,
  running integer,
  failed integer,
  completed integer,
  unhealthy_agents integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  return query
  select
    count(*) filter (
      where w.state in ('ready_for_review', 'deferred')
        and (w.deferred_until is null or w.deferred_until <= now())
        and (viewer.snoozed_until is null or viewer.snoozed_until <= now())
    )::integer,
    count(*) filter (where w.state in ('queued', 'running'))::integer,
    count(*) filter (where w.state in ('failed', 'repair_requested'))::integer,
    count(*) filter (
      where w.state in (
        'approved', 'succeeded', 'rejected', 'cancelled', 'superseded', 'expired'
      )
    )::integer,
    (select count(*)::integer from public.operations_agents a
      where a.is_enabled and not a.is_paused
        and (
          a.last_heartbeat_at is null
          or a.last_heartbeat_at < now() - make_interval(secs => a.stale_after_seconds)
        ))
  from public.founder_work_items w
  left join public.founder_work_item_viewer_state viewer
    on viewer.work_item_id = w.id and viewer.user_id = v_uid;
end;
$$;

create or replace function public.founder_operations_decide_v1(
  p_work_item_id uuid,
  p_expected_version integer,
  p_expected_fingerprint text,
  p_decision text,
  p_idempotency_key text,
  p_client_schema_version text,
  p_note text default null,
  p_defer_until timestamptz default null
)
returns table (
  work_item_id uuid, work_item_state text, decision_id uuid,
  command_id uuid, command_status text, duplicate boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.founder_work_items%rowtype;
  v_existing public.founder_decisions%rowtype;
  v_decision_id uuid;
  v_command_id uuid;
  v_command_status text;
  v_failed_command public.operations_commands%rowtype;
  v_state text;
  v_execution_enabled boolean;
  v_iat timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  if p_client_schema_version <> 'FOUNDER_OPERATIONS_MOBILE_V1' then
    raise exception 'unsupported_founder_operations_client';
  end if;
  if p_decision not in (
    'acknowledge', 'add_note', 'defer', 'approve', 'reject', 'request_repair', 'retry'
  ) then
    raise exception 'unsupported_founder_decision';
  end if;

  select * into v_existing from public.founder_decisions
   where actor_user_id = v_uid and idempotency_key = btrim(p_idempotency_key);
  if found then
    if v_existing.work_item_id <> p_work_item_id or v_existing.decision <> p_decision then
      raise exception 'founder_decision_idempotency_conflict';
    end if;
    select c.id, c.status into v_command_id, v_command_status
      from public.operations_commands c where c.decision_id = v_existing.id limit 1;
    select state into v_state from public.founder_work_items where id = p_work_item_id;
    return query select p_work_item_id, v_state, v_existing.id,
      v_command_id, v_command_status, true;
    return;
  end if;

  select * into v_item from public.founder_work_items
   where id = p_work_item_id for update;
  if not found then raise exception 'founder_work_item_not_found'; end if;
  if v_item.version <> p_expected_version
      or v_item.plan_fingerprint <> lower(btrim(p_expected_fingerprint)) then
    raise exception 'founder_work_item_stale_plan';
  end if;
  if v_item.expires_at <= now() and p_decision not in ('acknowledge', 'add_note') then
    update public.founder_work_items set state = 'expired', state_reason = 'plan_expired'
     where id = v_item.id and state in ('ready_for_review', 'deferred');
    raise exception 'founder_work_item_expired';
  end if;
  if v_item.state in ('succeeded', 'rejected', 'cancelled', 'superseded', 'expired')
      and p_decision not in ('acknowledge', 'add_note') then
    raise exception 'founder_work_item_not_actionable';
  end if;
  if p_decision in ('defer', 'approve', 'reject', 'request_repair')
      and v_item.state not in ('ready_for_review', 'deferred') then
    raise exception 'founder_work_item_not_actionable';
  end if;
  if p_decision = 'defer' and (p_defer_until is null or p_defer_until <= now()) then
    raise exception 'future_defer_until_required';
  end if;
  if p_decision = 'add_note' and char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'founder_note_required';
  end if;
  if p_decision = 'retry' and v_item.state <> 'failed' then
    raise exception 'founder_work_item_not_retryable';
  end if;
  if v_item.requires_recent_auth and p_decision in ('approve', 'retry') then
    begin
      v_iat := to_timestamp((auth.jwt() ->> 'iat')::double precision);
    exception when others then
      raise exception 'recent_authentication_required';
    end;
    if v_iat is null or v_iat < now() - interval '15 minutes' then
      raise exception 'recent_authentication_required';
    end if;
  end if;
  if p_decision = 'retry' then
    select c.* into v_failed_command from public.operations_commands c
     where c.work_item_id = v_item.id and c.status = 'failed' for update;
    if not found then raise exception 'failed_command_required_for_retry'; end if;
    if v_failed_command.execution_deadline_at <= now() then
      raise exception 'command_retry_deadline_expired';
    end if;
    if v_failed_command.attempt_count >= v_failed_command.max_attempts then
      raise exception 'command_retry_limit_reached';
    end if;
  end if;

  insert into public.founder_decisions (
    work_item_id, actor_user_id, decision, note, expected_version,
    expected_fingerprint, client_schema_version, idempotency_key, defer_until
  ) values (
    v_item.id, v_uid, p_decision, nullif(btrim(p_note), ''),
    p_expected_version, lower(btrim(p_expected_fingerprint)),
    p_client_schema_version, btrim(p_idempotency_key), p_defer_until
  ) returning id into v_decision_id;

  if p_decision = 'acknowledge' then
    insert into public.founder_work_item_viewer_state (
      user_id, work_item_id, acknowledged_at, last_opened_at
    ) values (v_uid, v_item.id, now(), now())
    on conflict on constraint founder_work_item_viewer_state_pkey do update set
      acknowledged_at = coalesce(public.founder_work_item_viewer_state.acknowledged_at, now()),
      last_opened_at = now();
    v_state := v_item.state;
  elsif p_decision = 'add_note' then
    v_state := v_item.state;
  elsif p_decision = 'defer' then
    update public.founder_work_items set state = 'deferred', deferred_until = p_defer_until,
      state_reason = 'founder_deferred', decided_at = now()
    where id = v_item.id returning state into v_state;
    insert into public.founder_work_item_viewer_state (
      user_id, work_item_id, snoozed_until, last_opened_at
    ) values (v_uid, v_item.id, p_defer_until, now())
    on conflict on constraint founder_work_item_viewer_state_pkey do update set
      snoozed_until = excluded.snoozed_until, last_opened_at = now();
  elsif p_decision = 'reject' then
    update public.founder_work_items set state = 'rejected',
      state_reason = 'founder_rejected', decided_at = now()
    where id = v_item.id returning state into v_state;
  elsif p_decision = 'request_repair' then
    update public.founder_work_items set state = 'repair_requested',
      state_reason = 'founder_requested_repair', decided_at = now()
    where id = v_item.id returning state into v_state;
  elsif p_decision = 'approve' then
    v_execution_enabled := coalesce((v_item.command_policy ->> 'execution_enabled')::boolean, false);
    if v_execution_enabled then
      if coalesce(v_item.executor_version, '') = '' then
        raise exception 'work_item_executor_version_required';
      end if;
      insert into public.operations_commands (
        command_key, work_item_id, decision_id, agent_id, action_type,
        frozen_scope, plan_fingerprint, executor_version, cost_ceiling_usd,
        execution_deadline_at, max_attempts
      ) values (
        v_item.work_item_key || ':v' || v_item.version::text || ':' || v_item.action_type,
        v_item.id, v_decision_id, v_item.agent_id, v_item.action_type,
        jsonb_build_object(
          'scope', v_item.scope, 'exclusions', v_item.exclusions,
          'plan_payload', v_item.plan_payload, 'payload_sha256', v_item.payload_sha256
        ),
        v_item.plan_fingerprint, v_item.executor_version,
        case when jsonb_typeof(v_item.command_policy -> 'cost_ceiling_usd') = 'number'
          then (v_item.command_policy ->> 'cost_ceiling_usd')::numeric else null end,
        least(v_item.expires_at, now() + make_interval(
          secs => coalesce((v_item.command_policy ->> 'execution_deadline_seconds')::integer, 3600)
        )),
        coalesce((v_item.command_policy ->> 'max_attempts')::integer, 3)
      ) returning id, status into v_command_id, v_command_status;
      update public.founder_work_items set state = 'queued',
        state_reason = 'founder_approved_command_queued', decided_at = now()
      where id = v_item.id returning state into v_state;
      insert into public.operations_command_events (command_id, event_type, payload)
      values (v_command_id, 'queued', jsonb_build_object('decision_id', v_decision_id));
    else
      update public.founder_work_items set state = 'approved',
        state_reason = 'founder_approved_review_only_plan', decided_at = now()
      where id = v_item.id returning state into v_state;
    end if;
  elsif p_decision = 'retry' then
    v_command_id := v_failed_command.id;
    update public.operations_commands set status = 'queued', lease_token = null,
      leased_by = null, lease_expires_at = null, finished_at = null,
      error_summary = null
    where id = v_command_id returning status into v_command_status;
    update public.founder_work_items set state = 'queued',
      state_reason = 'founder_retry_queued', decided_at = now()
    where id = v_item.id returning state into v_state;
    insert into public.operations_command_events (command_id, event_type, payload)
    values (v_command_id, 'retry_queued', jsonb_build_object('decision_id', v_decision_id));
  end if;

  insert into public.founder_work_item_events (
    work_item_id, event_type, actor_type, actor_key, payload
  ) values (
    v_item.id, 'founder_decision', 'founder', v_uid::text,
    jsonb_build_object('decision', p_decision, 'decision_id', v_decision_id)
  );
  return query select v_item.id, v_state, v_decision_id,
    v_command_id, v_command_status, false;
end;
$$;

revoke all on function public.founder_operations_counts_v1() from public, anon;
revoke all on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) from public, anon;

grant execute on function public.founder_operations_counts_v1()
  to authenticated, service_role;
grant execute on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) to authenticated, service_role;

comment on function public.founder_operations_counts_v1() is
'Founder-only queue counts aligned with due-time and per-founder snooze visibility.';
comment on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) is
'Founder-only decision boundary with row-locked state transitions and deadline-safe retries.';

commit;
