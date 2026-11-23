-- Forward-only visible-set pruning before catalog materialization. Zero canonical or operational data writes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $guard$ declare helper pg_catalog.pg_proc;begin
 select * into helper from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure;
 if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
  or not helper.prosecdef or helper.provolatile<>'s' or helper.pronargs<>1
  or helper.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
  or md5(helper.prosrc) not in('e57ca8cb762f54913155086be55d9042','8dcf45a8679bf3ec0f92633838a92aee')
  or not exists(select 1 from supabase_migrations.schema_migrations where version='20261120160000')
  or cardinality(public.get_best_of_game_discovery_exclusions_v1())<>9
 then raise exception 'BEST_OF_GAME_CATALOG_VISIBLE_PRUNING_BASELINE_DRIFT' using errcode='23514';end if;
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
    select family_card.id,family_card.set_id,family_card.set_code,family_card.gv_id,family_card.data_quality_flags
    from public.v_card_prints_set_family_discovery_v1 family_card
    join visible_sets countable_set on countable_set.id=family_card.set_id
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
