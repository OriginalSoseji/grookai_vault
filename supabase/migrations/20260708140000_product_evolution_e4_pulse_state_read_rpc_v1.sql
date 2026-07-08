begin;

create table if not exists public.pulse_viewer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_through_created_at timestamptz null,
  seen_through_event_id uuid null references public.card_events(id) on delete set null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pulse_viewer_state_seen_cursor_pair_check
    check (
      (seen_through_created_at is null and seen_through_event_id is null)
      or (seen_through_created_at is not null and seen_through_event_id is not null)
    )
);

comment on table public.pulse_viewer_state is
'Per-viewer clear-through cursor for E4 Pulse. Opening Pulse clears through the latest eligible event captured at open time.';

create index if not exists pulse_viewer_state_updated_idx
  on public.pulse_viewer_state (updated_at desc);

drop trigger if exists trg_pulse_viewer_state_updated_at on public.pulse_viewer_state;
create trigger trg_pulse_viewer_state_updated_at
before update on public.pulse_viewer_state
for each row
execute function public.set_timestamp_updated_at();

create or replace function public.pulse_jsonb_uuid_v1(
  p_value text
)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_value::uuid
    else null::uuid
  end;
$$;

comment on function public.pulse_jsonb_uuid_v1(text) is
'E4 helper for safely reading UUID values out of card_events payload JSON.';

create or replace function public.pulse_eligible_events_for_viewer_v1(
  p_viewer_user_id uuid
)
returns table (
  card_event_id uuid,
  event_type text,
  rank_bucket text,
  bucket_rank integer,
  created_at timestamptz,
  actor_user_id uuid,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  subject_user_id uuid,
  subject_slug text,
  subject_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  display_image_url text,
  display_image_kind text,
  ownership_context text,
  distance_bucket text,
  locality_label text,
  value_delta_amount numeric,
  value_delta_percent numeric,
  completion_subject_type text,
  completion_subject_label text,
  completion_threshold numeric,
  primary_action text,
  primary_action_label text,
  primary_action_route text,
  payload jsonb,
  visibility text,
  watch_subject_type text,
  watch_subject_id uuid,
  watch_strength double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with matched as (
    select
      e.id as card_event_id,
      e.event_type,
      case
        when e.event_type = 'want_match_available' then 'want_match'
        when e.event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed']) then 'value_move'
        when e.event_type = any (array['set_completion_crossed', 'dex_completion_crossed']) then 'completion'
        when w.subject_type = 'collector'
          and e.event_type = any (array[
            'vault_added',
            'vault_intent_changed',
            'wall_updated',
            'scanner_v5_vault_add_enriched',
            'vault_import',
            'collector_followed'
          ]) then 'collector_activity'
        else null
      end as rank_bucket,
      case
        when e.event_type = 'want_match_available' then 1
        when w.subject_type = 'collector'
          and e.event_type = any (array[
            'vault_added',
            'vault_intent_changed',
            'wall_updated',
            'scanner_v5_vault_add_enriched',
            'vault_import',
            'collector_followed'
          ]) then 2
        when e.event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed']) then 3
        when e.event_type = any (array['set_completion_crossed', 'dex_completion_crossed']) then 4
        else 99
      end as bucket_rank,
      e.created_at,
      e.actor_user_id,
      actor_profile.slug as actor_slug,
      actor_profile.display_name as actor_display_name,
      actor_profile.avatar_path as actor_avatar_path,
      e.subject_user_id,
      subject_profile.slug as subject_slug,
      subject_profile.display_name as subject_display_name,
      e.card_print_id,
      cp.gv_id,
      cp.name as card_name,
      cp.set_code,
      s.name as set_name,
      cp.number as card_number,
      coalesce(e.payload ->> 'display_image_url', cp.image_url, cp.image_alt_url) as display_image_url,
      coalesce(e.payload ->> 'display_image_kind', case
        when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
        else 'missing'
      end) as display_image_kind,
      coalesce(e.payload ->> 'ownership_context', e.payload ->> 'intent') as ownership_context,
      e.payload ->> 'distance_bucket' as distance_bucket,
      e.payload ->> 'locality_label' as locality_label,
      case
        when nullif(e.payload ->> 'value_delta_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (e.payload ->> 'value_delta_amount')::numeric
        else null::numeric
      end as value_delta_amount,
      case
        when nullif(e.payload ->> 'value_delta_percent', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (e.payload ->> 'value_delta_percent')::numeric
        else null::numeric
      end as value_delta_percent,
      case
        when e.event_type = 'set_completion_crossed' then 'set'
        when e.event_type = 'dex_completion_crossed' then 'character'
        else null
      end as completion_subject_type,
      coalesce(e.payload ->> 'subject_label', e.payload ->> 'set_name', e.payload ->> 'character_name') as completion_subject_label,
      case
        when nullif(e.payload ->> 'threshold', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (e.payload ->> 'threshold')::numeric
        else null::numeric
      end as completion_threshold,
      case
        when e.event_type = 'want_match_available' then 'open_card_owner_context'
        when e.event_type = any (array['set_completion_crossed', 'dex_completion_crossed']) then 'open_completion'
        when e.event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed']) then 'open_card'
        else 'open_collector'
      end as primary_action,
      case
        when e.event_type = 'want_match_available' then 'View card'
        when e.event_type = any (array['set_completion_crossed', 'dex_completion_crossed']) then 'View progress'
        when e.event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed']) then 'View card'
        else 'View collector'
      end as primary_action_label,
      case
        when cp.gv_id is not null then '/card/' || cp.gv_id
        when actor_profile.slug is not null then '/collector/' || actor_profile.slug
        else null
      end as primary_action_route,
      e.payload,
      e.visibility,
      w.subject_type as watch_subject_type,
      w.subject_id as watch_subject_id,
      w.strength as watch_strength,
      row_number() over (
        partition by e.id
        order by
          case
            when e.event_type = 'want_match_available' then 1
            when w.subject_type = 'collector'
              and e.event_type = any (array[
                'vault_added',
                'vault_intent_changed',
                'wall_updated',
                'scanner_v5_vault_add_enriched',
                'vault_import',
                'collector_followed'
              ]) then 2
            when e.event_type = any (array['card_value_moved', 'value_moved', 'card_value_changed']) then 3
            when e.event_type = any (array['set_completion_crossed', 'dex_completion_crossed']) then 4
            else 99
          end,
          w.strength desc,
          w.created_at desc
      ) as match_rank
    from public.card_events e
    join public.watches w
      on w.user_id = p_viewer_user_id
     and w.muted_at is null
     and (
       (w.subject_type = 'card' and e.card_print_id = w.subject_id)
       or (w.subject_type = 'collector' and e.actor_user_id = w.subject_id)
       or (
         w.subject_type = 'set'
         and coalesce(
           public.pulse_jsonb_uuid_v1(e.payload ->> 'set_id'),
           public.pulse_jsonb_uuid_v1(e.payload ->> 'subject_id'),
           (select cp_set.set_id from public.card_prints cp_set where cp_set.id = e.card_print_id)
         ) = w.subject_id
       )
       or (
         w.subject_type = 'character'
         and coalesce(
           public.pulse_jsonb_uuid_v1(e.payload ->> 'character_id'),
           public.pulse_jsonb_uuid_v1(e.payload ->> 'species_id'),
           public.pulse_jsonb_uuid_v1(e.payload ->> 'subject_id')
         ) = w.subject_id
       )
     )
    left join public.card_prints cp
      on cp.id = e.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    left join public.public_profiles actor_profile
      on actor_profile.user_id = e.actor_user_id
    left join public.public_profiles subject_profile
      on subject_profile.user_id = e.subject_user_id
    where public.interest_graph_card_event_visible_to_viewer_v1(
        p_viewer_user_id,
        e.actor_user_id,
        e.subject_user_id,
        e.visibility
      )
      and not exists (
        select 1
        from public.watches muted_card_watch
        where muted_card_watch.user_id = p_viewer_user_id
          and muted_card_watch.subject_type = 'card'
          and muted_card_watch.subject_id = e.card_print_id
          and muted_card_watch.muted_at is not null
      )
  )
  select
    matched.card_event_id,
    matched.event_type,
    matched.rank_bucket,
    matched.bucket_rank,
    matched.created_at,
    matched.actor_user_id,
    matched.actor_slug,
    matched.actor_display_name,
    matched.actor_avatar_path,
    matched.subject_user_id,
    matched.subject_slug,
    matched.subject_display_name,
    matched.card_print_id,
    matched.gv_id,
    matched.card_name,
    matched.set_code,
    matched.set_name,
    matched.card_number,
    matched.display_image_url,
    matched.display_image_kind,
    matched.ownership_context,
    matched.distance_bucket,
    matched.locality_label,
    matched.value_delta_amount,
    matched.value_delta_percent,
    matched.completion_subject_type,
    matched.completion_subject_label,
    matched.completion_threshold,
    matched.primary_action,
    matched.primary_action_label,
    matched.primary_action_route,
    matched.payload,
    matched.visibility,
    matched.watch_subject_type,
    matched.watch_subject_id,
    matched.watch_strength
  from matched
  where matched.match_rank = 1
    and matched.rank_bucket is not null
    and matched.bucket_rank < 99;
$$;

comment on function public.pulse_eligible_events_for_viewer_v1(uuid) is
'Internal E4 Pulse eligibility helper. Joins card_events to the viewer''s unmuted watches and applies E1 visibility gates. Value-move fields remain nullable; E4 adds no pricing emitter.';

create or replace function public.pulse_items_v1(
  p_limit integer default 30,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null
)
returns table (
  pulse_item_id text,
  card_event_id uuid,
  event_type text,
  rank_bucket text,
  created_at timestamptz,
  actor_user_id uuid,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  display_image_url text,
  display_image_kind text,
  ownership_context text,
  distance_bucket text,
  locality_label text,
  value_delta_amount numeric,
  value_delta_percent numeric,
  completion_subject_type text,
  completion_subject_label text,
  completion_threshold numeric,
  primary_action text,
  primary_action_label text,
  primary_action_route text,
  payload jsonb,
  next_cursor_created_at timestamptz,
  next_cursor_event_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_cursor_bucket_rank integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_after_event_id is not null then
    select e.bucket_rank
      into v_cursor_bucket_rank
    from public.pulse_eligible_events_for_viewer_v1(v_uid) e
    where e.card_event_id = p_after_event_id
      and (p_after_created_at is null or e.created_at = p_after_created_at)
    limit 1;
  end if;

  return query
  with ranked as (
    select
      e.*,
      row_number() over (order by e.bucket_rank, e.created_at desc, e.card_event_id desc) as display_position
    from public.pulse_eligible_events_for_viewer_v1(v_uid) e
    where (
      p_after_created_at is null
      or p_after_event_id is null
      or (
        v_cursor_bucket_rank is not null
        and (
          e.bucket_rank > v_cursor_bucket_rank
          or (
            e.bucket_rank = v_cursor_bucket_rank
            and (
              e.created_at < p_after_created_at
              or (e.created_at = p_after_created_at and e.card_event_id < p_after_event_id)
            )
          )
        )
      )
      or (
        v_cursor_bucket_rank is null
        and (
          e.created_at < p_after_created_at
          or (e.created_at = p_after_created_at and e.card_event_id < p_after_event_id)
        )
      )
    )
    order by e.bucket_rank, e.created_at desc, e.card_event_id desc
    limit v_limit
  ),
  cursor_row as (
    select r.created_at, r.card_event_id
    from ranked r
    order by r.display_position desc
    limit 1
  )
  select
    'card_event:' || ranked.card_event_id::text as pulse_item_id,
    ranked.card_event_id,
    ranked.event_type,
    ranked.rank_bucket,
    ranked.created_at,
    ranked.actor_user_id,
    ranked.actor_slug,
    ranked.actor_display_name,
    ranked.actor_avatar_path,
    ranked.card_print_id,
    ranked.gv_id,
    ranked.card_name,
    ranked.set_code,
    ranked.set_name,
    ranked.card_number,
    ranked.display_image_url,
    ranked.display_image_kind,
    ranked.ownership_context,
    ranked.distance_bucket,
    ranked.locality_label,
    ranked.value_delta_amount,
    ranked.value_delta_percent,
    ranked.completion_subject_type,
    ranked.completion_subject_label,
    ranked.completion_threshold,
    ranked.primary_action,
    ranked.primary_action_label,
    ranked.primary_action_route,
    ranked.payload,
    cursor_row.created_at as next_cursor_created_at,
    cursor_row.card_event_id as next_cursor_event_id
  from ranked
  cross join cursor_row
  order by ranked.display_position;
end;
$$;

comment on function public.pulse_items_v1(integer, timestamptz, uuid) is
'E4 finite Pulse item RPC. Returns ranked watch-backed events with a cursor compatible with bucket-ranked pagination.';

create or replace function public.pulse_unread_count_v1()
returns table (
  unread_count integer,
  latest_event_created_at timestamptz,
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

  return query
  with state as (
    select s.seen_through_created_at, s.seen_through_event_id
    from public.pulse_viewer_state s
    where s.user_id = v_uid
  ),
  eligible as (
    select e.card_event_id, e.created_at
    from public.pulse_eligible_events_for_viewer_v1(v_uid) e
  ),
  latest as (
    select e.created_at, e.card_event_id
    from eligible e
    order by e.created_at desc, e.card_event_id desc
    limit 1
  ),
  unread as (
    select count(*)::integer as total
    from eligible e
    left join state s on true
    where s.seen_through_created_at is null
       or e.created_at > s.seen_through_created_at
       or (
         e.created_at = s.seen_through_created_at
         and e.card_event_id > s.seen_through_event_id
       )
  )
  select
    least((select unread.total from unread), 500)::integer as unread_count,
    latest.created_at as latest_event_created_at,
    latest.card_event_id as latest_event_id
  from latest
  union all
  select 0, null::timestamptz, null::uuid
  where not exists (select 1 from latest);
end;
$$;

comment on function public.pulse_unread_count_v1() is
'E4 Pulse unread count. latest_event_* is the only approved clear-through cursor: opening Pulse means seen-all currently eligible rows.';

create or replace function public.pulse_mark_seen_v1(
  p_seen_through_created_at timestamptz default null,
  p_seen_through_event_id uuid default null
)
returns table (
  user_id uuid,
  seen_through_created_at timestamptz,
  seen_through_event_id uuid,
  last_opened_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.pulse_viewer_state%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if (p_seen_through_created_at is null) <> (p_seen_through_event_id is null) then
    raise exception 'seen cursor requires created_at and event_id together';
  end if;

  select *
    into v_existing
  from public.pulse_viewer_state s
  where s.user_id = v_uid;

  if p_seen_through_created_at is not null
     and v_existing.user_id is not null
     and v_existing.seen_through_created_at is not null
     and (
       p_seen_through_created_at < v_existing.seen_through_created_at
       or (
         p_seen_through_created_at = v_existing.seen_through_created_at
         and p_seen_through_event_id < v_existing.seen_through_event_id
       )
     ) then
    raise exception 'pulse seen cursor cannot move backwards';
  end if;

  insert into public.pulse_viewer_state (
    user_id,
    seen_through_created_at,
    seen_through_event_id,
    last_opened_at
  )
  values (
    v_uid,
    p_seen_through_created_at,
    p_seen_through_event_id,
    now()
  )
  on conflict on constraint pulse_viewer_state_pkey do update
  set
    seen_through_created_at = coalesce(excluded.seen_through_created_at, public.pulse_viewer_state.seen_through_created_at),
    seen_through_event_id = coalesce(excluded.seen_through_event_id, public.pulse_viewer_state.seen_through_event_id),
    last_opened_at = now();

  return query
  select
    s.user_id,
    s.seen_through_created_at,
    s.seen_through_event_id,
    s.last_opened_at
  from public.pulse_viewer_state s
  where s.user_id = v_uid;
end;
$$;

comment on function public.pulse_mark_seen_v1(timestamptz, uuid) is
'E4 Pulse clear RPC. Refuses backwards movement. Passing null records an open without clearing unread items.';

alter table public.pulse_viewer_state enable row level security;

revoke all on table public.pulse_viewer_state from public, anon, authenticated;
grant select, insert, update on table public.pulse_viewer_state to authenticated;
grant all on table public.pulse_viewer_state to service_role;

drop policy if exists pulse_viewer_state_owner_select on public.pulse_viewer_state;
create policy pulse_viewer_state_owner_select
on public.pulse_viewer_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists pulse_viewer_state_owner_insert on public.pulse_viewer_state;
create policy pulse_viewer_state_owner_insert
on public.pulse_viewer_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists pulse_viewer_state_owner_update on public.pulse_viewer_state;
create policy pulse_viewer_state_owner_update
on public.pulse_viewer_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists pulse_viewer_state_service_role_all on public.pulse_viewer_state;
create policy pulse_viewer_state_service_role_all
on public.pulse_viewer_state
for all
to service_role
using (true)
with check (true);

revoke all on function public.pulse_jsonb_uuid_v1(text) from public, anon;
grant execute on function public.pulse_jsonb_uuid_v1(text) to authenticated, service_role;

revoke all on function public.pulse_eligible_events_for_viewer_v1(uuid) from public, anon, authenticated;
grant execute on function public.pulse_eligible_events_for_viewer_v1(uuid) to service_role;

revoke all on function public.pulse_items_v1(integer, timestamptz, uuid) from public, anon;
grant execute on function public.pulse_items_v1(integer, timestamptz, uuid) to authenticated, service_role;

revoke all on function public.pulse_unread_count_v1() from public, anon;
grant execute on function public.pulse_unread_count_v1() to authenticated, service_role;

revoke all on function public.pulse_mark_seen_v1(timestamptz, uuid) from public, anon;
grant execute on function public.pulse_mark_seen_v1(timestamptz, uuid) to authenticated, service_role;

commit;
