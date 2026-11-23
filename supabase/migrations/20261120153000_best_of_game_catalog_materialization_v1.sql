-- Forward-only catalog plan fence after immutable scalar policy preparation514.
-- Evaluate the same five discovery fields once; preserve every filter, role and returned value.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $guard$ declare helper pg_catalog.pg_proc;begin
 select * into helper from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure;
 if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
  or not helper.prosecdef or helper.provolatile<>'s' or helper.pronargs<>1
  or helper.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
  or md5(helper.prosrc) not in('8e7dc97977b25e4e09329e3f0b443499','0af6e8afe70441fff9a8c8a5ae66ee66')
  or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.get_best_of_game_discovery_projection_v1()'::regprocedure)<>'b5d1836d5cb1a50b491cc166ece08716'
  or cardinality(public.get_best_of_game_discovery_exclusions_v1())<>9
 then raise exception 'BEST_OF_GAME_CATALOG_MATERIALIZATION_BASELINE_DRIFT' using errcode='23514';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(p_game_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, game text, code text, name text, hero_image_url text, hero_image_source text, set_role text, catalog_set_type text, printed_set_abbrev text, printed_total integer, release_date date, created_at timestamp with time zone, card_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1() || public.get_prismatic_discovery_exclusions_v1();
  paldean_exclusions uuid[] := public.get_paldean_fates_discovery_exclusions_v1();
  pokemon_go_exclusions uuid[] := public.get_pokemon_go_discovery_exclusions_v1();
  mcdonalds_2021_exclusions uuid[] := public.get_mcdonalds_2021_discovery_exclusions_v1();
  latios_exclusions uuid[] := public.get_latios_discovery_exclusions_v1();
  shrouded_exclusions uuid[] := public.get_shrouded_fable_discovery_exclusions_v1();
  best_of_game_exclusions uuid[] := public.get_best_of_game_discovery_exclusions_v1();
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
  countable_cards as materialized (
    select id,set_id,set_code,gv_id,data_quality_flags
    from public.v_card_prints_set_family_discovery_v1
  ),
  visible_card_counts as materialized (
    select
      lower(card.set_code) as normalized_code,
      count(*)::bigint as card_count
    from countable_cards card
    join visible_sets visible_set
      on visible_set.id = card.set_id
    where card.gv_id is not null
    and card.id <> all(discovery_exclusions)
      and card.id not in (select unnest(paldean_exclusions))
      and card.id not in (select unnest(pokemon_go_exclusions))
      and card.id not in (select unnest(mcdonalds_2021_exclusions))
      and card.id not in (select unnest(latios_exclusions))
      and card.id not in (select unnest(shrouded_exclusions))
      and card.id not in (select unnest(best_of_game_exclusions))
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
$function$
;
notify pgrst,'reload schema';
commit;
