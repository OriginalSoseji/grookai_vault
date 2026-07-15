begin;

drop function if exists public.pulse_items_v1(integer, timestamptz, uuid);

create or replace function public.pulse_items_v1(
  p_limit integer default 30,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null,
  p_include_seen boolean default false
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
  with state as (
    select s.seen_through_created_at, s.seen_through_event_id
    from public.pulse_viewer_state s
    where s.user_id = v_uid
  ),
  ranked as (
    select
      e.*,
      wm.vault_item_id as contact_vault_item_id,
      wm.instance_id as contact_instance_id,
      row_number() over (order by e.bucket_rank, e.created_at desc, e.card_event_id desc) as display_position
    from public.pulse_eligible_events_for_viewer_v1(v_uid) e
    left join public.want_matches wm
      on e.event_type = 'want_match_available'
     and wm.want_user_id = v_uid
     and wm.id = public.pulse_jsonb_uuid_v1(e.payload ->> 'want_match_id')
    left join state s on true
    where (
      p_include_seen
      or s.seen_through_created_at is null
      or e.created_at > s.seen_through_created_at
      or (
        e.created_at = s.seen_through_created_at
        and e.card_event_id > s.seen_through_event_id
      )
    )
    and (
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
    jsonb_strip_nulls(
      ranked.payload || jsonb_build_object(
        'vault_item_id', ranked.contact_vault_item_id,
        'instance_id', ranked.contact_instance_id
      )
    ) as payload,
    cursor_row.created_at as next_cursor_created_at,
    cursor_row.card_event_id as next_cursor_event_id
  from ranked
  cross join cursor_row
  order by ranked.display_position;
end;
$$;

comment on function public.pulse_items_v1(integer, timestamptz, uuid, boolean) is
'E4 Pulse item RPC. By default returns only items newer than the viewer seen cursor; p_include_seen=true powers explicit recent-history loading while preserving bucket pagination and want-match contact anchors.';

revoke all on function public.pulse_items_v1(integer, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.pulse_items_v1(integer, timestamptz, uuid, boolean) to authenticated, service_role;

commit;
