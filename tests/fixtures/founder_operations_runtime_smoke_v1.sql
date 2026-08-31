\set ON_ERROR_STOP on

set request.jwt.claim.role = 'service_role';

select public.operations_register_agent_v1(jsonb_build_object(
  'agent_key', 'fixture-agent-v1',
  'display_name', 'Fixture Agent',
  'domain', 'fixture',
  'execution_platform', 'local_postgres',
  'source_locator', 'tests/fixtures/founder_operations_runtime_smoke_v1.sql',
  'allowed_work_item_types', jsonb_build_array('fixture_review', 'fixture_execute'),
  'allowed_command_actions', jsonb_build_array('review_fixture', 'execute_fixture'),
  'executor_version', 'fixture-executor-v1',
  'escalation_policy', jsonb_build_object(
    'founder_pause_allowed', true,
    'stale_severity', 'high'
  )
));

select * from public.operations_agent_heartbeat_v1(jsonb_build_object(
  'agent_key', 'fixture-agent-v1',
  'run_key', 'fixture-run-1',
  'status', 'succeeded',
  'summary', jsonb_build_object('fixture', true)
));

select public.operations_publish_incident_v1(jsonb_build_object(
  'incident_key', 'fixture-incident-1',
  'agent_key', 'fixture-agent-v1',
  'incident_type', 'fixture_failure',
  'severity', 'warning',
  'title', 'Fixture incident',
  'summary', 'Disposable migration smoke incident.',
  'evidence', jsonb_build_object('fixture', true)
));

select public.operations_recover_incident_v1(
  'fixture-incident-1',
  'Disposable fixture recovered.'
);

select * from public.operations_publish_work_item_v1(jsonb_build_object(
  'work_item_key', 'fixture:review:1',
  'work_item_type', 'fixture_review',
  'action_type', 'review_fixture',
  'agent_key', 'fixture-agent-v1',
  'title', 'Review fixture plan',
  'summary', 'Review-only migration smoke item.',
  'domain', 'fixture',
  'risk_level', 'low',
  'scope', jsonb_build_object('fixture_id', 1),
  'exclusions', jsonb_build_array('no production writes'),
  'plan_payload', jsonb_build_object('fixture_id', 1),
  'plan_fingerprint', repeat('a', 64),
  'contract_version', 'FOUNDER_WORK_ITEM_COMMAND_V1',
  'command_policy', jsonb_build_object('execution_enabled', false),
  'expires_at', now() + interval '1 day'
));

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'founder@example.test');

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.iat = '1788048000';

select * from public.founder_operations_decide_v1(
  (select id from public.founder_work_items where work_item_key = 'fixture:review:1'),
  1,
  repeat('a', 64),
  'approve',
  'fixture-review-approve-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1',
  'Fixture approval.',
  null
);

select * from public.founder_operations_control_agent_v1(
  'fixture-agent-v1',
  'pause_agent',
  'Fixture safety pause.',
  'fixture-agent-pause-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1'
);

select * from public.founder_operations_control_agent_v1(
  'fixture-agent-v1',
  'resume_agent',
  'Fixture safety resume.',
  'fixture-agent-resume-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1'
);

set request.jwt.claim.role = 'service_role';

select * from public.operations_publish_work_item_v1(jsonb_build_object(
  'work_item_key', 'fixture:execute:1',
  'work_item_type', 'fixture_execute',
  'action_type', 'execute_fixture',
  'agent_key', 'fixture-agent-v1',
  'title', 'Execute fixture plan',
  'summary', 'Bounded migration smoke command.',
  'domain', 'fixture',
  'risk_level', 'low',
  'scope', jsonb_build_object('fixture_id', 2),
  'exclusions', jsonb_build_array('no production writes'),
  'plan_payload', jsonb_build_object('fixture_id', 2),
  'plan_fingerprint', repeat('b', 64),
  'contract_version', 'FOUNDER_WORK_ITEM_COMMAND_V1',
  'executor_version', 'fixture-executor-v1',
  'command_policy', jsonb_build_object(
    'execution_enabled', true,
    'execution_deadline_seconds', 3600,
    'cost_ceiling_usd', 0
  ),
  'expires_at', now() + interval '1 day'
));

select * from public.founder_operations_decide_v1(
  (select id from public.founder_work_items where work_item_key = 'fixture:execute:1'),
  1,
  repeat('b', 64),
  'approve',
  'fixture-execute-approve-0001',
  'FOUNDER_OPERATIONS_MOBILE_V1',
  'Fixture bounded command approval.',
  null
);

create temporary table claimed_command as
select public.operations_claim_command_v1('fixture-executor-v1', 300) as payload;

select public.operations_complete_command_v1(
  (payload ->> 'id')::uuid,
  (payload ->> 'lease_token')::uuid,
  'succeeded',
  jsonb_build_object('passed', true, 'plan_fingerprint', repeat('b', 64)),
  jsonb_build_object('reconciled', true, 'written_rows', 0),
  null
)
from claimed_command;

select public.operations_run_maintenance_v1();

do $$
begin
  if (select count(*) from public.founder_work_items) <> 2 then
    raise exception 'fixture_work_item_count_mismatch';
  end if;
  if (select count(*) from public.operations_commands where status = 'succeeded') <> 1 then
    raise exception 'fixture_command_reconciliation_missing';
  end if;
  if (select count(*) from public.operations_incidents where status = 'recovered') <> 1 then
    raise exception 'fixture_incident_recovery_missing';
  end if;
  if (select count(*) from public.founder_agent_control_decisions) <> 2 then
    raise exception 'fixture_agent_control_audit_missing';
  end if;
  if has_table_privilege('authenticated', 'public.founder_work_items', 'select') then
    raise exception 'authenticated_table_access_must_remain_denied';
  end if;
end;
$$;
