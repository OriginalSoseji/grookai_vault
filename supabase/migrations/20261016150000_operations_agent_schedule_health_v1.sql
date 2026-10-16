begin;

create or replace function public.founder_operations_agent_health_v1()
returns table (
  agent_key text, display_name text, domain text, execution_platform text,
  source_locator text, health text, is_paused boolean, paused_reason text,
  last_heartbeat_at timestamptz, last_success_at timestamptz,
  stale_after_seconds integer, latest_run_status text, latest_run_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  return query
  select a.agent_key, a.display_name, a.domain, a.execution_platform,
    a.source_locator,
    case
      when not a.is_enabled then 'unknown'
      when a.is_paused then 'paused'
      when a.last_heartbeat_at is null and latest.status is null then 'unknown'
      when a.schedule_kind in ('cron', 'timer', 'continuous')
        and (a.last_heartbeat_at is null
          or a.last_heartbeat_at < now() - make_interval(secs => a.stale_after_seconds))
        then 'stale'
      when latest.status = 'failed' then 'failed'
      when latest.status = 'running' then 'running'
      else 'healthy'
    end,
    a.is_paused, a.paused_reason, a.last_heartbeat_at, a.last_success_at,
    a.stale_after_seconds, latest.status, latest.heartbeat_at
  from public.operations_agents a
  left join lateral (
    select r.status, r.heartbeat_at from public.operations_agent_runs r
    where r.agent_id = a.id order by r.heartbeat_at desc limit 1
  ) latest on true
  where a.is_enabled
  order by a.domain, a.display_name;
end;
$$;

create or replace function public.operations_run_maintenance_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_work_item public.founder_work_items%rowtype;
  v_command public.operations_commands%rowtype;
  v_agent public.operations_agents%rowtype;
  v_incident public.operations_incidents%rowtype;
  v_expired_work_items integer := 0;
  v_expired_commands integer := 0;
  v_expired_leases integer := 0;
  v_stale_opened integer := 0;
  v_stale_recovered integer := 0;
  v_severity text;
begin
  perform public.operations_require_service_role_v1();

  for v_work_item in
    select * from public.founder_work_items
     where state in ('ready_for_review', 'deferred') and expires_at <= now()
     for update skip locked
  loop
    update public.founder_work_items set
      state = 'expired', state_reason = 'plan_expired'
    where id = v_work_item.id;
    insert into public.founder_work_item_events (
      work_item_id, event_type, actor_type, actor_key, payload
    ) values (
      v_work_item.id, 'expired', 'system', 'operations-maintenance-v1',
      jsonb_build_object('expires_at', v_work_item.expires_at)
    );
    v_expired_work_items := v_expired_work_items + 1;
  end loop;

  for v_command in
    select * from public.operations_commands
     where status = 'queued' and execution_deadline_at <= now()
     for update skip locked
  loop
    update public.operations_commands set
      status = 'expired', finished_at = now(),
      error_summary = jsonb_build_object('failure_class', 'execution_deadline_expired')
    where id = v_command.id;
    update public.founder_work_items set
      state = 'expired', state_reason = 'command_execution_deadline_expired'
    where id = v_command.work_item_id and state = 'queued';
    insert into public.operations_command_events (command_id, event_type, payload)
    values (v_command.id, 'expired', jsonb_build_object(
      'execution_deadline_at', v_command.execution_deadline_at
    ));
    insert into public.founder_work_item_events (
      work_item_id, event_type, actor_type, actor_key, payload
    ) values (
      v_command.work_item_id, 'command_expired', 'system', 'operations-maintenance-v1',
      jsonb_build_object('command_id', v_command.id)
    );
    v_expired_commands := v_expired_commands + 1;
  end loop;

  for v_command in
    select * from public.operations_commands
     where status in ('leased', 'running') and lease_expires_at <= now()
     for update skip locked
  loop
    update public.operations_command_attempts set
      status = 'expired', finished_at = now(),
      error_summary = jsonb_build_object('failure_class', 'executor_lease_expired')
    where command_id = v_command.id and lease_token = v_command.lease_token
      and status in ('leased', 'running');
    update public.operations_commands set
      status = 'failed', finished_at = now(), lease_expires_at = null,
      error_summary = jsonb_build_object('failure_class', 'executor_lease_expired')
    where id = v_command.id;
    update public.founder_work_items set
      state = 'failed', state_reason = 'executor_lease_expired'
    where id = v_command.work_item_id;
    insert into public.operations_command_events (command_id, event_type, payload)
    values (v_command.id, 'lease_expired', jsonb_build_object(
      'attempt_number', v_command.attempt_count,
      'leased_by', v_command.leased_by
    ));
    insert into public.founder_work_item_events (
      work_item_id, event_type, actor_type, actor_key, payload
    ) values (
      v_command.work_item_id, 'command_failed', 'system', 'operations-maintenance-v1',
      jsonb_build_object('command_id', v_command.id, 'failure_class', 'executor_lease_expired')
    );
    perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
      'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
      'notification_id', 'founder-command:' || v_command.id::text ||
        ':lease-expired-attempt-' || v_command.attempt_count::text,
      'event', 'founder_command_failed',
      'severity', 'high',
      'created_at', now(),
      'host', 'operations-maintenance-v1',
      'unit', coalesce(v_command.leased_by, 'unknown-executor'),
      'work_item_id', v_command.work_item_id,
      'command_id', v_command.id,
      'title', 'Founder operation lease expired',
      'summary', 'The executor stopped heartbeating before reconciliation. Manual retry is required.'
    ));
    v_expired_leases := v_expired_leases + 1;
  end loop;

  for v_agent in
    select * from public.operations_agents
     where is_enabled and not is_paused
       and schedule_kind in ('cron', 'timer', 'continuous')
       and (last_heartbeat_at is null
         or last_heartbeat_at < now() - make_interval(secs => stale_after_seconds))
  loop
    select * into v_incident from public.operations_incidents
     where incident_key = 'agent-stale:' || v_agent.agent_key;
    if not found or v_incident.status in ('recovered', 'resolved') then
      v_severity := coalesce(nullif(v_agent.escalation_policy ->> 'stale_severity', ''), 'high');
      if v_severity not in ('critical', 'high', 'warning', 'info') then v_severity := 'high'; end if;
      perform public.operations_publish_incident_v1(jsonb_build_object(
        'incident_key', 'agent-stale:' || v_agent.agent_key,
        'agent_key', v_agent.agent_key,
        'incident_type', 'agent_stale',
        'severity', v_severity,
        'title', v_agent.display_name || ' is stale',
        'summary', 'No heartbeat arrived inside the registered stale threshold.',
        'evidence', jsonb_build_object(
          'last_heartbeat_at', v_agent.last_heartbeat_at,
          'stale_after_seconds', v_agent.stale_after_seconds,
          'checked_at', now()
        )
      ));
      v_stale_opened := v_stale_opened + 1;
    end if;
  end loop;

  for v_incident in
    select i.* from public.operations_incidents i
    join public.operations_agents a on a.id = i.agent_id
    where i.incident_key = 'agent-stale:' || a.agent_key
      and i.status in ('open', 'acknowledged')
      and (
        not a.is_enabled
        or a.is_paused
        or a.schedule_kind in ('event', 'manual')
        or (
          a.last_heartbeat_at is not null
          and a.last_heartbeat_at >= now() - make_interval(secs => a.stale_after_seconds)
        )
      )
  loop
    perform public.operations_recover_incident_v1(
      v_incident.incident_key,
      case
        when exists (
          select 1 from public.operations_agents a
          where a.id = v_incident.agent_id and a.schedule_kind in ('event', 'manual')
        ) then 'Event and manual agents are healthy while idle; no periodic heartbeat is required.'
        else 'Agent heartbeat is current, disabled, or the agent was intentionally paused.'
      end
    );
    v_stale_recovered := v_stale_recovered + 1;
  end loop;

  return jsonb_build_object(
    'maintenance_version', 'OPERATIONS_MAINTENANCE_V1_1',
    'checked_at', now(),
    'expired_work_items', v_expired_work_items,
    'expired_commands', v_expired_commands,
    'expired_leases', v_expired_leases,
    'stale_incidents_opened', v_stale_opened,
    'stale_incidents_recovered', v_stale_recovered
  );
end;
$$;

commit;
