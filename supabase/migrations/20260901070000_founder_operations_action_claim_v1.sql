begin;

create or replace function public.operations_guard_work_item_supersession_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state <> 'superseded' or old.state = 'superseded' then
    return new;
  end if;

  perform 1
  from public.operations_commands c
  where c.work_item_id = old.id
  order by c.id
  for update;

  if exists (
    select 1 from public.operations_commands c
    where c.work_item_id = old.id and c.status in ('leased', 'running')
  ) then
    raise exception 'active_command_blocks_work_item_supersession';
  end if;

  insert into public.operations_command_events (command_id, event_type, payload)
  select c.id, 'cancelled', jsonb_build_object(
    'reason', 'work_item_superseded',
    'replacement_state', new.state
  )
  from public.operations_commands c
  where c.work_item_id = old.id and c.status = 'queued';

  update public.operations_commands c set
    status = 'cancelled',
    finished_at = now(),
    updated_at = now(),
    result_summary = jsonb_build_object('reason', 'work_item_superseded')
  where c.work_item_id = old.id and c.status = 'queued';

  return new;
end;
$$;

revoke all on function public.operations_guard_work_item_supersession_v1() from public;

drop trigger if exists operations_guard_work_item_supersession_v1
  on public.founder_work_items;
create trigger operations_guard_work_item_supersession_v1
before update of state on public.founder_work_items
for each row execute function public.operations_guard_work_item_supersession_v1();

create or replace function public.operations_peek_command_action_v1(
  p_action_type text,
  p_executor_version text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  perform public.operations_require_service_role_v1();
  if char_length(btrim(p_action_type)) not between 3 and 128 then
    raise exception 'valid_action_type_required';
  end if;
  if char_length(btrim(p_executor_version)) not between 3 and 128 then
    raise exception 'valid_executor_version_required';
  end if;
  if exists (select 1 from public.operations_control_state where execution_paused) then
    return null;
  end if;

  select jsonb_build_object(
    'command_id', c.id,
    'action_type', c.action_type,
    'executor_version', c.executor_version,
    'plan_fingerprint', c.plan_fingerprint,
    'source_commit_sha', c.frozen_scope #>> '{plan_payload,source_commit_sha}',
    'execution_deadline_at', c.execution_deadline_at
  ) into v_result
  from public.operations_commands c
  join public.operations_agents a on a.id = c.agent_id
  join public.founder_work_items w on w.id = c.work_item_id
  where c.status = 'queued'
    and w.state = 'queued'
    and c.execution_deadline_at > now()
    and a.is_enabled
    and not a.is_paused
    and c.action_type = btrim(p_action_type)
    and c.executor_version = btrim(p_executor_version)
    and c.action_type = any(a.allowed_command_actions)
  order by c.created_at
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.operations_peek_command_action_v1(
  text, text
) from public, anon, authenticated;
grant execute on function public.operations_peek_command_action_v1(
  text, text
) to service_role;

create or replace function public.operations_claim_command_action_v1(
  p_executor_key text,
  p_action_type text,
  p_executor_version text,
  p_expected_command_id uuid,
  p_source_commit_sha text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_command public.operations_commands%rowtype;
  v_lease uuid := gen_random_uuid();
begin
  perform public.operations_require_service_role_v1();
  if char_length(btrim(p_executor_key)) not between 3 and 128 then
    raise exception 'valid_executor_key_required';
  end if;
  if char_length(btrim(p_action_type)) not between 3 and 128 then
    raise exception 'valid_action_type_required';
  end if;
  if char_length(btrim(p_executor_version)) not between 3 and 128 then
    raise exception 'valid_executor_version_required';
  end if;
  if p_expected_command_id is null then
    raise exception 'expected_command_id_required';
  end if;
  if btrim(p_source_commit_sha) !~ '^[a-f0-9]{40}$' then
    raise exception 'valid_source_commit_sha_required';
  end if;
  if p_lease_seconds not between 30 and 1800 then
    raise exception 'invalid_lease_seconds';
  end if;
  if exists (select 1 from public.operations_control_state where execution_paused) then
    return null;
  end if;

  select c.* into v_command
  from public.operations_commands c
  join public.operations_agents a on a.id = c.agent_id
  join public.founder_work_items w on w.id = c.work_item_id
  where c.status = 'queued'
    and w.state = 'queued'
    and c.execution_deadline_at > now()
    and a.is_enabled
    and not a.is_paused
    and c.action_type = btrim(p_action_type)
    and c.executor_version = btrim(p_executor_version)
    and c.id = p_expected_command_id
    and c.frozen_scope #>> '{plan_payload,source_commit_sha}' = btrim(p_source_commit_sha)
    and c.action_type = any(a.allowed_command_actions)
  order by c.created_at
  for update of c, w skip locked
  limit 1;
  if not found then return null; end if;

  update public.operations_commands set
    status = 'leased',
    lease_token = v_lease,
    leased_by = btrim(p_executor_key),
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    started_at = coalesce(started_at, now())
  where id = v_command.id
  returning * into v_command;

  insert into public.operations_command_attempts (
    command_id, attempt_number, lease_token, executor_key, status
  ) values (
    v_command.id, v_command.attempt_count, v_lease, btrim(p_executor_key), 'leased'
  );
  insert into public.operations_command_events (command_id, event_type, payload)
  values (v_command.id, 'leased', jsonb_build_object(
    'executor_key', btrim(p_executor_key),
    'action_type', btrim(p_action_type),
    'executor_version', btrim(p_executor_version),
    'source_commit_sha', btrim(p_source_commit_sha),
    'attempt_number', v_command.attempt_count
  ));
  update public.founder_work_items
  set state = 'running', state_reason = 'command_leased'
  where id = v_command.work_item_id;
  return to_jsonb(v_command);
end;
$$;

revoke all on function public.operations_claim_command_action_v1(
  text, text, text, uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.operations_claim_command_action_v1(
  text, text, text, uuid, text, integer
) to service_role;

commit;
