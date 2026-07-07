begin;

create or replace function public.notification_dispatcher_claim_batch_v1(
  p_limit integer default 25
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate_rows as (
    select o.id
    from public.notification_outbox o
    where o.sent_at is null
      and o.failed_at is null
      and o.folded_into_digest_at is null
      and o.available_at <= now()
      and o.next_attempt_at <= now()
      and (
        o.claimed_at is null
        or (
          o.claim_expires_at < now()
          and o.send_started_at is null
        )
      )
    order by o.available_at asc, o.created_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  )
  update public.notification_outbox o
  set
    claimed_at = now(),
    claim_expires_at = now() + interval '5 minutes',
    attempts = o.attempts + 1
  from candidate_rows c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.notification_dispatcher_claim_batch_v1(integer) from anon, authenticated;
grant execute on function public.notification_dispatcher_claim_batch_v1(integer) to service_role;

create or replace function public.notification_dispatcher_reserve_budget_v1(
  p_user_id uuid,
  p_budget_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push_count integer;
begin
  insert into public.notification_delivery_budgets as budgets (
    user_id,
    budget_date,
    push_count
  )
  values (
    p_user_id,
    p_budget_date,
    1
  )
  on conflict (user_id, budget_date)
  do update set
    push_count = budgets.push_count + 1,
    updated_at = now()
  where budgets.push_count < 3
  returning push_count into v_push_count;

  return v_push_count is not null;
end;
$$;

revoke all on function public.notification_dispatcher_reserve_budget_v1(uuid, date) from anon, authenticated;
grant execute on function public.notification_dispatcher_reserve_budget_v1(uuid, date) to service_role;

create or replace function public.notification_dispatcher_release_budget_v1(
  p_user_id uuid,
  p_budget_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_delivery_budgets
  set
    push_count = greatest(push_count - 1, 0),
    updated_at = now()
  where user_id = p_user_id
    and budget_date = p_budget_date
    and push_count > 0;
end;
$$;

revoke all on function public.notification_dispatcher_release_budget_v1(uuid, date) from anon, authenticated;
grant execute on function public.notification_dispatcher_release_budget_v1(uuid, date) to service_role;

create or replace function public.notification_dispatcher_defer_outbox_v1(
  p_outbox_id uuid,
  p_available_at timestamptz,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set
    available_at = greatest(p_available_at, now()),
    next_attempt_at = greatest(p_available_at, now()),
    claimed_at = null,
    claim_expires_at = null,
    send_started_at = null,
    failure_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_outbox_id
    and sent_at is null
    and failed_at is null
    and folded_into_digest_at is null;
end;
$$;

revoke all on function public.notification_dispatcher_defer_outbox_v1(uuid, timestamptz, text) from anon, authenticated;
grant execute on function public.notification_dispatcher_defer_outbox_v1(uuid, timestamptz, text) to service_role;

create or replace function public.notification_dispatcher_mark_send_started_v1(
  p_outbox_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set send_started_at = coalesce(send_started_at, now())
  where id = p_outbox_id
    and sent_at is null
    and failed_at is null
    and folded_into_digest_at is null;
end;
$$;

revoke all on function public.notification_dispatcher_mark_send_started_v1(uuid) from anon, authenticated;
grant execute on function public.notification_dispatcher_mark_send_started_v1(uuid) to service_role;

create or replace function public.notification_dispatcher_mark_sent_v1(
  p_outbox_id uuid,
  p_notification_id uuid,
  p_device_token_id uuid,
  p_title text,
  p_body text,
  p_deep_link text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    raise exception 'notification outbox row not found';
  end if;

  if v_outbox.sent_at is not null then
    return p_notification_id;
  end if;

  if v_outbox.failed_at is not null or v_outbox.folded_into_digest_at is not null then
    return p_notification_id;
  end if;

  update public.notification_outbox
  set
    sent_at = now(),
    failure_reason = null
  where id = p_outbox_id;

  insert into public.notifications_log (
    id,
    recipient_user_id,
    event_type,
    tier,
    card_print_id,
    actor_user_id,
    outbox_id,
    device_token_id,
    title,
    body,
    deep_link,
    send_status,
    sent_at
  ) values (
    p_notification_id,
    v_outbox.recipient_user_id,
    v_outbox.event_type,
    v_outbox.tier,
    v_outbox.card_print_id,
    v_outbox.actor_user_id,
    v_outbox.id,
    p_device_token_id,
    left(coalesce(nullif(btrim(p_title), ''), 'Grookai Vault'), 220),
    left(coalesce(nullif(btrim(p_body), ''), 'Open Grookai Vault'), 500),
    coalesce(nullif(btrim(p_deep_link), ''), 'grookai://'),
    'sent',
    now()
  )
  on conflict (id) do nothing;

  return p_notification_id;
end;
$$;

revoke all on function public.notification_dispatcher_mark_sent_v1(uuid, uuid, uuid, text, text, text) from anon, authenticated;
grant execute on function public.notification_dispatcher_mark_sent_v1(uuid, uuid, uuid, text, text, text) to service_role;

create or replace function public.notification_dispatcher_mark_folded_v1(
  p_outbox_id uuid,
  p_title text,
  p_body text,
  p_deep_link text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
  v_log_id uuid := gen_random_uuid();
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    raise exception 'notification outbox row not found';
  end if;

  if v_outbox.sent_at is not null or v_outbox.failed_at is not null or v_outbox.folded_into_digest_at is not null then
    return null;
  end if;

  update public.notification_outbox
  set
    folded_into_digest_at = now(),
    failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'folded'), 1000)
  where id = p_outbox_id;

  insert into public.notifications_log (
    id,
    recipient_user_id,
    event_type,
    tier,
    card_print_id,
    actor_user_id,
    outbox_id,
    title,
    body,
    deep_link,
    send_status,
    failure_reason
  ) values (
    v_log_id,
    v_outbox.recipient_user_id,
    v_outbox.event_type,
    v_outbox.tier,
    v_outbox.card_print_id,
    v_outbox.actor_user_id,
    v_outbox.id,
    left(coalesce(nullif(btrim(p_title), ''), 'Grookai Vault'), 220),
    left(coalesce(nullif(btrim(p_body), ''), 'Open Grookai Vault'), 500),
    coalesce(nullif(btrim(p_deep_link), ''), 'grookai://'),
    'folded',
    left(coalesce(nullif(btrim(p_reason), ''), 'folded'), 1000)
  )
  on conflict do nothing;

  return v_log_id;
end;
$$;

revoke all on function public.notification_dispatcher_mark_folded_v1(uuid, text, text, text, text) from anon, authenticated;
grant execute on function public.notification_dispatcher_mark_folded_v1(uuid, text, text, text, text) to service_role;

create or replace function public.notification_dispatcher_mark_skipped_v1(
  p_outbox_id uuid,
  p_title text,
  p_body text,
  p_deep_link text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
  v_log_id uuid := gen_random_uuid();
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    raise exception 'notification outbox row not found';
  end if;

  if v_outbox.sent_at is not null or v_outbox.failed_at is not null or v_outbox.folded_into_digest_at is not null then
    return null;
  end if;

  update public.notification_outbox
  set
    failed_at = now(),
    failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'skipped'), 1000)
  where id = p_outbox_id;

  insert into public.notifications_log (
    id,
    recipient_user_id,
    event_type,
    tier,
    card_print_id,
    actor_user_id,
    outbox_id,
    title,
    body,
    deep_link,
    send_status,
    failure_reason
  ) values (
    v_log_id,
    v_outbox.recipient_user_id,
    v_outbox.event_type,
    v_outbox.tier,
    v_outbox.card_print_id,
    v_outbox.actor_user_id,
    v_outbox.id,
    left(coalesce(nullif(btrim(p_title), ''), 'Grookai Vault'), 220),
    left(coalesce(nullif(btrim(p_body), ''), 'Open Grookai Vault'), 500),
    coalesce(nullif(btrim(p_deep_link), ''), 'grookai://'),
    'skipped',
    left(coalesce(nullif(btrim(p_reason), ''), 'skipped'), 1000)
  )
  on conflict do nothing;

  return v_log_id;
end;
$$;

revoke all on function public.notification_dispatcher_mark_skipped_v1(uuid, text, text, text, text) from anon, authenticated;
grant execute on function public.notification_dispatcher_mark_skipped_v1(uuid, text, text, text, text) to service_role;

create or replace function public.notification_dispatcher_mark_retry_or_failed_v1(
  p_outbox_id uuid,
  p_reason text,
  p_next_attempt_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
  v_status text;
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
  for update;

  if not found then
    raise exception 'notification outbox row not found';
  end if;

  if v_outbox.sent_at is not null or v_outbox.failed_at is not null or v_outbox.folded_into_digest_at is not null then
    return 'terminal';
  end if;

  if v_outbox.attempts >= 3 then
    update public.notification_outbox
    set
      failed_at = now(),
      failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'send_failed'), 1000),
      claimed_at = null,
      claim_expires_at = null
    where id = p_outbox_id;

    insert into public.notifications_log (
      recipient_user_id,
      event_type,
      tier,
      card_print_id,
      actor_user_id,
      outbox_id,
      title,
      body,
      deep_link,
      send_status,
      failure_reason
    ) values (
      v_outbox.recipient_user_id,
      v_outbox.event_type,
      v_outbox.tier,
      v_outbox.card_print_id,
      v_outbox.actor_user_id,
      v_outbox.id,
      'Grookai Vault',
      'Notification delivery failed.',
      'grookai://',
      'failed',
      left(coalesce(nullif(btrim(p_reason), ''), 'send_failed'), 1000)
    );

    v_status := 'failed';
  else
    update public.notification_outbox
    set
      next_attempt_at = greatest(p_next_attempt_at, now() + interval '15 seconds'),
      claimed_at = null,
      claim_expires_at = null,
      send_started_at = null,
      failure_reason = left(coalesce(nullif(btrim(p_reason), ''), 'send_retry'), 1000)
    where id = p_outbox_id;

    v_status := 'retry';
  end if;

  return v_status;
end;
$$;

revoke all on function public.notification_dispatcher_mark_retry_or_failed_v1(uuid, text, timestamptz) from anon, authenticated;
grant execute on function public.notification_dispatcher_mark_retry_or_failed_v1(uuid, text, timestamptz) to service_role;

create or replace function public.notification_dispatcher_disable_token_v1(
  p_device_token_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.device_tokens
  set
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where id = p_device_token_id;
end;
$$;

revoke all on function public.notification_dispatcher_disable_token_v1(uuid, text) from anon, authenticated;
grant execute on function public.notification_dispatcher_disable_token_v1(uuid, text) to service_role;

create or replace function public.notification_dispatcher_log_validation_failure_v1(
  p_outbox_id uuid,
  p_reason text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox public.notification_outbox%rowtype;
begin
  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id;

  insert into public.notification_emit_failures (
    source,
    source_id,
    recipient_user_id,
    event_type,
    error_message,
    payload
  ) values (
    'notification_dispatcher',
    p_outbox_id,
    v_outbox.recipient_user_id,
    v_outbox.event_type,
    left(coalesce(nullif(btrim(p_reason), ''), 'validation_failed'), 1000),
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.notification_dispatcher_log_validation_failure_v1(uuid, text, jsonb) from anon, authenticated;
grant execute on function public.notification_dispatcher_log_validation_failure_v1(uuid, text, jsonb) to service_role;

commit;
