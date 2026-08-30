begin;

create table if not exists public.founder_notification_viewer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_through_received_at timestamptz null,
  seen_through_event_id uuid null
    references public.operations_notification_events(id) on delete set null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_notification_viewer_state_cursor_pair_chk
    check (
      (seen_through_received_at is null and seen_through_event_id is null)
      or
      (seen_through_received_at is not null and seen_through_event_id is not null)
    )
);

comment on table public.founder_notification_viewer_state is
'Private per-founder cursor for the in-app operations notification history. It never changes the append-only source event ledger.';

drop trigger if exists trg_founder_notification_viewer_state_updated_at
  on public.founder_notification_viewer_state;
create trigger trg_founder_notification_viewer_state_updated_at
before update on public.founder_notification_viewer_state
for each row
execute function public.set_timestamp_updated_at();

alter table public.founder_notification_viewer_state enable row level security;

revoke all on table public.founder_notification_viewer_state
  from public, anon, authenticated;
grant all on table public.founder_notification_viewer_state to service_role;

drop policy if exists founder_notification_viewer_state_service_role_all
  on public.founder_notification_viewer_state;
create policy founder_notification_viewer_state_service_role_all
on public.founder_notification_viewer_state
for all
to service_role
using (true)
with check (true);

create or replace function public.current_user_has_founder_entitlement_v1()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_entitlements entitlements
    left join auth.users users
      on entitlements.user_id is null
     and entitlements.email is not null
     and lower(users.email) = lower(entitlements.email)
    where entitlements.is_active
      and entitlements.role = 'founder'
      and coalesce(entitlements.user_id, users.id) = auth.uid()
  );
$$;

comment on function public.current_user_has_founder_entitlement_v1() is
'Returns only whether the authenticated caller has an active founder entitlement. It exposes no entitlement or user rows.';

create or replace function public.founder_notification_items_v1(
  p_limit integer default 50,
  p_before_received_at timestamptz default null,
  p_before_event_id uuid default null,
  p_unread_only boolean default false
)
returns table (
  id uuid,
  notification_id text,
  event_type text,
  severity text,
  source_host text,
  source_unit text,
  source_commit_sha text,
  payload jsonb,
  recipient_count integer,
  received_at timestamptz,
  is_unread boolean
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
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;

  if (p_before_received_at is null) <> (p_before_event_id is null) then
    raise exception 'founder_notification_cursor_requires_pair';
  end if;

  return query
  with state as (
    select
      viewer.seen_through_received_at,
      viewer.seen_through_event_id
    from public.founder_notification_viewer_state viewer
    where viewer.user_id = v_uid
  )
  select
    events.id,
    events.notification_id,
    events.event_type,
    events.severity,
    events.source_host,
    events.source_unit,
    events.source_commit_sha,
    events.payload,
    events.recipient_count,
    events.received_at,
    (
      state.seen_through_received_at is null
      or events.received_at > state.seen_through_received_at
      or (
        events.received_at = state.seen_through_received_at
        and events.id > state.seen_through_event_id
      )
    ) as is_unread
  from public.operations_notification_events events
  left join state on true
  where (
    p_before_received_at is null
    or events.received_at < p_before_received_at
    or (
      events.received_at = p_before_received_at
      and events.id < p_before_event_id
    )
  )
  and (
    not coalesce(p_unread_only, false)
    or state.seen_through_received_at is null
    or events.received_at > state.seen_through_received_at
    or (
      events.received_at = state.seen_through_received_at
      and events.id > state.seen_through_event_id
    )
  )
  order by events.received_at desc, events.id desc
  limit v_limit;
end;
$$;

comment on function public.founder_notification_items_v1(integer, timestamptz, uuid, boolean) is
'Founder-entitlement-checked read model over the append-only operations notification ledger. No collector can read this history.';

create or replace function public.founder_notification_unread_count_v1()
returns table (
  unread_count integer,
  latest_received_at timestamptz,
  latest_event_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;

  return query
  with state as (
    select
      viewer.seen_through_received_at,
      viewer.seen_through_event_id
    from public.founder_notification_viewer_state viewer
    where viewer.user_id = v_uid
  ),
  latest as (
    select events.received_at, events.id
    from public.operations_notification_events events
    order by events.received_at desc, events.id desc
    limit 1
  ),
  unread as (
    select count(*)::integer as total
    from public.operations_notification_events events
    left join state on true
    where state.seen_through_received_at is null
       or events.received_at > state.seen_through_received_at
       or (
         events.received_at = state.seen_through_received_at
         and events.id > state.seen_through_event_id
       )
  )
  select
    least(coalesce(unread.total, 0), 500)::integer,
    latest.received_at,
    latest.id
  from unread
  left join latest on true;
end;
$$;

comment on function public.founder_notification_unread_count_v1() is
'Founder-only unread count and monotonic clear-through cursor for operations notifications.';

create or replace function public.founder_notification_mark_seen_v1(
  p_seen_through_received_at timestamptz default null,
  p_seen_through_event_id uuid default null
)
returns table (
  user_id uuid,
  seen_through_received_at timestamptz,
  seen_through_event_id uuid,
  last_opened_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.founder_notification_viewer_state%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.current_user_has_founder_entitlement_v1() then
    raise exception 'founder_access_required' using errcode = '42501';
  end if;

  if (p_seen_through_received_at is null) <> (p_seen_through_event_id is null) then
    raise exception 'founder_notification_seen_cursor_requires_pair';
  end if;

  select *
  into v_existing
  from public.founder_notification_viewer_state viewer
  where viewer.user_id = v_uid;

  if p_seen_through_received_at is not null
     and v_existing.user_id is not null
     and v_existing.seen_through_received_at is not null
     and (
       p_seen_through_received_at < v_existing.seen_through_received_at
       or (
         p_seen_through_received_at = v_existing.seen_through_received_at
         and p_seen_through_event_id < v_existing.seen_through_event_id
       )
     ) then
    raise exception 'founder_notification_seen_cursor_cannot_move_backwards';
  end if;

  insert into public.founder_notification_viewer_state (
    user_id,
    seen_through_received_at,
    seen_through_event_id,
    last_opened_at
  )
  values (
    v_uid,
    p_seen_through_received_at,
    p_seen_through_event_id,
    now()
  )
  on conflict on constraint founder_notification_viewer_state_pkey do update
  set
    seen_through_received_at = coalesce(
      excluded.seen_through_received_at,
      public.founder_notification_viewer_state.seen_through_received_at
    ),
    seen_through_event_id = coalesce(
      excluded.seen_through_event_id,
      public.founder_notification_viewer_state.seen_through_event_id
    ),
    last_opened_at = now();

  return query
  select
    viewer.user_id,
    viewer.seen_through_received_at,
    viewer.seen_through_event_id,
    viewer.last_opened_at
  from public.founder_notification_viewer_state viewer
  where viewer.user_id = v_uid;
end;
$$;

comment on function public.founder_notification_mark_seen_v1(timestamptz, uuid) is
'Founder-only monotonic seen cursor. Passing null records an inbox open without clearing alerts.';

revoke all on function public.current_user_has_founder_entitlement_v1()
  from public, anon;
grant execute on function public.current_user_has_founder_entitlement_v1()
  to authenticated, service_role;

revoke all on function public.founder_notification_items_v1(integer, timestamptz, uuid, boolean)
  from public, anon;
grant execute on function public.founder_notification_items_v1(integer, timestamptz, uuid, boolean)
  to authenticated, service_role;

revoke all on function public.founder_notification_unread_count_v1()
  from public, anon;
grant execute on function public.founder_notification_unread_count_v1()
  to authenticated, service_role;

revoke all on function public.founder_notification_mark_seen_v1(timestamptz, uuid)
  from public, anon;
grant execute on function public.founder_notification_mark_seen_v1(timestamptz, uuid)
  to authenticated, service_role;

commit;
