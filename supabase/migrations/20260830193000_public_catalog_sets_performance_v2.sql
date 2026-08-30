-- PUBLIC_CATALOG_SETS_PERFORMANCE_V2
-- Returns the visible, populated set catalog without evaluating the
-- card-visibility function once per card. Set and game release controls remain
-- authoritative, including signed-in-only catalogs and hidden set overrides.

begin;

create or replace function public.get_public_catalog_sets_v2(
  p_game_code text default null
)
returns table (
  id uuid,
  game text,
  code text,
  name text,
  hero_image_url text,
  hero_image_source text,
  set_role text,
  catalog_set_type text,
  printed_set_abbrev text,
  printed_total integer,
  release_date date,
  created_at timestamptz,
  card_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  requested_game text := nullif(lower(btrim(coalesce(p_game_code, ''))), '');
  request_role text := coalesce(auth.role(), '');
begin
  if requested_game is not null and length(requested_game) > 64 then
    raise exception 'get_public_catalog_sets_v2 game code is too long';
  end if;

  return query
  with visible_sets as materialized (
    select
      target.id,
      target.game,
      target.code,
      target.name,
      target.hero_image_url,
      target.hero_image_source,
      target.set_role,
      target.source #>> '{scryfall,set_type}' as catalog_set_type,
      target.printed_set_abbrev,
      target.printed_total,
      target.release_date,
      target.created_at,
      lower(target.code) as normalized_code
    from public.sets target
    left join public.catalog_set_release_controls set_control
      on set_control.set_id = target.id
    left join public.catalog_game_release_controls game_control
      on lower(game_control.game_code) = lower(target.game)
    where (requested_game is null or lower(target.game) = requested_game)
      and case
        when set_control.set_id is not null then
          set_control.release_status = 'public'
          or (
            set_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
        when lower(target.game) = 'pokemon' then true
        else
          game_control.release_status = 'public'
          or (
            game_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
      end
  ),
  visible_card_counts as materialized (
    select
      lower(card.set_code) as normalized_code,
      count(*)::bigint as card_count
    from public.card_prints card
    join visible_sets visible_set
      on visible_set.id = card.set_id
    where card.gv_id is not null
      and coalesce(
        card.data_quality_flags #>> '{app_visibility_v1,status}',
        'visible'
      ) <> 'suppressed'
    group by lower(card.set_code)
  )
  select
    visible_set.id,
    visible_set.game,
    visible_set.code,
    visible_set.name,
    visible_set.hero_image_url,
    visible_set.hero_image_source,
    visible_set.set_role,
    visible_set.catalog_set_type,
    visible_set.printed_set_abbrev,
    visible_set.printed_total,
    visible_set.release_date,
    visible_set.created_at,
    count_row.card_count
  from visible_sets visible_set
  join visible_card_counts count_row
    on count_row.normalized_code = visible_set.normalized_code
  where count_row.card_count > 0
  order by visible_set.game, visible_set.code, visible_set.id;
end;
$function$;

revoke all on function public.get_public_catalog_sets_v2(text)
from public, anon, authenticated, service_role;
grant execute on function public.get_public_catalog_sets_v2(text)
to anon, authenticated, service_role;

comment on function public.get_public_catalog_sets_v2(text) is
  'Set-based, release-aware populated catalog used by app Sets surfaces. Avoids per-card visibility function evaluation.';

notify pgrst, 'reload schema';

commit;
