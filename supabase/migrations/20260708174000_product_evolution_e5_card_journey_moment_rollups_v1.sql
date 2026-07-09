set check_function_bodies = off;

create or replace function public.card_journey_moments_v1(
  p_card_print_id uuid,
  p_limit integer default 5,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null
)
returns table (
  event_id uuid,
  event_type text,
  created_at timestamptz,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  card_print_id uuid,
  moment_line text,
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
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 50);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with raw_events as (
    select
      e.id as event_id,
      e.event_type,
      e.created_at,
      e.actor_user_id,
      pp.slug as actor_slug,
      coalesce(nullif(btrim(pp.display_name), ''), pp.slug) as actor_display_name,
      case
        when nullif(btrim(pp.avatar_path), '') ~* '^https?://' then pp.avatar_path
        else null::text
      end as actor_avatar_path,
      e.card_print_id,
      cp.name as card_name,
      e.payload
    from public.card_events e
    left join public.public_profiles pp
      on pp.user_id = e.actor_user_id
    left join public.card_prints cp
      on cp.id = e.card_print_id
    where e.card_print_id = p_card_print_id
      and e.event_type in ('vault_added', 'set_completion_crossed', 'dex_completion_crossed')
      and public.interest_graph_card_event_visible_to_viewer_v1(
        v_uid,
        e.actor_user_id,
        e.subject_user_id,
        e.visibility
      ) is true
  ),
  vault_rollups as (
    select
      (array_agg(r.event_id order by r.created_at desc, r.event_id desc))[1] as event_id,
      'vault_added'::text as event_type,
      max(r.created_at) as created_at,
      r.actor_slug,
      r.actor_display_name,
      r.actor_avatar_path,
      r.card_print_id,
      case
        when count(*) = 1 then
          coalesce(r.actor_display_name, r.actor_slug, 'A collector') || ' added ' || coalesce(max(r.card_name), 'this card')
        else
          coalesce(r.actor_display_name, r.actor_slug, 'A collector') || ' added ' || count(*)::text || ' copies of ' || coalesce(max(r.card_name), 'this card')
      end as moment_line
    from raw_events r
    where r.event_type = 'vault_added'
    group by
      r.actor_user_id,
      r.actor_slug,
      r.actor_display_name,
      r.actor_avatar_path,
      r.card_print_id
  ),
  completion_events as (
    select
      r.event_id,
      r.event_type,
      r.created_at,
      r.actor_slug,
      r.actor_display_name,
      r.actor_avatar_path,
      r.card_print_id,
      case
        when r.event_type = 'set_completion_crossed' then
          coalesce(r.actor_display_name, r.actor_slug, 'A collector') || ' crossed a set milestone'
        when r.event_type = 'dex_completion_crossed' then
          coalesce(r.actor_display_name, r.actor_slug, 'A collector') || ' crossed a Dex milestone'
        else
          coalesce(r.actor_display_name, r.actor_slug, 'A collector') || ' updated this card'
      end as moment_line
    from raw_events r
    where r.event_type in ('set_completion_crossed', 'dex_completion_crossed')
  ),
  eligible as (
    select * from vault_rollups
    union all
    select * from completion_events
  ),
  page as (
    select *
    from eligible e
    where (
      p_after_created_at is null
      or p_after_event_id is null
      or e.created_at < p_after_created_at
      or (e.created_at = p_after_created_at and e.event_id < p_after_event_id)
    )
    order by e.created_at desc, e.event_id desc
    limit v_limit
  ),
  cursor_row as (
    select p.created_at, p.event_id
    from page p
    order by p.created_at asc, p.event_id asc
    limit 1
  )
  select
    page.event_id,
    page.event_type,
    page.created_at,
    page.actor_slug,
    page.actor_display_name,
    page.actor_avatar_path,
    page.card_print_id,
    page.moment_line,
    cursor_row.created_at as next_cursor_created_at,
    cursor_row.event_id as next_cursor_event_id
  from page
  cross join cursor_row
  order by page.created_at desc, page.event_id desc;
end;
$$;

comment on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) is
'E5 Card Journeys authenticated moments RPC. Returns display-safe fields only; no payload jsonb. Repeated public vault_added events by the same actor for the same exact card collapse into one counted moment; completion crossings remain individual moments. Scanner enriched private twins are excluded.';

revoke all on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.card_journey_moments_v1(uuid, integer, timestamptz, uuid) to authenticated, service_role;
