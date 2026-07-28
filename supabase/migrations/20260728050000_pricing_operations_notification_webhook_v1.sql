begin;

alter table public.notification_outbox
  alter column card_print_id drop not null;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_card_anchor_v2;

alter table public.notification_outbox
  add constraint notification_outbox_card_anchor_v2
  check (
    (
      event_type = 'operations_alert'
      and card_print_id is null
    )
    or (
      event_type <> 'operations_alert'
      and card_print_id is not null
    )
  )
  not valid;

alter table public.notification_outbox
  validate constraint notification_outbox_card_anchor_v2;

create table if not exists public.operations_notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null unique,
  event_type text not null,
  severity text not null,
  source_host text not null,
  source_unit text not null,
  source_commit_sha text null,
  payload jsonb not null,
  recipient_count integer not null,
  received_at timestamptz not null default now(),
  constraint operations_notification_events_notification_id_nonempty_chk
    check (btrim(notification_id) <> ''),
  constraint operations_notification_events_event_type_nonempty_chk
    check (btrim(event_type) <> ''),
  constraint operations_notification_events_severity_chk
    check (severity in ('critical')),
  constraint operations_notification_events_source_host_nonempty_chk
    check (btrim(source_host) <> ''),
  constraint operations_notification_events_source_unit_nonempty_chk
    check (btrim(source_unit) <> ''),
  constraint operations_notification_events_payload_object_chk
    check (jsonb_typeof(payload) = 'object'),
  constraint operations_notification_events_recipient_count_chk
    check (recipient_count > 0)
);

comment on table public.operations_notification_events is
'Append-only receipt ledger for authenticated production operations webhooks. Payloads and delivery rows remain service-role-only.';

create or replace function public.prevent_operations_notification_event_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'operations_notification_events is append-only';
end;
$$;

drop trigger if exists trg_operations_notification_events_append_only
  on public.operations_notification_events;
create trigger trg_operations_notification_events_append_only
before update or delete on public.operations_notification_events
for each row
execute function public.prevent_operations_notification_event_mutation_v1();

alter table public.operations_notification_events enable row level security;

revoke all on table public.operations_notification_events
  from public, anon, authenticated;
grant all on table public.operations_notification_events to service_role;

drop policy if exists operations_notification_events_service_role_all
  on public.operations_notification_events;
create policy operations_notification_events_service_role_all
on public.operations_notification_events
for all
to service_role
using (true)
with check (true);

create or replace function public.enqueue_operations_notification_v1(
  p_payload jsonb
)
returns table (
  notification_event_id uuid,
  notification_id text,
  recipient_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_event_id uuid;
  v_notification_id text;
  v_event_type text;
  v_severity text;
  v_source_host text;
  v_source_unit text;
  v_source_commit_sha text;
  v_recipient_count integer;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'operations_notification_payload_must_be_object';
  end if;

  v_notification_id := nullif(btrim(p_payload ->> 'notification_id'), '');
  v_event_type := nullif(btrim(p_payload ->> 'event'), '');
  v_severity := nullif(btrim(p_payload ->> 'severity'), '');
  v_source_host := nullif(btrim(p_payload ->> 'host'), '');
  v_source_unit := nullif(btrim(p_payload ->> 'unit'), '');
  v_source_commit_sha := nullif(btrim(p_payload ->> 'commit_sha'), '');

  if v_notification_id is null
    or v_event_type is null
    or v_severity is null
    or v_source_host is null
    or v_source_unit is null then
    raise exception 'operations_notification_payload_missing_required_field';
  end if;

  if v_severity <> 'critical' then
    raise exception 'operations_notification_severity_not_supported';
  end if;

  with recipients as (
    select distinct coalesce(entitlements.user_id, users.id) as user_id
    from public.user_entitlements entitlements
    left join auth.users users
      on entitlements.user_id is null
     and entitlements.email is not null
     and lower(users.email) = lower(entitlements.email)
    where entitlements.is_active
      and entitlements.role = 'founder'
      and coalesce(entitlements.user_id, users.id) is not null
  )
  select count(*)::integer
  into v_recipient_count
  from recipients;

  if v_recipient_count < 1 then
    raise exception 'operations_notification_has_no_founder_recipient';
  end if;

  insert into public.operations_notification_events (
    notification_id,
    event_type,
    severity,
    source_host,
    source_unit,
    source_commit_sha,
    payload,
    recipient_count
  )
  values (
    v_notification_id,
    v_event_type,
    v_severity,
    v_source_host,
    v_source_unit,
    v_source_commit_sha,
    p_payload,
    v_recipient_count
  )
  on conflict on constraint operations_notification_events_notification_id_key
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select events.id
    into v_event_id
    from public.operations_notification_events events
    where events.notification_id = v_notification_id;
  end if;

  insert into public.notification_outbox (
    recipient_user_id,
    event_type,
    tier,
    card_print_id,
    actor_user_id,
    payload,
    dedupe_key
  )
  select
    recipients.user_id,
    'operations_alert',
    'instant',
    null,
    null,
    p_payload,
    'operations-alert:' || v_notification_id
  from (
    select distinct coalesce(entitlements.user_id, users.id) as user_id
    from public.user_entitlements entitlements
    left join auth.users users
      on entitlements.user_id is null
     and entitlements.email is not null
     and lower(users.email) = lower(entitlements.email)
    where entitlements.is_active
      and entitlements.role = 'founder'
      and coalesce(entitlements.user_id, users.id) is not null
  ) recipients
  on conflict (recipient_user_id, dedupe_key) do nothing;

  return query
  select
    v_event_id,
    v_notification_id,
    v_recipient_count;
end;
$$;

revoke all on function public.enqueue_operations_notification_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_operations_notification_v1(jsonb)
  to service_role;

create or replace function public.notification_dispatcher_claim_operations_alert_v1(
  p_notification_id text
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(p_notification_id), '') is null then
    raise exception 'operations_notification_id_required';
  end if;

  return query
  with candidate_rows as (
    select outbox.id
    from public.notification_outbox outbox
    where outbox.event_type = 'operations_alert'
      and outbox.payload ->> 'notification_id' = p_notification_id
      and outbox.sent_at is null
      and outbox.failed_at is null
      and outbox.folded_into_digest_at is null
      and outbox.available_at <= now()
      and outbox.next_attempt_at <= now()
      and (
        outbox.claimed_at is null
        or (
          outbox.claim_expires_at < now()
          and outbox.send_started_at is null
        )
      )
    order by outbox.created_at asc
    for update skip locked
  )
  update public.notification_outbox outbox
  set
    claimed_at = now(),
    claim_expires_at = now() + interval '5 minutes',
    attempts = outbox.attempts + 1
  from candidate_rows candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

revoke all on function public.notification_dispatcher_claim_operations_alert_v1(text)
  from public, anon, authenticated;
grant execute on function public.notification_dispatcher_claim_operations_alert_v1(text)
  to service_role;

commit;
