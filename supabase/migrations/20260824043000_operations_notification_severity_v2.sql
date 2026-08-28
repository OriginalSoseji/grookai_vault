-- Expand the private operations-alert channel beyond systemd-critical events.
-- This migration does not change recipients, grants, RLS, delivery tiers, or
-- any collector-facing notification behavior.

alter table public.operations_notification_events
  drop constraint if exists operations_notification_events_severity_chk;

alter table public.operations_notification_events
  add constraint operations_notification_events_severity_chk
  check (severity in ('critical', 'high', 'warning', 'info'))
  not valid;

alter table public.operations_notification_events
  validate constraint operations_notification_events_severity_chk;

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

  if v_severity not in ('critical', 'high', 'warning', 'info') then
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

comment on constraint operations_notification_events_severity_chk
  on public.operations_notification_events is
'Private operations severity vocabulary: critical=SEV-1, high=SEV-2, warning=SEV-3, info=successful or forecast notice.';
