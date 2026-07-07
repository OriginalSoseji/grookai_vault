begin;

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null,
  app_build text null,
  device_label text null,
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_tokens_token_nonempty_check check (btrim(token) <> ''),
  constraint device_tokens_platform_check check (platform = any (array['android'::text, 'ios'::text]))
);

comment on table public.device_tokens is
'E2 push notification device tokens. A token belongs to one user globally and is reassigned on registration through the app registration flow.';

create unique index if not exists device_tokens_token_unique_idx
  on public.device_tokens (token);

create index if not exists device_tokens_user_active_seen_idx
  on public.device_tokens (user_id, disabled_at, last_seen_at desc);

drop trigger if exists trg_device_tokens_updated_at on public.device_tokens;
create trigger trg_device_tokens_updated_at
before update on public.device_tokens
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  instant_enabled boolean not null default true,
  daily_pulse_enabled boolean not null default true,
  weekly_enabled boolean not null default true,
  quiet_hours_start time null,
  quiet_hours_end time null,
  timezone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_prefs_timezone_nonempty_check
    check (timezone is null or btrim(timezone) <> '')
);

comment on table public.notification_prefs is
'E2 owner-only notification tier preferences. Missing rows are interpreted by the dispatcher as all defaults enabled.';

drop trigger if exists trg_notification_prefs_updated_at on public.notification_prefs;
create trigger trg_notification_prefs_updated_at
before update on public.notification_prefs
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  tier text not null,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  card_event_id uuid null references public.card_events(id) on delete set null,
  card_interaction_id uuid null references public.card_interactions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz null,
  claim_expires_at timestamptz null,
  send_started_at timestamptz null,
  sent_at timestamptz null,
  folded_into_digest_at timestamptz null,
  failed_at timestamptz null,
  failure_reason text null,
  created_at timestamptz not null default now(),
  constraint notification_outbox_event_type_nonempty_check check (btrim(event_type) <> ''),
  constraint notification_outbox_tier_check check (tier = any (array['instant'::text, 'daily_pulse'::text, 'weekly'::text])),
  constraint notification_outbox_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint notification_outbox_dedupe_key_nonempty_check check (btrim(dedupe_key) <> ''),
  constraint notification_outbox_attempts_nonnegative_check check (attempts >= 0),
  constraint notification_outbox_terminal_state_check check (
    num_nonnulls(sent_at, folded_into_digest_at, failed_at) <= 1
  )
);

comment on table public.notification_outbox is
'E2 durable push dispatcher queue. Service-role dispatcher drains rows; clients never send pushes directly.';

create unique index if not exists notification_outbox_recipient_dedupe_unique_idx
  on public.notification_outbox (recipient_user_id, dedupe_key);

create index if not exists notification_outbox_pending_drain_idx
  on public.notification_outbox (available_at, next_attempt_at)
  where sent_at is null
    and failed_at is null
    and folded_into_digest_at is null;

create index if not exists notification_outbox_recipient_created_idx
  on public.notification_outbox (recipient_user_id, created_at desc);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  tier text not null,
  card_print_id uuid null references public.card_prints(id) on delete set null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  outbox_id uuid null references public.notification_outbox(id) on delete set null,
  device_token_id uuid null references public.device_tokens(id) on delete set null,
  title text not null,
  body text not null,
  deep_link text not null,
  send_status text not null,
  failure_reason text null,
  sent_at timestamptz null,
  tapped_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint notifications_log_event_type_nonempty_check check (btrim(event_type) <> ''),
  constraint notifications_log_tier_check check (tier = any (array['instant'::text, 'daily_pulse'::text, 'weekly'::text])),
  constraint notifications_log_title_nonempty_check check (btrim(title) <> ''),
  constraint notifications_log_body_nonempty_check check (btrim(body) <> ''),
  constraint notifications_log_deep_link_nonempty_check check (btrim(deep_link) <> ''),
  constraint notifications_log_send_status_check check (send_status = any (array['sent'::text, 'folded'::text, 'failed'::text, 'skipped'::text]))
);

comment on table public.notifications_log is
'E2 push send, fold, skip, fail, and tap audit. Recipients can read their own log; service role writes.';

create unique index if not exists notifications_log_terminal_outbox_unique_idx
  on public.notifications_log (outbox_id)
  where outbox_id is not null
    and send_status = any (array['sent'::text, 'folded'::text, 'skipped'::text]);

create index if not exists notifications_log_recipient_sent_idx
  on public.notifications_log (recipient_user_id, sent_at desc);

create index if not exists notifications_log_recipient_created_idx
  on public.notifications_log (recipient_user_id, created_at desc);

create table if not exists public.notification_delivery_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_date date not null,
  push_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, budget_date),
  constraint notification_delivery_budgets_push_count_check check (push_count >= 0 and push_count <= 3)
);

comment on table public.notification_delivery_budgets is
'E2 per-user per-budget-day push cap. Dispatcher reserves budget atomically before sending.';

drop trigger if exists trg_notification_delivery_budgets_updated_at on public.notification_delivery_budgets;
create trigger trg_notification_delivery_budgets_updated_at
before update on public.notification_delivery_budgets
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.notification_emit_failures (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id uuid null,
  recipient_user_id uuid null references auth.users(id) on delete set null,
  event_type text null,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notification_emit_failures_source_nonempty_check check (btrim(source) <> ''),
  constraint notification_emit_failures_error_nonempty_check check (btrim(error_message) <> ''),
  constraint notification_emit_failures_payload_object_check check (jsonb_typeof(payload) = 'object')
);

comment on table public.notification_emit_failures is
'E2 durable failure log for notification enqueue and dispatcher validation failures.';

create index if not exists notification_emit_failures_source_created_idx
  on public.notification_emit_failures (source, created_at desc);

create index if not exists notification_emit_failures_recipient_created_idx
  on public.notification_emit_failures (recipient_user_id, created_at desc);

alter table public.device_tokens enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.notifications_log enable row level security;
alter table public.notification_delivery_budgets enable row level security;
alter table public.notification_emit_failures enable row level security;

revoke all on table public.device_tokens from anon;
revoke all on table public.device_tokens from authenticated;
revoke all on table public.notification_prefs from anon;
revoke all on table public.notification_prefs from authenticated;
revoke all on table public.notification_outbox from anon;
revoke all on table public.notification_outbox from authenticated;
revoke all on table public.notifications_log from anon;
revoke all on table public.notifications_log from authenticated;
revoke all on table public.notification_delivery_budgets from anon;
revoke all on table public.notification_delivery_budgets from authenticated;
revoke all on table public.notification_emit_failures from anon;
revoke all on table public.notification_emit_failures from authenticated;

grant select, insert, update on table public.device_tokens to authenticated;
grant select, insert, update on table public.notification_prefs to authenticated;
grant select on table public.notifications_log to authenticated;
grant select on table public.notification_delivery_budgets to authenticated;

grant all on table public.device_tokens to service_role;
grant all on table public.notification_prefs to service_role;
grant all on table public.notification_outbox to service_role;
grant all on table public.notifications_log to service_role;
grant all on table public.notification_delivery_budgets to service_role;
grant all on table public.notification_emit_failures to service_role;

drop policy if exists device_tokens_select_owner on public.device_tokens;
create policy device_tokens_select_owner
on public.device_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists device_tokens_insert_owner on public.device_tokens;
create policy device_tokens_insert_owner
on public.device_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists device_tokens_update_owner on public.device_tokens;
create policy device_tokens_update_owner
on public.device_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notification_prefs_select_owner on public.notification_prefs;
create policy notification_prefs_select_owner
on public.notification_prefs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists notification_prefs_insert_owner on public.notification_prefs;
create policy notification_prefs_insert_owner
on public.notification_prefs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists notification_prefs_update_owner on public.notification_prefs;
create policy notification_prefs_update_owner
on public.notification_prefs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists notifications_log_select_recipient on public.notifications_log;
create policy notifications_log_select_recipient
on public.notifications_log
for select
to authenticated
using (auth.uid() = recipient_user_id);

drop policy if exists notification_delivery_budgets_select_owner on public.notification_delivery_budgets;
create policy notification_delivery_budgets_select_owner
on public.notification_delivery_budgets
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.prevent_notification_outbox_client_writes_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'notification_outbox is dispatcher-owned';
end;
$$;

drop trigger if exists trg_notification_outbox_no_authenticated_insert on public.notification_outbox;
create trigger trg_notification_outbox_no_authenticated_insert
before insert on public.notification_outbox
for each row
when (current_user = 'authenticated')
execute function public.prevent_notification_outbox_client_writes_v1();

create or replace function public.prevent_notifications_log_client_writes_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'notifications_log is dispatcher-owned';
end;
$$;

drop trigger if exists trg_notifications_log_no_authenticated_mutation on public.notifications_log;
create trigger trg_notifications_log_no_authenticated_mutation
before insert or update or delete on public.notifications_log
for each row
when (current_user = 'authenticated')
execute function public.prevent_notifications_log_client_writes_v1();

create or replace function public.notification_log_emit_failure_v1(
  p_source text,
  p_source_id uuid,
  p_recipient_user_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_emit_failures (
    source,
    source_id,
    recipient_user_id,
    event_type,
    error_message,
    payload
  ) values (
    coalesce(nullif(btrim(p_source), ''), 'notification_emit'),
    p_source_id,
    p_recipient_user_id,
    nullif(btrim(coalesce(p_event_type, '')), ''),
    left(coalesce(nullif(btrim(p_error_message), ''), 'unknown_error'), 1000),
    coalesce(p_payload, '{}'::jsonb)
  );
exception
  when others then
    null;
end;
$$;

create or replace function public.enqueue_card_interaction_notification_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_preview text;
begin
  v_preview := left(regexp_replace(btrim(new.message), '\s+', ' ', 'g'), 280);
  v_payload := jsonb_build_object(
    'card_interaction_id', new.id,
    'vault_item_id', new.vault_item_id,
    'card_print_id', new.card_print_id,
    'sender_user_id', new.sender_user_id,
    'receiver_user_id', new.receiver_user_id,
    'message_preview', v_preview
  );

  insert into public.notification_outbox (
    recipient_user_id,
    event_type,
    tier,
    card_print_id,
    actor_user_id,
    card_interaction_id,
    payload,
    dedupe_key
  ) values (
    new.receiver_user_id,
    'message_received',
    'instant',
    new.card_print_id,
    new.sender_user_id,
    new.id,
    v_payload,
    'message_received:' || new.id::text
  )
  on conflict (recipient_user_id, dedupe_key) do nothing;

  return new;
exception
  when others then
    perform public.notification_log_emit_failure_v1(
      'card_interactions',
      new.id,
      new.receiver_user_id,
      'message_received',
      coalesce(v_payload, jsonb_build_object(
        'card_interaction_id', new.id,
        'card_print_id', new.card_print_id,
        'sender_user_id', new.sender_user_id,
        'receiver_user_id', new.receiver_user_id
      )),
      sqlerrm
    );
    return new;
end;
$$;

drop trigger if exists trg_enqueue_card_interaction_notification_v1 on public.card_interactions;
create trigger trg_enqueue_card_interaction_notification_v1
after insert on public.card_interactions
for each row
execute function public.enqueue_card_interaction_notification_v1();

commit;
