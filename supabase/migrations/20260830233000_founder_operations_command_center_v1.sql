begin;

create table public.operations_agents (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null unique,
  display_name text not null,
  domain text not null,
  owner_label text not null default 'Grookai Operations',
  description text not null default '',
  execution_platform text not null,
  source_locator text not null,
  schedule_kind text not null default 'event',
  schedule_expression text null,
  heartbeat_interval_seconds integer not null default 3600,
  stale_after_seconds integer not null default 10800,
  allowed_work_item_types text[] not null default '{}',
  allowed_command_actions text[] not null default '{}',
  contract_version text not null default 'OPERATIONS_AGENT_PROTOCOL_V1',
  executor_version text null,
  escalation_policy jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  is_paused boolean not null default false,
  paused_reason text null,
  last_heartbeat_at timestamptz null,
  last_success_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_agents_key_chk
    check (agent_key ~ '^[a-z0-9][a-z0-9_.-]{2,127}$'),
  constraint operations_agents_required_text_chk
    check (
      btrim(display_name) <> '' and btrim(domain) <> ''
      and btrim(execution_platform) <> '' and btrim(source_locator) <> ''
    ),
  constraint operations_agents_schedule_kind_chk
    check (schedule_kind in ('cron', 'timer', 'event', 'manual', 'continuous')),
  constraint operations_agents_heartbeat_chk
    check (
      heartbeat_interval_seconds between 30 and 604800
      and stale_after_seconds >= heartbeat_interval_seconds
    ),
  constraint operations_agents_escalation_object_chk
    check (jsonb_typeof(escalation_policy) = 'object')
);

create table public.operations_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.operations_agents(id),
  run_key text not null,
  status text not null,
  source_commit_sha text null,
  source_run_uri text null,
  progress jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_agent_runs_unique unique (agent_id, run_key),
  constraint operations_agent_runs_key_chk check (btrim(run_key) <> ''),
  constraint operations_agent_runs_status_chk
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  constraint operations_agent_runs_json_chk
    check (jsonb_typeof(progress) = 'object' and jsonb_typeof(summary) = 'object')
);

create table public.operations_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_key text not null unique,
  agent_id uuid null references public.operations_agents(id),
  incident_type text not null,
  severity text not null,
  status text not null default 'open',
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  occurrence_count integer not null default 1,
  opened_at timestamptz not null default now(),
  latest_at timestamptz not null default now(),
  recovered_at timestamptz null,
  resolved_at timestamptz null,
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_incidents_key_chk check (btrim(incident_key) <> ''),
  constraint operations_incidents_severity_chk
    check (severity in ('critical', 'high', 'warning', 'info')),
  constraint operations_incidents_status_chk
    check (status in ('open', 'acknowledged', 'recovered', 'resolved')),
  constraint operations_incidents_evidence_chk check (jsonb_typeof(evidence) = 'object'),
  constraint operations_incidents_count_chk check (occurrence_count > 0)
);

create table public.operations_incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.operations_incidents(id),
  event_type text not null,
  actor_type text not null,
  actor_key text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint operations_incident_events_type_chk check (btrim(event_type) <> ''),
  constraint operations_incident_events_actor_chk
    check (actor_type in ('agent', 'founder', 'executor', 'system')),
  constraint operations_incident_events_payload_chk
    check (jsonb_typeof(payload) = 'object')
);

create table public.operations_evidence_objects (
  id uuid primary key default gen_random_uuid(),
  evidence_key text not null unique,
  sha256 text not null,
  media_type text not null,
  byte_size bigint null,
  source_uri text null,
  durable_uri text null,
  retention_class text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint operations_evidence_key_chk check (btrim(evidence_key) <> ''),
  constraint operations_evidence_sha_chk check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint operations_evidence_media_chk check (btrim(media_type) <> ''),
  constraint operations_evidence_size_chk check (byte_size is null or byte_size >= 0),
  constraint operations_evidence_retention_chk
    check (retention_class in ('workflow_90_day', 'operational_1_year', 'permanent_audit')),
  constraint operations_evidence_metadata_chk check (jsonb_typeof(metadata) = 'object')
);

create table public.founder_work_items (
  id uuid primary key default gen_random_uuid(),
  work_item_key text not null,
  version integer not null,
  state text not null default 'ready_for_review',
  state_reason text null,
  work_item_type text not null,
  action_type text not null,
  agent_id uuid not null references public.operations_agents(id),
  source_run_id uuid null references public.operations_agent_runs(id),
  supersedes_work_item_id uuid null references public.founder_work_items(id),
  title text not null,
  summary text not null,
  domain text not null,
  risk_level text not null,
  scope jsonb not null,
  exclusions jsonb not null,
  plan_payload jsonb not null,
  payload_sha256 text not null,
  plan_fingerprint text not null,
  source_commit_sha text null,
  contract_version text not null,
  executor_version text null,
  requires_recent_auth boolean not null default false,
  command_policy jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  deferred_until timestamptz null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_work_items_key_version_unique unique (work_item_key, version),
  constraint founder_work_items_key_chk check (btrim(work_item_key) <> ''),
  constraint founder_work_items_version_chk check (version > 0),
  constraint founder_work_items_state_chk check (
    state in (
      'ready_for_review', 'deferred', 'approved', 'rejected',
      'repair_requested', 'queued', 'running', 'succeeded', 'failed',
      'cancelled', 'superseded', 'expired'
    )
  ),
  constraint founder_work_items_required_text_chk check (
    btrim(work_item_type) <> '' and btrim(action_type) <> ''
    and btrim(title) <> '' and btrim(summary) <> '' and btrim(domain) <> ''
  ),
  constraint founder_work_items_risk_chk
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint founder_work_items_json_chk check (
    jsonb_typeof(scope) = 'object'
    and jsonb_typeof(exclusions) in ('object', 'array')
    and jsonb_typeof(plan_payload) = 'object'
    and jsonb_typeof(command_policy) = 'object'
  ),
  constraint founder_work_items_hashes_chk check (
    payload_sha256 ~ '^[a-f0-9]{64}$'
    and plan_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint founder_work_items_expiry_chk check (expires_at > created_at)
);

create table public.founder_work_item_evidence (
  work_item_id uuid not null references public.founder_work_items(id),
  evidence_id uuid not null references public.operations_evidence_objects(id),
  evidence_role text not null,
  created_at timestamptz not null default now(),
  primary key (work_item_id, evidence_id),
  constraint founder_work_item_evidence_role_chk check (btrim(evidence_role) <> '')
);

create table public.founder_work_item_events (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.founder_work_items(id),
  event_type text not null,
  actor_type text not null,
  actor_key text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint founder_work_item_events_type_chk check (btrim(event_type) <> ''),
  constraint founder_work_item_events_actor_chk
    check (actor_type in ('agent', 'founder', 'executor', 'system')),
  constraint founder_work_item_events_payload_chk check (jsonb_typeof(payload) = 'object')
);

create table public.founder_decisions (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.founder_work_items(id),
  actor_user_id uuid not null references auth.users(id),
  decision text not null,
  note text null,
  expected_version integer not null,
  expected_fingerprint text not null,
  client_schema_version text not null,
  idempotency_key text not null,
  defer_until timestamptz null,
  created_at timestamptz not null default now(),
  constraint founder_decisions_actor_idempotency_unique
    unique (actor_user_id, idempotency_key),
  constraint founder_decisions_type_chk check (
    decision in (
      'acknowledge', 'add_note', 'defer', 'approve', 'reject', 'request_repair',
      'retry', 'pause_agent', 'resume_agent'
    )
  ),
  constraint founder_decisions_fingerprint_chk
    check (expected_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint founder_decisions_idempotency_chk
    check (char_length(btrim(idempotency_key)) between 8 and 128),
  constraint founder_decisions_client_schema_chk
    check (btrim(client_schema_version) <> '')
);

create table public.operations_commands (
  id uuid primary key default gen_random_uuid(),
  command_key text not null unique,
  work_item_id uuid not null references public.founder_work_items(id),
  decision_id uuid not null references public.founder_decisions(id),
  agent_id uuid not null references public.operations_agents(id),
  action_type text not null,
  status text not null default 'queued',
  frozen_scope jsonb not null,
  plan_fingerprint text not null,
  executor_version text not null,
  cost_ceiling_usd numeric(12, 4) null,
  execution_deadline_at timestamptz not null,
  lease_token uuid null,
  leased_by text null,
  lease_expires_at timestamptz null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  started_at timestamptz null,
  finished_at timestamptz null,
  result_summary jsonb null,
  error_summary jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_commands_work_item_action_unique
    unique (work_item_id, action_type),
  constraint operations_commands_status_chk check (
    status in ('queued', 'leased', 'running', 'succeeded', 'failed', 'cancelled', 'expired')
  ),
  constraint operations_commands_scope_chk check (jsonb_typeof(frozen_scope) = 'object'),
  constraint operations_commands_fingerprint_chk
    check (plan_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint operations_commands_attempt_chk check (attempt_count >= 0),
  constraint operations_commands_max_attempts_chk check (max_attempts between 1 and 10),
  constraint operations_commands_cost_chk
    check (cost_ceiling_usd is null or cost_ceiling_usd >= 0),
  constraint operations_commands_deadline_chk check (execution_deadline_at > created_at),
  constraint operations_commands_result_chk check (
    (result_summary is null or jsonb_typeof(result_summary) = 'object')
    and (error_summary is null or jsonb_typeof(error_summary) = 'object')
  )
);

create table public.operations_command_attempts (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references public.operations_commands(id),
  attempt_number integer not null,
  lease_token uuid not null,
  executor_key text not null,
  status text not null,
  preflight jsonb null,
  reconciliation jsonb null,
  error_summary jsonb null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_command_attempts_number_unique
    unique (command_id, attempt_number),
  constraint operations_command_attempts_status_chk
    check (status in ('leased', 'running', 'succeeded', 'failed', 'cancelled', 'expired')),
  constraint operations_command_attempts_number_chk check (attempt_number > 0),
  constraint operations_command_attempts_json_chk check (
    (preflight is null or jsonb_typeof(preflight) = 'object')
    and (reconciliation is null or jsonb_typeof(reconciliation) = 'object')
    and (error_summary is null or jsonb_typeof(error_summary) = 'object')
  )
);

create table public.operations_command_events (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references public.operations_commands(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint operations_command_events_type_chk check (btrim(event_type) <> ''),
  constraint operations_command_events_payload_chk check (jsonb_typeof(payload) = 'object')
);

create table public.operations_control_state (
  singleton boolean primary key default true check (singleton),
  execution_paused boolean not null default false,
  pause_reason text null,
  updated_by uuid null references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.operations_control_state (singleton)
values (true)
on conflict (singleton) do nothing;

create table public.founder_work_item_viewer_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_item_id uuid not null references public.founder_work_items(id),
  acknowledged_at timestamptz null,
  snoozed_until timestamptz null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_item_id)
);

create table public.founder_agent_control_decisions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.operations_agents(id),
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  note text not null,
  client_schema_version text not null,
  idempotency_key text not null,
  previous_paused boolean not null,
  resulting_paused boolean not null,
  created_at timestamptz not null default now(),
  constraint founder_agent_control_actor_idempotency_unique
    unique (actor_user_id, idempotency_key),
  constraint founder_agent_control_action_chk
    check (action in ('pause_agent', 'resume_agent')),
  constraint founder_agent_control_note_chk
    check (char_length(btrim(note)) between 3 and 2000),
  constraint founder_agent_control_client_schema_chk
    check (btrim(client_schema_version) <> ''),
  constraint founder_agent_control_result_chk check (
    (action = 'pause_agent' and resulting_paused)
    or (action = 'resume_agent' and not resulting_paused)
  )
);

create index operations_agent_runs_status_idx
  on public.operations_agent_runs (status, heartbeat_at desc);
create index operations_incidents_status_idx
  on public.operations_incidents (status, severity, latest_at desc);
create index operations_incident_events_timeline_idx
  on public.operations_incident_events (incident_id, created_at, id);
create index founder_work_items_queue_idx
  on public.founder_work_items (state, created_at desc);
create index founder_work_items_agent_idx
  on public.founder_work_items (agent_id, created_at desc);
create index founder_work_item_events_timeline_idx
  on public.founder_work_item_events (work_item_id, created_at, id);
create index founder_decisions_timeline_idx
  on public.founder_decisions (work_item_id, created_at, id);
create index operations_commands_queue_idx
  on public.operations_commands (status, created_at)
  where status in ('queued', 'leased', 'running');
create index operations_command_events_timeline_idx
  on public.operations_command_events (command_id, created_at, id);
create index founder_agent_control_timeline_idx
  on public.founder_agent_control_decisions (agent_id, created_at desc, id);

create or replace function public.prevent_operations_append_only_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger trg_operations_evidence_objects_append_only
before update or delete on public.operations_evidence_objects
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_operations_incident_events_append_only
before update or delete on public.operations_incident_events
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_founder_work_item_evidence_append_only
before update or delete on public.founder_work_item_evidence
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_founder_work_item_events_append_only
before update or delete on public.founder_work_item_events
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_founder_decisions_append_only
before update or delete on public.founder_decisions
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_operations_command_events_append_only
before update or delete on public.operations_command_events
for each row execute function public.prevent_operations_append_only_mutation_v1();

create trigger trg_founder_agent_control_decisions_append_only
before update or delete on public.founder_agent_control_decisions
for each row execute function public.prevent_operations_append_only_mutation_v1();

create or replace function public.protect_founder_work_item_frozen_fields_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (to_jsonb(new) - array[
      'state', 'state_reason', 'deferred_until', 'decided_at', 'updated_at'
    ]) is distinct from (to_jsonb(old) - array[
      'state', 'state_reason', 'deferred_until', 'decided_at', 'updated_at'
    ]) then
    raise exception 'founder_work_item_frozen_fields_are_immutable';
  end if;
  return new;
end;
$$;

create trigger trg_founder_work_items_protect_frozen_fields
before update on public.founder_work_items
for each row execute function public.protect_founder_work_item_frozen_fields_v1();

create or replace function public.protect_operations_command_frozen_fields_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (to_jsonb(new) - array[
      'status', 'lease_token', 'leased_by', 'lease_expires_at',
      'attempt_count', 'started_at', 'finished_at', 'result_summary',
      'error_summary', 'updated_at'
    ]) is distinct from (to_jsonb(old) - array[
      'status', 'lease_token', 'leased_by', 'lease_expires_at',
      'attempt_count', 'started_at', 'finished_at', 'result_summary',
      'error_summary', 'updated_at'
    ]) then
    raise exception 'operations_command_frozen_fields_are_immutable';
  end if;
  return new;
end;
$$;

create trigger trg_operations_commands_protect_frozen_fields
before update on public.operations_commands
for each row execute function public.protect_operations_command_frozen_fields_v1();

create trigger trg_operations_agents_updated_at
before update on public.operations_agents
for each row execute function public.set_timestamp_updated_at();
create trigger trg_operations_agent_runs_updated_at
before update on public.operations_agent_runs
for each row execute function public.set_timestamp_updated_at();
create trigger trg_operations_incidents_updated_at
before update on public.operations_incidents
for each row execute function public.set_timestamp_updated_at();
create trigger trg_founder_work_items_updated_at
before update on public.founder_work_items
for each row execute function public.set_timestamp_updated_at();
create trigger trg_operations_commands_updated_at
before update on public.operations_commands
for each row execute function public.set_timestamp_updated_at();
create trigger trg_operations_command_attempts_updated_at
before update on public.operations_command_attempts
for each row execute function public.set_timestamp_updated_at();
create trigger trg_founder_work_item_viewer_state_updated_at
before update on public.founder_work_item_viewer_state
for each row execute function public.set_timestamp_updated_at();

alter table public.operations_agents enable row level security;
alter table public.operations_agent_runs enable row level security;
alter table public.operations_incidents enable row level security;
alter table public.operations_incident_events enable row level security;
alter table public.operations_evidence_objects enable row level security;
alter table public.founder_work_items enable row level security;
alter table public.founder_work_item_evidence enable row level security;
alter table public.founder_work_item_events enable row level security;
alter table public.founder_decisions enable row level security;
alter table public.operations_commands enable row level security;
alter table public.operations_command_attempts enable row level security;
alter table public.operations_command_events enable row level security;
alter table public.operations_control_state enable row level security;
alter table public.founder_work_item_viewer_state enable row level security;
alter table public.founder_agent_control_decisions enable row level security;

revoke all on table public.operations_agents from public, anon, authenticated;
revoke all on table public.operations_agent_runs from public, anon, authenticated;
revoke all on table public.operations_incidents from public, anon, authenticated;
revoke all on table public.operations_incident_events from public, anon, authenticated;
revoke all on table public.operations_evidence_objects from public, anon, authenticated;
revoke all on table public.founder_work_items from public, anon, authenticated;
revoke all on table public.founder_work_item_evidence from public, anon, authenticated;
revoke all on table public.founder_work_item_events from public, anon, authenticated;
revoke all on table public.founder_decisions from public, anon, authenticated;
revoke all on table public.operations_commands from public, anon, authenticated;
revoke all on table public.operations_command_attempts from public, anon, authenticated;
revoke all on table public.operations_command_events from public, anon, authenticated;
revoke all on table public.operations_control_state from public, anon, authenticated;
revoke all on table public.founder_work_item_viewer_state from public, anon, authenticated;
revoke all on table public.founder_agent_control_decisions from public, anon, authenticated;

grant all on table public.operations_agents to service_role;
grant all on table public.operations_agent_runs to service_role;
grant all on table public.operations_incidents to service_role;
grant all on table public.operations_incident_events to service_role;
grant all on table public.operations_evidence_objects to service_role;
grant all on table public.founder_work_items to service_role;
grant all on table public.founder_work_item_evidence to service_role;
grant all on table public.founder_work_item_events to service_role;
grant all on table public.founder_decisions to service_role;
grant all on table public.operations_commands to service_role;
grant all on table public.operations_command_attempts to service_role;
grant all on table public.operations_command_events to service_role;
grant all on table public.operations_control_state to service_role;
grant all on table public.founder_work_item_viewer_state to service_role;
grant all on table public.founder_agent_control_decisions to service_role;

create policy operations_agents_service_role_all on public.operations_agents
for all to service_role using (true) with check (true);
create policy operations_agent_runs_service_role_all on public.operations_agent_runs
for all to service_role using (true) with check (true);
create policy operations_incidents_service_role_all on public.operations_incidents
for all to service_role using (true) with check (true);
create policy operations_incident_events_service_role_all on public.operations_incident_events
for all to service_role using (true) with check (true);
create policy operations_evidence_objects_service_role_all on public.operations_evidence_objects
for all to service_role using (true) with check (true);
create policy founder_work_items_service_role_all on public.founder_work_items
for all to service_role using (true) with check (true);
create policy founder_work_item_evidence_service_role_all on public.founder_work_item_evidence
for all to service_role using (true) with check (true);
create policy founder_work_item_events_service_role_all on public.founder_work_item_events
for all to service_role using (true) with check (true);
create policy founder_decisions_service_role_all on public.founder_decisions
for all to service_role using (true) with check (true);
create policy operations_commands_service_role_all on public.operations_commands
for all to service_role using (true) with check (true);
create policy operations_command_attempts_service_role_all on public.operations_command_attempts
for all to service_role using (true) with check (true);
create policy operations_command_events_service_role_all on public.operations_command_events
for all to service_role using (true) with check (true);
create policy operations_control_state_service_role_all on public.operations_control_state
for all to service_role using (true) with check (true);
create policy founder_work_item_viewer_state_service_role_all
on public.founder_work_item_viewer_state
for all to service_role using (true) with check (true);
create policy founder_agent_control_decisions_service_role_all
on public.founder_agent_control_decisions
for all to service_role using (true) with check (true);

create or replace function public.operations_require_service_role_v1()
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.operations_try_enqueue_notification_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_receipt jsonb;
begin
  select to_jsonb(result) into v_receipt
  from public.enqueue_operations_notification_v1(p_payload) result;
  return jsonb_build_object('queued', true, 'receipt', coalesce(v_receipt, '{}'::jsonb));
exception when others then
  return jsonb_build_object(
    'queued', false,
    'sqlstate', sqlstate,
    'failure_class', 'operations_notification_enqueue_failed'
  );
end;
$$;

create or replace function public.operations_register_agent_v1(p_agent jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_work_types text[];
  v_actions text[];
begin
  perform public.operations_require_service_role_v1();
  if p_agent is null or jsonb_typeof(p_agent) <> 'object' then
    raise exception 'operations_agent_payload_must_be_object';
  end if;
  select coalesce(array_agg(value), '{}'::text[])
    into v_work_types
    from jsonb_array_elements_text(coalesce(p_agent -> 'allowed_work_item_types', '[]'::jsonb));
  select coalesce(array_agg(value), '{}'::text[])
    into v_actions
    from jsonb_array_elements_text(coalesce(p_agent -> 'allowed_command_actions', '[]'::jsonb));

  insert into public.operations_agents (
    agent_key, display_name, domain, owner_label, description,
    execution_platform, source_locator, schedule_kind, schedule_expression,
    heartbeat_interval_seconds, stale_after_seconds, allowed_work_item_types,
    allowed_command_actions, contract_version, executor_version,
    escalation_policy, is_enabled
  ) values (
    btrim(p_agent ->> 'agent_key'), btrim(p_agent ->> 'display_name'),
    btrim(p_agent ->> 'domain'), coalesce(nullif(btrim(p_agent ->> 'owner_label'), ''), 'Grookai Operations'),
    coalesce(p_agent ->> 'description', ''), btrim(p_agent ->> 'execution_platform'),
    btrim(p_agent ->> 'source_locator'), coalesce(nullif(btrim(p_agent ->> 'schedule_kind'), ''), 'event'),
    nullif(btrim(p_agent ->> 'schedule_expression'), ''),
    coalesce((p_agent ->> 'heartbeat_interval_seconds')::integer, 3600),
    coalesce((p_agent ->> 'stale_after_seconds')::integer, 10800),
    v_work_types, v_actions,
    coalesce(nullif(btrim(p_agent ->> 'contract_version'), ''), 'OPERATIONS_AGENT_PROTOCOL_V1'),
    nullif(btrim(p_agent ->> 'executor_version'), ''),
    coalesce(p_agent -> 'escalation_policy', '{}'::jsonb), true
  )
  on conflict (agent_key) do update set
    display_name = excluded.display_name,
    domain = excluded.domain,
    owner_label = excluded.owner_label,
    description = excluded.description,
    execution_platform = excluded.execution_platform,
    source_locator = excluded.source_locator,
    schedule_kind = excluded.schedule_kind,
    schedule_expression = excluded.schedule_expression,
    heartbeat_interval_seconds = excluded.heartbeat_interval_seconds,
    stale_after_seconds = excluded.stale_after_seconds,
    allowed_work_item_types = excluded.allowed_work_item_types,
    allowed_command_actions = excluded.allowed_command_actions,
    contract_version = excluded.contract_version,
    executor_version = excluded.executor_version,
    escalation_policy = excluded.escalation_policy
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.operations_publish_incident_v1(p_incident jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agent public.operations_agents%rowtype;
  v_incident public.operations_incidents%rowtype;
  v_key text := btrim(p_incident ->> 'incident_key');
  v_type text := btrim(p_incident ->> 'incident_type');
  v_severity text := btrim(p_incident ->> 'severity');
  v_event_type text;
begin
  perform public.operations_require_service_role_v1();
  if p_incident is null or jsonb_typeof(p_incident) <> 'object' then
    raise exception 'operations_incident_payload_must_be_object';
  end if;
  if v_key = '' or v_type = '' or btrim(p_incident ->> 'title') = ''
      or btrim(p_incident ->> 'summary') = '' then
    raise exception 'operations_incident_required_field_missing';
  end if;
  if v_severity not in ('critical', 'high', 'warning', 'info') then
    raise exception 'operations_incident_severity_not_supported';
  end if;
  if jsonb_typeof(coalesce(p_incident -> 'evidence', '{}'::jsonb)) <> 'object' then
    raise exception 'operations_incident_evidence_must_be_object';
  end if;

  select * into v_agent from public.operations_agents
   where agent_key = btrim(p_incident ->> 'agent_key') and is_enabled
   for update;
  if not found then raise exception 'registered_enabled_agent_required'; end if;

  select * into v_incident from public.operations_incidents
   where incident_key = v_key for update;
  if found then
    v_event_type := case
      when v_incident.status in ('recovered', 'resolved') then 'reopened'
      else 'observed_again' end;
    update public.operations_incidents set
      agent_id = v_agent.id,
      incident_type = v_type,
      severity = v_severity,
      status = 'open',
      title = btrim(p_incident ->> 'title'),
      summary = btrim(p_incident ->> 'summary'),
      evidence = coalesce(p_incident -> 'evidence', '{}'::jsonb),
      occurrence_count = occurrence_count + case
        when status in ('recovered', 'resolved') then 1 else 0 end,
      latest_at = now(), recovered_at = null, resolved_at = null,
      resolution_note = null
    where id = v_incident.id returning * into v_incident;
  else
    insert into public.operations_incidents (
      incident_key, agent_id, incident_type, severity, title, summary, evidence
    ) values (
      v_key, v_agent.id, v_type, v_severity,
      btrim(p_incident ->> 'title'), btrim(p_incident ->> 'summary'),
      coalesce(p_incident -> 'evidence', '{}'::jsonb)
    ) returning * into v_incident;
    v_event_type := 'opened';
  end if;

  insert into public.operations_incident_events (
    incident_id, event_type, actor_type, actor_key, payload
  ) values (
    v_incident.id, v_event_type, 'agent', v_agent.agent_key,
    jsonb_build_object(
      'severity', v_incident.severity,
      'occurrence_count', v_incident.occurrence_count,
      'evidence', v_incident.evidence
    )
  );
  perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
    'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
    'notification_id', 'operations-incident:' || v_incident.id::text ||
      ':occurrence-' || v_incident.occurrence_count::text || ':' || v_event_type,
    'event', 'operations_incident_' || v_event_type,
    'severity', v_incident.severity,
    'created_at', now(),
    'host', v_agent.execution_platform,
    'unit', v_agent.agent_key,
    'incident_id', v_incident.id,
    'title', v_incident.title,
    'summary', v_incident.summary
  ));
  return to_jsonb(v_incident);
end;
$$;

create or replace function public.operations_recover_incident_v1(
  p_incident_key text,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_incident public.operations_incidents%rowtype;
  v_agent public.operations_agents%rowtype;
begin
  perform public.operations_require_service_role_v1();
  select * into v_incident from public.operations_incidents
   where incident_key = btrim(p_incident_key) for update;
  if not found then raise exception 'operations_incident_not_found'; end if;
  if v_incident.status in ('recovered', 'resolved') then
    return to_jsonb(v_incident);
  end if;
  select * into v_agent from public.operations_agents where id = v_incident.agent_id;
  update public.operations_incidents set
    status = 'recovered', recovered_at = now(), latest_at = now(),
    resolution_note = nullif(btrim(p_resolution_note), '')
  where id = v_incident.id returning * into v_incident;
  insert into public.operations_incident_events (
    incident_id, event_type, actor_type, actor_key, payload
  ) values (
    v_incident.id, 'recovered', 'agent', coalesce(v_agent.agent_key, 'system'),
    jsonb_build_object('resolution_note', v_incident.resolution_note)
  );
  perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
    'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
    'notification_id', 'operations-incident:' || v_incident.id::text ||
      ':recovered-' || v_incident.occurrence_count::text,
    'event', 'operations_incident_recovered',
    'severity', 'info',
    'created_at', now(),
    'host', coalesce(v_agent.execution_platform, 'operations-control-plane'),
    'unit', coalesce(v_agent.agent_key, 'incident-monitor'),
    'incident_id', v_incident.id,
    'title', v_incident.title || ' recovered',
    'summary', coalesce(v_incident.resolution_note, 'The operational signal recovered.')
  ));
  return to_jsonb(v_incident);
end;
$$;

create or replace function public.operations_agent_heartbeat_v1(p_heartbeat jsonb)
returns table (agent_id uuid, run_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_agent public.operations_agents%rowtype;
  v_run_id uuid;
  v_status text := coalesce(nullif(btrim(p_heartbeat ->> 'status'), ''), 'running');
  v_run_key text := nullif(btrim(p_heartbeat ->> 'run_key'), '');
begin
  perform public.operations_require_service_role_v1();
  select * into v_agent from public.operations_agents
   where agent_key = btrim(p_heartbeat ->> 'agent_key') and is_enabled
   for update;
  if not found then raise exception 'registered_enabled_agent_required'; end if;
  if v_status not in ('queued', 'running', 'succeeded', 'failed', 'cancelled') then
    raise exception 'invalid_agent_run_status';
  end if;
  update public.operations_agents set
    last_heartbeat_at = now(),
    last_success_at = case when v_status = 'succeeded' then now() else last_success_at end
  where id = v_agent.id;

  if exists (
    select 1 from public.operations_incidents
     where incident_key = 'agent-stale:' || v_agent.agent_key
       and status in ('open', 'acknowledged')
  ) then
    perform public.operations_recover_incident_v1(
      'agent-stale:' || v_agent.agent_key,
      'Agent heartbeat resumed.'
    );
  end if;

  if v_run_key is not null then
    insert into public.operations_agent_runs (
      agent_id, run_key, status, source_commit_sha, source_run_uri,
      progress, summary, heartbeat_at, finished_at
    ) values (
      v_agent.id, v_run_key, v_status,
      nullif(btrim(p_heartbeat ->> 'source_commit_sha'), ''),
      nullif(btrim(p_heartbeat ->> 'source_run_uri'), ''),
      coalesce(p_heartbeat -> 'progress', '{}'::jsonb),
      coalesce(p_heartbeat -> 'summary', '{}'::jsonb), now(),
      case when v_status in ('succeeded', 'failed', 'cancelled') then now() else null end
    )
    on conflict on constraint operations_agent_runs_unique do update set
      status = excluded.status,
      source_commit_sha = coalesce(excluded.source_commit_sha, public.operations_agent_runs.source_commit_sha),
      source_run_uri = coalesce(excluded.source_run_uri, public.operations_agent_runs.source_run_uri),
      progress = excluded.progress,
      summary = excluded.summary,
      heartbeat_at = now(),
      finished_at = excluded.finished_at
    returning id into v_run_id;
  end if;
  return query select v_agent.id, v_run_id;
end;
$$;

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
  v_payload_sha := encode(digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');

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
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  return query
  select
    count(*) filter (where state in ('ready_for_review', 'deferred'))::integer,
    count(*) filter (where state in ('queued', 'running'))::integer,
    count(*) filter (where state in ('failed', 'repair_requested'))::integer,
    count(*) filter (where state in ('approved', 'succeeded', 'rejected', 'cancelled', 'superseded', 'expired'))::integer,
    (select count(*)::integer from public.operations_agents a
      where a.is_enabled and not a.is_paused
        and (a.last_heartbeat_at is null or a.last_heartbeat_at < now() - make_interval(secs => a.stale_after_seconds)))
  from public.founder_work_items;
end;
$$;

create or replace function public.founder_operations_work_items_v1(
  p_queue text default 'needs_action',
  p_limit integer default 50
)
returns table (
  id uuid, work_item_key text, version integer, state text, state_reason text,
  work_item_type text, action_type text, title text, summary text, domain text,
  risk_level text, scope jsonb, exclusions jsonb, plan_payload jsonb,
  plan_fingerprint text, source_commit_sha text, contract_version text,
  executor_version text, requires_recent_auth boolean, command_policy jsonb,
  expires_at timestamptz, deferred_until timestamptz, created_at timestamptz,
  updated_at timestamptz, agent_key text, agent_name text, command_id uuid,
  command_status text, acknowledged_at timestamptz, snoozed_until timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  if coalesce(p_queue, 'needs_action') not in ('needs_action', 'running', 'failed', 'completed', 'all') then
    raise exception 'invalid_founder_operations_queue';
  end if;
  return query
  select w.id, w.work_item_key, w.version, w.state, w.state_reason,
    w.work_item_type, w.action_type, w.title, w.summary, w.domain,
    w.risk_level, w.scope, w.exclusions, w.plan_payload,
    w.plan_fingerprint, w.source_commit_sha, w.contract_version,
    w.executor_version, w.requires_recent_auth, w.command_policy,
    w.expires_at, w.deferred_until, w.created_at, w.updated_at,
    a.agent_key, a.display_name, c.id, c.status,
    viewer.acknowledged_at, viewer.snoozed_until
  from public.founder_work_items w
  join public.operations_agents a on a.id = w.agent_id
  left join public.operations_commands c on c.work_item_id = w.id
  left join public.founder_work_item_viewer_state viewer
    on viewer.work_item_id = w.id and viewer.user_id = v_uid
  where case coalesce(p_queue, 'needs_action')
    when 'needs_action' then w.state in ('ready_for_review', 'deferred')
      and (w.deferred_until is null or w.deferred_until <= now())
      and (viewer.snoozed_until is null or viewer.snoozed_until <= now())
    when 'running' then w.state in ('queued', 'running')
    when 'failed' then w.state in ('failed', 'repair_requested')
    when 'completed' then w.state in ('approved', 'succeeded', 'rejected', 'cancelled', 'superseded', 'expired')
    else true end
  order by
    case w.risk_level when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
    w.created_at desc
  limit v_limit;
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
      from public.operations_commands c where c.work_item_id = w.id limit 1)
  ) into v_result
  from public.founder_work_items w
  join public.operations_agents a on a.id = w.agent_id
  where w.id = p_work_item_id;
  if v_result is null then raise exception 'founder_work_item_not_found'; end if;
  return v_result;
end;
$$;

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
      when a.last_heartbeat_at is null then 'unknown'
      when a.last_heartbeat_at < now() - make_interval(secs => a.stale_after_seconds) then 'stale'
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

create or replace function public.founder_operations_control_agent_v1(
  p_agent_key text,
  p_action text,
  p_note text,
  p_idempotency_key text,
  p_client_schema_version text
)
returns table (
  agent_key text, is_paused boolean, control_decision_id uuid, duplicate boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_agent public.operations_agents%rowtype;
  v_existing public.founder_agent_control_decisions%rowtype;
  v_decision_id uuid;
  v_target_paused boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;
  if p_client_schema_version <> 'FOUNDER_OPERATIONS_MOBILE_V1' then
    raise exception 'unsupported_founder_operations_client';
  end if;
  if p_action not in ('pause_agent', 'resume_agent') then
    raise exception 'unsupported_agent_control_action';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'agent_control_reason_required';
  end if;

  select * into v_existing from public.founder_agent_control_decisions
   where actor_user_id = v_uid and idempotency_key = btrim(p_idempotency_key);
  if found then
    select * into v_agent from public.operations_agents where id = v_existing.agent_id;
    if v_agent.agent_key <> btrim(p_agent_key) or v_existing.action <> p_action then
      raise exception 'agent_control_idempotency_conflict';
    end if;
    return query select v_agent.agent_key, v_agent.is_paused, v_existing.id, true;
    return;
  end if;

  select * into v_agent from public.operations_agents
   where operations_agents.agent_key = btrim(p_agent_key) and is_enabled for update;
  if not found then raise exception 'registered_enabled_agent_required'; end if;
  if coalesce((v_agent.escalation_policy ->> 'founder_pause_allowed')::boolean, false) is not true then
    raise exception 'agent_control_not_allowed_by_policy';
  end if;
  v_target_paused := p_action = 'pause_agent';

  update public.operations_agents set
    is_paused = v_target_paused,
    paused_reason = case when v_target_paused then btrim(p_note) else null end
  where id = v_agent.id;
  insert into public.founder_agent_control_decisions (
    agent_id, actor_user_id, action, note, client_schema_version,
    idempotency_key, previous_paused, resulting_paused
  ) values (
    v_agent.id, v_uid, p_action, btrim(p_note), p_client_schema_version,
    btrim(p_idempotency_key), v_agent.is_paused, v_target_paused
  ) returning id into v_decision_id;

  perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
    'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
    'notification_id', 'operations-agent-control:' || v_decision_id::text,
    'event', 'operations_agent_' || case when v_target_paused then 'paused' else 'resumed' end,
    'severity', case when v_target_paused then 'warning' else 'info' end,
    'created_at', now(),
    'host', v_agent.execution_platform,
    'unit', v_agent.agent_key,
    'title', v_agent.display_name || case when v_target_paused then ' paused' else ' resumed' end,
    'summary', btrim(p_note)
  ));
  return query select v_agent.agent_key, v_target_paused, v_decision_id, false;
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
  if p_decision = 'defer' and (p_defer_until is null or p_defer_until <= now()) then
    raise exception 'future_defer_until_required';
  end if;
  if p_decision = 'add_note' and char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'founder_note_required';
  end if;
  if p_decision = 'approve' and v_item.state not in ('ready_for_review', 'deferred') then
    raise exception 'founder_work_item_not_approvable';
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
    on conflict (user_id, work_item_id) do update set
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
    on conflict (user_id, work_item_id) do update set
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
    select * into v_failed_command from public.operations_commands
     where work_item_id = v_item.id and status = 'failed' for update;
    if not found then raise exception 'failed_command_required_for_retry'; end if;
    if v_failed_command.attempt_count >= v_failed_command.max_attempts then
      raise exception 'command_retry_limit_reached';
    end if;
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

create or replace function public.operations_claim_command_v1(
  p_executor_key text,
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
  if p_lease_seconds not between 30 and 1800 then raise exception 'invalid_lease_seconds'; end if;
  if exists (select 1 from public.operations_control_state where execution_paused) then
    return null;
  end if;
  select c.* into v_command
  from public.operations_commands c
  join public.operations_agents a on a.id = c.agent_id
  where c.status = 'queued' and c.execution_deadline_at > now()
    and a.is_enabled and not a.is_paused
    and c.action_type = any(a.allowed_command_actions)
  order by c.created_at
  for update of c skip locked limit 1;
  if not found then return null; end if;

  update public.operations_commands set
    status = 'leased', lease_token = v_lease, leased_by = btrim(p_executor_key),
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
    'executor_key', btrim(p_executor_key), 'attempt_number', v_command.attempt_count
  ));
  update public.founder_work_items set state = 'running', state_reason = 'command_leased'
   where id = v_command.work_item_id;
  return to_jsonb(v_command);
end;
$$;

create or replace function public.operations_complete_command_v1(
  p_command_id uuid,
  p_lease_token uuid,
  p_status text,
  p_preflight jsonb,
  p_reconciliation jsonb,
  p_error_summary jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_command public.operations_commands%rowtype;
  v_success boolean := p_status = 'succeeded';
begin
  perform public.operations_require_service_role_v1();
  if p_status not in ('succeeded', 'failed') then raise exception 'invalid_command_completion_status'; end if;
  if p_preflight is null or jsonb_typeof(p_preflight) <> 'object' then
    raise exception 'command_preflight_object_required';
  end if;
  if p_reconciliation is null or jsonb_typeof(p_reconciliation) <> 'object' then
    raise exception 'command_reconciliation_object_required';
  end if;
  if v_success and coalesce((p_reconciliation ->> 'reconciled')::boolean, false) is not true then
    raise exception 'successful_command_requires_reconciliation';
  end if;
  select * into v_command from public.operations_commands
   where id = p_command_id for update;
  if not found then raise exception 'operations_command_not_found'; end if;
  if v_command.status not in ('leased', 'running')
      or v_command.lease_token is distinct from p_lease_token
      or v_command.lease_expires_at <= now() then
    raise exception 'operations_command_lease_invalid';
  end if;
  if coalesce(p_preflight ->> 'plan_fingerprint', '') <> v_command.plan_fingerprint
      or coalesce((p_preflight ->> 'passed')::boolean, false) is not true then
    raise exception 'command_preflight_does_not_match_frozen_plan';
  end if;

  update public.operations_command_attempts set
    status = p_status, preflight = p_preflight,
    reconciliation = p_reconciliation, error_summary = p_error_summary,
    finished_at = now()
  where command_id = p_command_id and lease_token = p_lease_token;
  update public.operations_commands set
    status = p_status, finished_at = now(),
    result_summary = case when v_success then p_reconciliation else null end,
    error_summary = case when v_success then null else coalesce(p_error_summary, '{}'::jsonb) end,
    lease_expires_at = null
  where id = p_command_id returning * into v_command;
  update public.founder_work_items set
    state = p_status,
    state_reason = case when v_success then 'command_reconciled' else 'command_failed' end
  where id = v_command.work_item_id;
  insert into public.operations_command_events (command_id, event_type, payload)
  values (p_command_id, p_status, jsonb_build_object(
    'preflight', p_preflight, 'reconciliation', p_reconciliation,
    'error_summary', p_error_summary
  ));
  insert into public.founder_work_item_events (
    work_item_id, event_type, actor_type, actor_key, payload
  ) values (
    v_command.work_item_id, 'command_' || p_status, 'executor', v_command.leased_by,
    jsonb_build_object('command_id', p_command_id, 'reconciled',
      coalesce((p_reconciliation ->> 'reconciled')::boolean, false))
  );
  perform public.operations_try_enqueue_notification_v1(jsonb_build_object(
    'notification_version', 'FOUNDER_OPERATIONS_COMMAND_CENTER_V1',
    'notification_id', 'founder-command:' || p_command_id::text || ':' || p_status ||
      ':attempt-' || v_command.attempt_count::text,
    'event', 'founder_command_' || p_status,
    'severity', case when v_success then 'info' else 'high' end,
    'created_at', now(),
    'host', 'operations-command-executor',
    'unit', coalesce(v_command.leased_by, 'unknown-executor'),
    'work_item_id', v_command.work_item_id,
    'command_id', p_command_id,
    'title', case when v_success then 'Founder operation completed' else 'Founder operation failed' end,
    'summary', case when v_success
      then 'The bounded command completed and reconciled successfully.'
      else 'The bounded command failed. Open Founder Operations for evidence.' end
  ));
  return to_jsonb(v_command) - 'lease_token';
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
      and (a.is_paused or (a.last_heartbeat_at is not null
        and a.last_heartbeat_at >= now() - make_interval(secs => a.stale_after_seconds)))
  loop
    perform public.operations_recover_incident_v1(
      v_incident.incident_key,
      'Agent heartbeat is current or the agent was intentionally paused.'
    );
    v_stale_recovered := v_stale_recovered + 1;
  end loop;

  return jsonb_build_object(
    'maintenance_version', 'OPERATIONS_MAINTENANCE_V1',
    'checked_at', now(),
    'expired_work_items', v_expired_work_items,
    'expired_commands', v_expired_commands,
    'expired_leases', v_expired_leases,
    'stale_incidents_opened', v_stale_opened,
    'stale_incidents_recovered', v_stale_recovered
  );
end;
$$;

revoke all on function public.operations_require_service_role_v1() from public, anon, authenticated;
revoke all on function public.operations_try_enqueue_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.operations_register_agent_v1(jsonb) from public, anon, authenticated;
revoke all on function public.operations_publish_incident_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.operations_recover_incident_v1(text, text)
  from public, anon, authenticated;
revoke all on function public.operations_agent_heartbeat_v1(jsonb) from public, anon, authenticated;
revoke all on function public.operations_publish_work_item_v1(jsonb) from public, anon, authenticated;
revoke all on function public.operations_claim_command_v1(text, integer) from public, anon, authenticated;
revoke all on function public.operations_complete_command_v1(uuid, uuid, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.operations_run_maintenance_v1()
  from public, anon, authenticated;

grant execute on function public.operations_require_service_role_v1() to service_role;
grant execute on function public.operations_try_enqueue_notification_v1(jsonb) to service_role;
grant execute on function public.operations_register_agent_v1(jsonb) to service_role;
grant execute on function public.operations_publish_incident_v1(jsonb) to service_role;
grant execute on function public.operations_recover_incident_v1(text, text) to service_role;
grant execute on function public.operations_agent_heartbeat_v1(jsonb) to service_role;
grant execute on function public.operations_publish_work_item_v1(jsonb) to service_role;
grant execute on function public.operations_claim_command_v1(text, integer) to service_role;
grant execute on function public.operations_complete_command_v1(uuid, uuid, text, jsonb, jsonb, jsonb)
  to service_role;
grant execute on function public.operations_run_maintenance_v1() to service_role;

revoke all on function public.founder_operations_counts_v1() from public, anon;
revoke all on function public.founder_operations_work_items_v1(text, integer) from public, anon;
revoke all on function public.founder_operations_work_item_v1(uuid) from public, anon;
revoke all on function public.founder_operations_agent_health_v1() from public, anon;
revoke all on function public.founder_operations_control_agent_v1(text, text, text, text, text)
  from public, anon;
revoke all on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) from public, anon;

grant execute on function public.founder_operations_counts_v1() to authenticated, service_role;
grant execute on function public.founder_operations_work_items_v1(text, integer)
  to authenticated, service_role;
grant execute on function public.founder_operations_work_item_v1(uuid)
  to authenticated, service_role;
grant execute on function public.founder_operations_agent_health_v1()
  to authenticated, service_role;
grant execute on function public.founder_operations_control_agent_v1(text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) to authenticated, service_role;

comment on table public.founder_work_items is
'Private frozen founder review proposals. Canonical mutation remains behind service-only commands and executors.';
comment on table public.operations_commands is
'Private allowlisted asynchronous commands derived from exact founder decisions. App clients have no table access.';
comment on function public.founder_operations_decide_v1(
  uuid, integer, text, text, text, text, text, timestamptz
) is
'Founder-only decision boundary. It accepts no SQL, shell arguments, executor payload, or mutable plan data.';

commit;
