begin;

create table public.operations_outcome_workflow_stage_receipts (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references public.operations_commands(id),
  attempt_number integer not null,
  stage_index integer not null,
  stage_key text not null,
  stage_fingerprint text not null,
  status text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint operations_outcome_stage_attempt_chk check (attempt_number > 0),
  constraint operations_outcome_stage_index_chk check (stage_index >= 0),
  constraint operations_outcome_stage_key_chk
    check (stage_key ~ '^[a-z0-9][a-z0-9_.-]{2,127}$'),
  constraint operations_outcome_stage_fingerprint_chk
    check (stage_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint operations_outcome_stage_status_chk
    check (status in ('started', 'succeeded', 'failed')),
  constraint operations_outcome_stage_result_chk check (jsonb_typeof(result) = 'object')
);

create unique index operations_outcome_stage_succeeded_once_idx
  on public.operations_outcome_workflow_stage_receipts (command_id, stage_key)
  where status = 'succeeded';
create index operations_outcome_stage_timeline_idx
  on public.operations_outcome_workflow_stage_receipts
  (command_id, stage_index, created_at, id);

create trigger trg_operations_outcome_stage_receipts_append_only
before update or delete on public.operations_outcome_workflow_stage_receipts
for each row execute function public.prevent_operations_append_only_mutation_v1();

alter table public.operations_outcome_workflow_stage_receipts enable row level security;
revoke all on table public.operations_outcome_workflow_stage_receipts
  from public, anon, authenticated;

create or replace function public.operations_record_outcome_workflow_stage_v1(
  p_command_id uuid,
  p_lease_token uuid,
  p_stage_index integer,
  p_stage_key text,
  p_stage_fingerprint text,
  p_status text,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_command public.operations_commands%rowtype;
  v_stage jsonb;
  v_receipt public.operations_outcome_workflow_stage_receipts%rowtype;
begin
  perform public.operations_require_service_role_v1();
  if p_status not in ('started', 'succeeded', 'failed') then
    raise exception 'invalid_outcome_workflow_stage_status';
  end if;
  if p_stage_index < 0 then raise exception 'invalid_outcome_workflow_stage_index'; end if;
  if btrim(p_stage_key) !~ '^[a-z0-9][a-z0-9_.-]{2,127}$' then
    raise exception 'invalid_outcome_workflow_stage_key';
  end if;
  if btrim(p_stage_fingerprint) !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_outcome_workflow_stage_fingerprint';
  end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object' then
    raise exception 'outcome_workflow_stage_result_object_required';
  end if;
  if p_status = 'succeeded'
      and coalesce((p_result ->> 'reconciled')::boolean, false) is not true then
    raise exception 'successful_outcome_workflow_stage_requires_reconciliation';
  end if;

  select * into v_command from public.operations_commands
  where id = p_command_id for update;
  if not found then raise exception 'operations_command_not_found'; end if;
  if v_command.action_type <> 'execute_registered_outcome_workflow_v1'
      or v_command.executor_version <> 'FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_V1' then
    raise exception 'command_is_not_registered_outcome_workflow';
  end if;
  if v_command.status not in ('leased', 'running')
      or v_command.lease_token is distinct from p_lease_token
      or v_command.lease_expires_at <= now() then
    raise exception 'operations_command_lease_invalid';
  end if;

  select stage into v_stage
  from jsonb_array_elements(
    coalesce(v_command.frozen_scope #> '{plan_payload,outcome_workflow,stages}', '[]'::jsonb)
  ) with ordinality as frozen(stage, ordinal)
  where ordinal - 1 = p_stage_index
    and stage ->> 'stage_key' = btrim(p_stage_key)
    and stage ->> 'stage_fingerprint' = lower(btrim(p_stage_fingerprint));
  if v_stage is null then raise exception 'outcome_workflow_stage_not_in_frozen_plan'; end if;

  if p_status = 'succeeded' then
    select * into v_receipt
    from public.operations_outcome_workflow_stage_receipts
    where command_id = p_command_id and stage_key = btrim(p_stage_key)
      and status = 'succeeded';
    if found then return to_jsonb(v_receipt); end if;
  end if;

  insert into public.operations_outcome_workflow_stage_receipts (
    command_id, attempt_number, stage_index, stage_key,
    stage_fingerprint, status, result
  ) values (
    p_command_id, v_command.attempt_count, p_stage_index, btrim(p_stage_key),
    lower(btrim(p_stage_fingerprint)), p_status, p_result
  ) returning * into v_receipt;

  insert into public.operations_command_events (command_id, event_type, payload)
  values (p_command_id, 'workflow_stage_' || p_status, jsonb_build_object(
    'stage_index', p_stage_index,
    'stage_key', btrim(p_stage_key),
    'stage_fingerprint', lower(btrim(p_stage_fingerprint)),
    'attempt_number', v_command.attempt_count,
    'result', p_result
  ));
  insert into public.founder_work_item_events (
    work_item_id, event_type, actor_type, actor_key, payload
  ) values (
    v_command.work_item_id, 'workflow_stage_' || p_status, 'executor',
    v_command.leased_by, jsonb_build_object(
      'command_id', p_command_id,
      'stage_index', p_stage_index,
      'stage_key', btrim(p_stage_key),
      'attempt_number', v_command.attempt_count
    )
  );
  return to_jsonb(v_receipt);
end;
$$;

create or replace function public.operations_outcome_workflow_progress_v1(
  p_command_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_command public.operations_commands%rowtype;
begin
  perform public.operations_require_service_role_v1();
  select * into v_command from public.operations_commands where id = p_command_id;
  if not found then raise exception 'operations_command_not_found'; end if;
  if v_command.action_type <> 'execute_registered_outcome_workflow_v1'
      or v_command.executor_version <> 'FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_V1' then
    raise exception 'command_is_not_registered_outcome_workflow';
  end if;
  if v_command.status not in ('leased', 'running')
      or v_command.lease_token is distinct from p_lease_token
      or v_command.lease_expires_at <= now() then
    raise exception 'operations_command_lease_invalid';
  end if;
  return jsonb_build_object(
    'command_id', p_command_id,
    'workflow_fingerprint',
      v_command.frozen_scope #>> '{plan_payload,outcome_workflow,workflow_fingerprint}',
    'completed_stage_keys', coalesce((
      select jsonb_agg(r.stage_key order by r.stage_index)
      from public.operations_outcome_workflow_stage_receipts r
      where r.command_id = p_command_id and r.status = 'succeeded'
    ), '[]'::jsonb),
    'receipts', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at, r.id)
      from public.operations_outcome_workflow_stage_receipts r
      where r.command_id = p_command_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.operations_requeue_retryable_outcome_workflows_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_command public.operations_commands%rowtype;
  v_requeued integer := 0;
begin
  perform public.operations_require_service_role_v1();
  for v_command in
    select c.* from public.operations_commands c
    join public.founder_work_items w on w.id = c.work_item_id
    join public.operations_agents a on a.id = c.agent_id
    where c.status = 'failed'
      and w.state = 'failed'
      and c.action_type = 'execute_registered_outcome_workflow_v1'
      and c.executor_version = 'FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_V1'
      and c.attempt_count < c.max_attempts
      and c.execution_deadline_at > now()
      and a.is_enabled and not a.is_paused
      and coalesce((c.frozen_scope #>>
        '{plan_payload,outcome_workflow,automatic_transient_retry}')::boolean, false)
      and coalesce(c.error_summary ->> 'failure_class', '') in (
        'executor_lease_expired', 'transient_executor_failure',
        'provider_rate_limit', 'network_timeout'
      )
    order by c.finished_at, c.id
    for update of c, w skip locked
  loop
    update public.operations_commands set
      status = 'queued', lease_token = null, leased_by = null,
      lease_expires_at = null, finished_at = null, error_summary = null
    where id = v_command.id;
    update public.founder_work_items set
      state = 'queued', state_reason = 'automatic_transient_retry_queued'
    where id = v_command.work_item_id;
    insert into public.operations_command_events (command_id, event_type, payload)
    values (v_command.id, 'automatic_retry_queued', jsonb_build_object(
      'prior_attempt_number', v_command.attempt_count,
      'failure_class', v_command.error_summary ->> 'failure_class'
    ));
    insert into public.founder_work_item_events (
      work_item_id, event_type, actor_type, actor_key, payload
    ) values (
      v_command.work_item_id, 'automatic_retry_queued', 'system',
      'founder-outcome-workflow-v1', jsonb_build_object(
        'command_id', v_command.id,
        'prior_attempt_number', v_command.attempt_count
      )
    );
    v_requeued := v_requeued + 1;
  end loop;
  return jsonb_build_object(
    'version', 'FOUNDER_OUTCOME_WORKFLOW_V1',
    'requeued_commands', v_requeued
  );
end;
$$;

create or replace function public.founder_operations_work_item_v1(p_work_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'work_item', to_jsonb(w) - 'agent_id' - 'source_run_id',
    'agent', jsonb_build_object(
      'agent_key', a.agent_key, 'display_name', a.display_name,
      'domain', a.domain, 'platform', a.execution_platform,
      'source_locator', a.source_locator, 'paused', a.is_paused
    ),
    'evidence', coalesce((select jsonb_agg(
      jsonb_build_object(
        'evidence_key', e.evidence_key, 'sha256', e.sha256,
        'media_type', e.media_type, 'byte_size', e.byte_size,
        'source_uri', e.source_uri, 'durable_uri', e.durable_uri,
        'retention_class', e.retention_class, 'summary', e.summary,
        'metadata', e.metadata, 'role', link.evidence_role
      ) order by link.created_at)
      from public.founder_work_item_evidence link
      join public.operations_evidence_objects e on e.id = link.evidence_id
      where link.work_item_id = w.id), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(
      jsonb_build_object(
        'decision', d.decision, 'note', d.note, 'created_at', d.created_at,
        'expected_version', d.expected_version
      ) order by d.created_at, d.id)
      from public.founder_decisions d where d.work_item_id = w.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(
      jsonb_build_object(
        'event_type', ev.event_type, 'actor_type', ev.actor_type,
        'actor_key', ev.actor_key, 'payload', ev.payload, 'created_at', ev.created_at
      ) order by ev.created_at, ev.id)
      from public.founder_work_item_events ev where ev.work_item_id = w.id), '[]'::jsonb),
    'command', (select to_jsonb(c) - 'lease_token'
      from public.operations_commands c where c.work_item_id = w.id limit 1),
    'workflow_stages', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at, r.id)
      from public.operations_outcome_workflow_stage_receipts r
      join public.operations_commands c on c.id = r.command_id
      where c.work_item_id = w.id), '[]'::jsonb)
  ) into v_result
  from public.founder_work_items w
  join public.operations_agents a on a.id = w.agent_id
  where w.id = p_work_item_id;
  if v_result is null then raise exception 'founder_work_item_not_found'; end if;
  return v_result;
end;
$$;

revoke all on function public.operations_record_outcome_workflow_stage_v1(
  uuid, uuid, integer, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.operations_outcome_workflow_progress_v1(
  uuid, uuid
) from public, anon, authenticated;
revoke all on function public.operations_requeue_retryable_outcome_workflows_v1()
  from public, anon, authenticated;

grant execute on function public.operations_record_outcome_workflow_stage_v1(
  uuid, uuid, integer, text, text, text, jsonb
) to service_role;
grant execute on function public.operations_outcome_workflow_progress_v1(
  uuid, uuid
) to service_role;
grant execute on function public.operations_requeue_retryable_outcome_workflows_v1()
  to service_role;

comment on table public.operations_outcome_workflow_stage_receipts is
'Append-only, service-only receipts for stages already authorized by one frozen founder outcome approval.';
comment on function public.operations_requeue_retryable_outcome_workflows_v1() is
'Automatically requeues only registered outcome workflows after allowlisted transient failures; scope and plan remain immutable.';

commit;
