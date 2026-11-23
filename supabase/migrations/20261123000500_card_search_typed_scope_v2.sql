-- Bound typed Pokemon family browsing; preserve the original GV-ID, free-text, unscoped and other-game paths and Jungle NULL policy.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $guard$ declare reader pg_catalog.pg_proc;begin
 select * into reader from pg_catalog.pg_proc where oid='public.search_game_card_prints_v5(text,text,text,text,text,text,integer,integer)'::regprocedure;
 if reader.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
  or not reader.prosecdef or reader.provolatile<>'s' or reader.pronargs<>8
  or reader.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
  or reader.proconfig is distinct from array['search_path=public','plan_cache_mode=force_custom_plan']::text[]
  or md5(reader.prosrc) not in('d364a536540a45ae94619cccfb643de1','4b7444b268ef40f1fabae97d85bd2448')
  or md5(pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
  or md5(pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
  or not exists(select 1 from supabase_migrations.schema_migrations where version='20261122194000')
 then raise exception 'CARD_SEARCH_TYPED_SCOPE_BASELINE_DRIFT' using errcode='23514';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.search_game_card_prints_v5(game_code_in text, q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, illustrator_in text DEFAULT NULL::text, language_scope_in text DEFAULT 'all'::text, limit_in integer DEFAULT 512, offset_in integer DEFAULT 0)
 RETURNS TABLE(id uuid, gv_id text, name text, number text, number_plain text, rarity text, artist text, image_url text, image_alt_url text, image_source text, image_path text, representative_image_url text, image_status text, image_note text, set_code text, printed_set_abbrev text, external_ids jsonb, variant_key text, printed_identity_modifier text, variants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_game_code text := nullif(lower(trim(game_code_in)), '');
  v_game_id uuid;
  v_query text := nullif(trim(q), '');
  v_effective_query text := nullif(trim(q), '');
  v_set_code text := case when lower(trim(q)) like 'gv-%' then nullif(lower(trim(set_code_in)), '')
    else nullif(public.resolve_prismatic_discovery_set_code_v1(set_code_in, game_code_in), '') end;
  v_number text := nullif(lower(trim(number_in)), '');
  v_illustrator text := nullif(lower(trim(illustrator_in)), '');
  v_language_scope text := case
    when lower(trim(coalesce(language_scope_in, 'all'))) in ('en', 'ja')
    then lower(trim(language_scope_in))
    else 'all'
  end;
  v_result_limit integer := least(greatest(coalesce(limit_in, 512), 1), 512);
  v_result_offset integer := least(greatest(coalesce(offset_in, 0), 0), 10000);
  v_first_token text;
begin
  select game.id
  into v_game_id
  from public.games game
  where lower(game.code) = v_game_code
    and (
      public.catalog_game_visible_to_request_v1(game.code)
      or exists (
        select 1
        from public.sets released_set
        where lower(released_set.game) = v_game_code
          and public.catalog_set_visible_to_request_v1(released_set.id)
      )
    )
  limit 1;

  if v_game_id is null then
    return;
  end if;

  if v_query is not null and lower(v_query) like 'gv-%' then
    return query
    select
      card.id,
      card.gv_id,
      card.name,
      card.number,
      card.number_plain,
      card.rarity,
      card.artist,
      card.image_url,
      card.image_alt_url,
      card.image_source,
      card.image_path,
      card.representative_image_url,
      card.image_status,
      card.image_note,
      card.set_code,
      card.printed_set_abbrev,
      card.external_ids,
      card.variant_key,
      card.printed_identity_modifier,
      card.variants
    from public.card_prints card
    where card.game_id = v_game_id
      and lower(card.gv_id) = lower(v_query)
      and public.catalog_card_print_visible_to_request_v1(card.id)
      and coalesce(
        card.data_quality_flags #>> '{app_visibility_v1,status}',
        'visible'
      ) <> 'suppressed'
      and (v_set_code is null or lower(card.set_code) = v_set_code)
      and (
        v_number is null
        or lower(card.number) = v_number
        or lower(card.number_plain) = v_number
      )
      and (v_illustrator is null or lower(card.artist) = v_illustrator)
      and (
        v_game_code <> 'pokemon'
        or v_language_scope = 'all'
        or (
          v_language_scope = 'ja'
          and (
            upper(card.gv_id) like 'GV-PK-JPN-%'
            or upper(card.gv_id) like '%-JPN-%'
          )
        )
        or (
          v_language_scope = 'en'
          and upper(card.gv_id) not like 'GV-PK-JPN-%'
          and upper(card.gv_id) not like '%-JPN-%'
        )
      )
    order by card.id
    limit v_result_limit
    offset v_result_offset;
    return;
  end if;

  if v_set_code is null and v_query is not null and position(' ' in v_query) > 0 then
    v_first_token := lower(split_part(v_query, ' ', 1));

    select lower(candidate.code)
    into v_set_code
    from public.sets candidate
    where lower(candidate.game) = v_game_code
      and lower(candidate.code) = v_first_token
      and public.catalog_set_visible_to_request_v1(candidate.id)
    order by candidate.code
    limit 1;

    if v_set_code is not null then
      v_effective_query := nullif(trim(substr(
        v_query,
        length(split_part(v_query, ' ', 1)) + 1
      )), '');
    end if;
  end if;

  v_set_code := nullif(public.resolve_prismatic_discovery_set_code_v1(v_set_code, v_game_code), '');
  if v_game_code = 'pokemon' and v_effective_query is null
    and v_set_code in('sv08.5','sv8pt5','sv04.5','sv4pt5','swsh10.5','pgo','2021swsh','mcd21','tk-ex-latio','tk1b','sv06.5','sv6pt5','bog','bp') then
    return query
    with scoped_card_family as (
WITH shrouded_policy AS MATERIALIZED (
         SELECT case when v_set_code in('sv06.5','sv6pt5') then public.get_shrouded_fable_discovery_projection_v1() else null::jsonb end AS value
        ), best_of_game_policy AS MATERIALIZED (
         SELECT case when v_set_code in('bog','bp') then public.get_best_of_game_discovery_projection_v1() else null::jsonb end AS value
        ), projections AS MATERIALIZED (
         SELECT (s.value ->> 'parent_id'::text)::uuid AS parent_id,
            (s.value ->> 'set_id'::text)::uuid AS set_id,
            s.value ->> 'set_code'::text AS set_code
           FROM shrouded_policy s
          WHERE s.value IS NOT NULL
        UNION ALL
         SELECT member.id::uuid AS id,
            (b.value ->> 'set_id'::text)::uuid AS uuid,
            b.value ->> 'set_code'::text
           FROM best_of_game_policy b
             CROSS JOIN LATERAL jsonb_array_elements_text(b.value -> 'parent_ids'::text) member(id)
        )
 SELECT card.id,
    card.game_id,
    card.set_id,
    card.name,
    card.number,
    card.variant_key,
    card.rarity,
    card.image_url,
    card.tcgplayer_id,
    card.external_ids,
    card.updated_at,
    card.set_code,
    card.artist,
    card.regulation_mark,
    card.image_alt_url,
    card.image_source,
    card.variants,
    card.created_at,
    card.last_synced_at,
    card.print_identity_key,
    card.ai_metadata,
    card.image_hash,
    card.data_quality_flags,
    card.image_status,
    card.image_res,
    card.image_last_checked_at,
    card.printed_set_abbrev,
    card.printed_total,
    card.number_plain,
    card.gv_id,
    card.image_path,
    card.identity_domain,
    card.printed_identity_modifier,
    card.set_identity_model,
    card.representative_image_url,
    card.image_note
   FROM public.card_prints card
  WHERE NOT (card.id IN ( SELECT projections.parent_id
           FROM projections))
UNION ALL
 SELECT card.id,
    card.game_id,
    projection.set_id,
    card.name,
    card.number,
    card.variant_key,
    card.rarity,
    card.image_url,
    card.tcgplayer_id,
    card.external_ids,
    card.updated_at,
    projection.set_code,
    card.artist,
    card.regulation_mark,
    card.image_alt_url,
    card.image_source,
    card.variants,
    card.created_at,
    card.last_synced_at,
    card.print_identity_key,
    card.ai_metadata,
    card.image_hash,
    card.data_quality_flags,
    card.image_status,
    card.image_res,
    card.image_last_checked_at,
    card.printed_set_abbrev,
    card.printed_total,
    card.number_plain,
    card.gv_id,
    card.image_path,
    card.identity_domain,
    card.printed_identity_modifier,
    card.set_identity_model,
    card.representative_image_url,
    card.image_note
   FROM public.card_prints card
     JOIN projections projection ON projection.parent_id = card.id
    )
select
    card.id,
    card.gv_id,
    card.name,
    card.number,
    card.number_plain,
    card.rarity,
    card.artist,
    card.image_url,
    card.image_alt_url,
    card.image_source,
    card.image_path,
    card.representative_image_url,
    card.image_status,
    card.image_note,
    card.set_code,
    card.printed_set_abbrev,
    card.external_ids,
    card.variant_key,
    card.printed_identity_modifier,
    card.variants
  from scoped_card_family card
  where card.id <> ALL (((select public.get_jungle_edition_discovery_exclusions_v1()))::uuid[])
      and not (card.id in (select unnest(case when v_set_code in('sv08.5','sv8pt5') then public.get_prismatic_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('sv04.5','sv4pt5') then public.get_paldean_fates_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('swsh10.5','pgo') then public.get_pokemon_go_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('2021swsh','mcd21') then public.get_mcdonalds_2021_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('tk-ex-latio','tk1b') then public.get_latios_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('sv06.5','sv6pt5') then public.get_shrouded_fable_discovery_exclusions_v1() else array[]::uuid[] end)))
      and not (card.id in (select unnest(case when v_set_code in('bog','bp') then public.get_best_of_game_discovery_exclusions_v1() else array[]::uuid[] end)))
      and card.game_id = v_game_id
    and public.catalog_card_print_visible_to_request_v1(card.id)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and (v_set_code is null or lower(card.set_code) = v_set_code)
    and (
      v_number is null
      or lower(card.number) = v_number
      or lower(card.number_plain) = v_number
    )
    and (v_illustrator is null or lower(card.artist) = v_illustrator)
    and (
      v_effective_query is null
      or lower(card.name) like '%' || lower(v_effective_query) || '%'
    )
    and (
      v_game_code <> 'pokemon'
      or v_language_scope = 'all'
      or (
        v_language_scope = 'ja'
        and (
          upper(card.gv_id) like 'GV-PK-JPN-%'
          or upper(card.gv_id) like '%-JPN-%'
        )
      )
      or (
        v_language_scope = 'en'
        and upper(card.gv_id) not like 'GV-PK-JPN-%'
        and upper(card.gv_id) not like '%-JPN-%'
      )
    )
  order by
    case
      when v_effective_query is not null
        and lower(card.name) = lower(v_effective_query)
      then 0
      else 1
    end,
    card.name,
    card.set_code,
    card.number,
    card.id
  limit v_result_limit
  offset v_result_offset;
    return;
  end if;

  return query
  select
    card.id,
    card.gv_id,
    card.name,
    card.number,
    card.number_plain,
    card.rarity,
    card.artist,
    card.image_url,
    card.image_alt_url,
    card.image_source,
    card.image_path,
    card.representative_image_url,
    card.image_status,
    card.image_note,
    card.set_code,
    card.printed_set_abbrev,
    card.external_ids,
    card.variant_key,
    card.printed_identity_modifier,
    card.variants
  from public.v_card_prints_discovery_v1 card
  where card.game_id = v_game_id
    and public.catalog_card_print_visible_to_request_v1(card.id)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and (v_set_code is null or lower(card.set_code) = v_set_code)
    and (
      v_number is null
      or lower(card.number) = v_number
      or lower(card.number_plain) = v_number
    )
    and (v_illustrator is null or lower(card.artist) = v_illustrator)
    and (
      v_effective_query is null
      or lower(card.name) like '%' || lower(v_effective_query) || '%'
    )
    and (
      v_game_code <> 'pokemon'
      or v_language_scope = 'all'
      or (
        v_language_scope = 'ja'
        and (
          upper(card.gv_id) like 'GV-PK-JPN-%'
          or upper(card.gv_id) like '%-JPN-%'
        )
      )
      or (
        v_language_scope = 'en'
        and upper(card.gv_id) not like 'GV-PK-JPN-%'
        and upper(card.gv_id) not like '%-JPN-%'
      )
    )
  order by
    case
      when v_effective_query is not null
        and lower(card.name) = lower(v_effective_query)
      then 0
      else 1
    end,
    card.name,
    card.set_code,
    card.number,
    card.id
  limit v_result_limit
  offset v_result_offset;
end;
$function$;

commit;
