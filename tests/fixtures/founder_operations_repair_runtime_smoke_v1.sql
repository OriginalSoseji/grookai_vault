\set ON_ERROR_STOP on

set request.jwt.claim.role = 'service_role';

select * from public.operations_publish_work_item_v1(jsonb_build_object(
  'work_item_key', 'fixture:repair:queued-state',
  'work_item_type', 'fixture_execute',
  'action_type', 'execute_fixture',
  'agent_key', 'fixture-agent-v1',
  'title', 'Queued state guard fixture',
  'summary', 'Proves a queued command cannot be invalidated by a later review decision.',
  'domain', 'fixture',
  'risk_level', 'low',
  'scope', jsonb_build_object('fixture_id', 3),
  'exclusions', jsonb_build_array('no production writes'),
  'plan_payload', jsonb_build_object('fixture_id', 3),
  'plan_fingerprint', repeat('c', 64),
  'contract_version', 'FOUNDER_WORK_ITEM_COMMAND_V1',
  'executor_version', 'fixture-executor-v1',
  'command_policy', jsonb_build_object(
    'execution_enabled', true,
    'execution_deadline_seconds', 3600,
    'cost_ceiling_usd', 0
  ),
  'expires_at', now() + interval '1 day'
));

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.iat = '1788048000';

select * from public.founder_operations_decide_v1(
  (select id from public.founder_work_items where work_item_key = 'fixture:repair:queued-state'),
  1,
  repeat('c', 64),
  'approve',
  'fixture-repair-queued-approve-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1',
  'Queue fixture command.',
  null
);

do $$
begin
  begin
    perform public.founder_operations_decide_v1(
      (select id from public.founder_work_items where work_item_key = 'fixture:repair:queued-state'),
      (select version from public.founder_work_items
       where work_item_key = 'fixture:repair:queued-state'),
      repeat('c', 64),
      'reject',
      'fixture-repair-queued-reject-0001',
      'FOUNDER_OPERATIONS_MOBILE_V1',
      'This stale decision must be blocked.',
      null
    );
    raise exception 'queued_state_guard_missing';
  exception
    when others then
      if sqlerrm <> 'founder_work_item_not_actionable' then
        raise;
      end if;
  end;

  if (select state from public.founder_work_items
      where work_item_key = 'fixture:repair:queued-state') <> 'queued' then
    raise exception 'queued_work_item_state_changed';
  end if;
  if (select status from public.operations_commands c
      join public.founder_work_items w on w.id = c.work_item_id
      where w.work_item_key = 'fixture:repair:queued-state') <> 'queued' then
    raise exception 'queued_command_status_changed';
  end if;
end;
$$;

set request.jwt.claim.role = 'service_role';

select * from public.operations_publish_work_item_v1(jsonb_build_object(
  'work_item_key', 'fixture:repair:expired-retry',
  'work_item_type', 'fixture_execute',
  'action_type', 'execute_fixture',
  'agent_key', 'fixture-agent-v1',
  'title', 'Expired retry guard fixture',
  'summary', 'Proves an expired failed command cannot return to the queue.',
  'domain', 'fixture',
  'risk_level', 'low',
  'scope', jsonb_build_object('fixture_id', 4),
  'exclusions', jsonb_build_array('no production writes'),
  'plan_payload', jsonb_build_object('fixture_id', 4),
  'plan_fingerprint', repeat('d', 64),
  'contract_version', 'FOUNDER_WORK_ITEM_COMMAND_V1',
  'executor_version', 'fixture-executor-v1',
  'command_policy', jsonb_build_object(
    'execution_enabled', true,
    'execution_deadline_seconds', 1,
    'cost_ceiling_usd', 0
  ),
  'expires_at', now() + interval '1 day'
));

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.iat = '1788048000';

select * from public.founder_operations_decide_v1(
  (select id from public.founder_work_items where work_item_key = 'fixture:repair:expired-retry'),
  1,
  repeat('d', 64),
  'approve',
  'fixture-repair-expired-approve-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1',
  'Queue retry fixture command.',
  null
);

set request.jwt.claim.role = 'service_role';

select pg_sleep(1.1);

update public.operations_commands c
set status = 'failed'
from public.founder_work_items w
where w.id = c.work_item_id
  and w.work_item_key = 'fixture:repair:expired-retry';

update public.founder_work_items
set state = 'failed', state_reason = 'fixture_failed'
where work_item_key = 'fixture:repair:expired-retry';

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.iat = '1788048000';

do $$
begin
  begin
    perform public.founder_operations_decide_v1(
      (select id from public.founder_work_items where work_item_key = 'fixture:repair:expired-retry'),
      (select version from public.founder_work_items
       where work_item_key = 'fixture:repair:expired-retry'),
      repeat('d', 64),
      'retry',
      'fixture-repair-expired-retry-0001',
      'FOUNDER_OPERATIONS_MOBILE_V1',
      'Expired retry must be blocked.',
      null
    );
    raise exception 'expired_retry_guard_missing';
  exception
    when others then
      if sqlerrm <> 'command_retry_deadline_expired' then
        raise;
      end if;
  end;

  if (select state from public.founder_work_items
      where work_item_key = 'fixture:repair:expired-retry') <> 'failed' then
    raise exception 'expired_retry_work_item_state_changed';
  end if;
end;
$$;

set request.jwt.claim.role = 'service_role';

select * from public.operations_publish_work_item_v1(jsonb_build_object(
  'work_item_key', 'fixture:repair:deferred-count',
  'work_item_type', 'fixture_review',
  'action_type', 'review_fixture',
  'agent_key', 'fixture-agent-v1',
  'title', 'Deferred count fixture',
  'summary', 'Proves counts and list visibility use the same due-time policy.',
  'domain', 'fixture',
  'risk_level', 'low',
  'scope', jsonb_build_object('fixture_id', 5),
  'exclusions', jsonb_build_array('no production writes'),
  'plan_payload', jsonb_build_object('fixture_id', 5),
  'plan_fingerprint', repeat('e', 64),
  'contract_version', 'FOUNDER_WORK_ITEM_COMMAND_V1',
  'command_policy', jsonb_build_object('execution_enabled', false),
  'expires_at', now() + interval '1 day'
));

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.iat = '1788048000';

select * from public.founder_operations_decide_v1(
  (select id from public.founder_work_items where work_item_key = 'fixture:repair:deferred-count'),
  1,
  repeat('e', 64),
  'defer',
  'fixture-repair-defer-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1',
  'Defer fixture item.',
  now() + interval '1 hour'
);

do $$
declare
  v_needs_action integer;
  v_list_count integer;
begin
  select needs_action into v_needs_action
  from public.founder_operations_counts_v1();

  select count(*) into v_list_count
  from public.founder_operations_work_items_v1('needs_action', 100);

  if v_needs_action <> v_list_count then
    raise exception 'needs_action_count_list_mismatch';
  end if;
  if exists (
    select 1 from public.founder_operations_work_items_v1('needs_action', 100)
    where work_item_key = 'fixture:repair:deferred-count'
  ) then
    raise exception 'future_deferred_item_visible';
  end if;
end;
$$;
