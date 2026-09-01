begin;

create or replace function public.operations_publish_work_item_v1(p_item jsonb)
returns table (work_item_id uuid, work_item_version integer, work_item_state text, created boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agent public.operations_agents%rowtype;
  v_existing public.founder_work_items%rowtype;
  v_id uuid;
  v_version integer;
  v_payload jsonb := coalesce(p_item -> 'plan_payload', '{}'::jsonb);
  v_payload_sha text;
  v_fingerprint text := lower(btrim(p_item ->> 'plan_fingerprint'));
  v_work_type text := btrim(p_item ->> 'work_item_type');
  v_action_type text := btrim(p_item ->> 'action_type');
  v_work_key text := btrim(p_item ->> 'work_item_key');
  v_evidence jsonb;
  v_evidence_id uuid;
begin
  perform public.operations_require_service_role_v1();
  if p_item is null or jsonb_typeof(p_item) <> 'object' then
    raise exception 'founder_work_item_payload_must_be_object';
  end if;
  if v_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_plan_fingerprint'; end if;
  if jsonb_typeof(v_payload) <> 'object' then raise exception 'plan_payload_must_be_object'; end if;
  v_payload_sha := encode(
    extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into v_agent from public.operations_agents
   where agent_key = btrim(p_item ->> 'agent_key') and is_enabled
   for update;
  if not found then raise exception 'registered_enabled_agent_required'; end if;
  if not (v_work_type = any(v_agent.allowed_work_item_types)) then
    raise exception 'agent_not_allowed_for_work_item_type';
  end if;
  if not (v_action_type = any(v_agent.allowed_command_actions)) then
    raise exception 'agent_not_allowed_for_action_type';
  end if;

  select * into v_existing from public.founder_work_items
   where work_item_key = v_work_key
   order by version desc limit 1 for update;
  if found and v_existing.plan_fingerprint = v_fingerprint then
    return query select v_existing.id, v_existing.version, v_existing.state, false;
    return;
  end if;
  if found and v_existing.state not in ('succeeded', 'rejected', 'cancelled', 'superseded', 'expired') then
    update public.founder_work_items set
      state = 'superseded', state_reason = 'new_plan_version_published'
    where id = v_existing.id;
    insert into public.founder_work_item_events (work_item_id, event_type, actor_type, actor_key, payload)
    values (v_existing.id, 'superseded', 'agent', v_agent.agent_key,
      jsonb_build_object('replacement_fingerprint', v_fingerprint));
  end if;
  v_version := coalesce(v_existing.version, 0) + 1;

  insert into public.founder_work_items (
    work_item_key, version, work_item_type, action_type, agent_id, source_run_id,
    supersedes_work_item_id, title, summary, domain, risk_level, scope,
    exclusions, plan_payload, payload_sha256, plan_fingerprint,
    source_commit_sha, contract_version, executor_version,
    requires_recent_auth, command_policy, expires_at
  ) values (
    v_work_key, v_version, v_work_type, v_action_type, v_agent.id,
    nullif(p_item ->> 'source_run_id', '')::uuid,
    v_existing.id, btrim(p_item ->> 'title'), btrim(p_item ->> 'summary'),
    btrim(p_item ->> 'domain'), coalesce(nullif(btrim(p_item ->> 'risk_level'), ''), 'medium'),
    coalesce(p_item -> 'scope', '{}'::jsonb), coalesce(p_item -> 'exclusions', '[]'::jsonb),
    v_payload, v_payload_sha, v_fingerprint,
    nullif(btrim(p_item ->> 'source_commit_sha'), ''),
    coalesce(nullif(btrim(p_item ->> 'contract_version'), ''), 'FOUNDER_WORK_ITEM_COMMAND_V1'),
    coalesce(nullif(btrim(p_item ->> 'executor_version'), ''), v_agent.executor_version),
    coalesce((p_item ->> 'requires_recent_auth')::boolean, false),
    coalesce(p_item -> 'command_policy', '{}'::jsonb),
    coalesce((p_item ->> 'expires_at')::timestamptz, now() + interval '7 days')
  ) returning id into v_id;

  for v_evidence in select value from jsonb_array_elements(coalesce(p_item -> 'evidence', '[]'::jsonb)) loop
    insert into public.operations_evidence_objects (
      evidence_key, sha256, media_type, byte_size, source_uri, durable_uri,
      retention_class, summary, metadata
    ) values (
      btrim(v_evidence ->> 'evidence_key'), lower(btrim(v_evidence ->> 'sha256')),
      coalesce(nullif(btrim(v_evidence ->> 'media_type'), ''), 'application/json'),
      nullif(v_evidence ->> 'byte_size', '')::bigint,
      nullif(btrim(v_evidence ->> 'source_uri'), ''),
      nullif(btrim(v_evidence ->> 'durable_uri'), ''),
      coalesce(nullif(btrim(v_evidence ->> 'retention_class'), ''), 'workflow_90_day'),
      coalesce(v_evidence ->> 'summary', ''), coalesce(v_evidence -> 'metadata', '{}'::jsonb)
    )
    on conflict (evidence_key) do nothing
    returning id into v_evidence_id;
    if v_evidence_id is null then
      select id into v_evidence_id from public.operations_evidence_objects
       where evidence_key = btrim(v_evidence ->> 'evidence_key')
         and sha256 = lower(btrim(v_evidence ->> 'sha256'));
    end if;
    if v_evidence_id is null then raise exception 'evidence_key_hash_collision'; end if;
    insert into public.founder_work_item_evidence (work_item_id, evidence_id, evidence_role)
    values (v_id, v_evidence_id, coalesce(nullif(btrim(v_evidence ->> 'role'), ''), 'supporting'));
    v_evidence_id := null;
  end loop;

  insert into public.founder_work_item_events (work_item_id, event_type, actor_type, actor_key, payload)
  values (v_id, 'published', 'agent', v_agent.agent_key,
    jsonb_build_object('version', v_version, 'plan_fingerprint', v_fingerprint));

  perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
    'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
    'notification_id', 'founder-work-item:' || v_id::text || ':v' || v_version::text,
    'event', 'founder_work_item_ready',
    'severity', case
      when coalesce(nullif(btrim(p_item ->> 'risk_level'), ''), 'medium') = 'critical' then 'critical'
      when coalesce(nullif(btrim(p_item ->> 'risk_level'), ''), 'medium') = 'high' then 'high'
      when coalesce(nullif(btrim(p_item ->> 'risk_level'), ''), 'medium') = 'medium' then 'warning'
      else 'info' end,
    'created_at', now(),
    'host', v_agent.execution_platform,
    'unit', v_agent.agent_key,
    'commit_sha', nullif(btrim(p_item ->> 'source_commit_sha'), ''),
    'title', btrim(p_item ->> 'title'),
    'summary', btrim(p_item ->> 'summary'),
    'work_item_id', v_id,
    'work_item_key', v_work_key,
    'work_item_version', v_version,
    'plan_fingerprint', v_fingerprint
  ));

  return query select v_id, v_version, 'ready_for_review'::text, true;
end;
$$;

revoke all on function public.operations_publish_work_item_v1(jsonb) from public, anon, authenticated;
grant execute on function public.operations_publish_work_item_v1(jsonb) to service_role;

comment on function public.operations_publish_work_item_v1(jsonb) is
'Service-only immutable Founder Operations work-item publication using schema-qualified pgcrypto hashing.';

commit;
