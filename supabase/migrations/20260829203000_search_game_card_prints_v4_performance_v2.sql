-- SEARCH_GAME_CARD_PRINTS_V4_PERFORMANCE_V2
-- Preserves the V4 interface and release boundaries while avoiding the
-- materialized CTE plan that timed out ordinary indexed name searches.

begin;

create or replace function public.search_game_card_prints_v4(
  game_code_in text,
  q text default null,
  set_code_in text default null,
  number_in text default null,
  illustrator_in text default null,
  language_scope_in text default 'all',
  limit_in integer default 50,
  offset_in integer default 0
)
returns table (
  id uuid,
  gv_id text,
  name text,
  number text,
  number_plain text,
  rarity text,
  artist text,
  image_url text,
  image_alt_url text,
  image_source text,
  image_path text,
  representative_image_url text,
  image_status text,
  image_note text,
  set_code text,
  printed_set_abbrev text,
  external_ids jsonb,
  variant_key text,
  printed_identity_modifier text,
  variants jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game_code text := nullif(lower(trim(game_code_in)), '');
  v_game_id uuid;
  v_query text := nullif(trim(q), '');
  v_effective_query text := nullif(trim(q), '');
  v_set_code text := nullif(lower(trim(set_code_in)), '');
  v_number text := nullif(lower(trim(number_in)), '');
  v_illustrator text := nullif(lower(trim(illustrator_in)), '');
  v_language_scope text := case
    when lower(trim(coalesce(language_scope_in, 'all'))) in ('en', 'ja')
    then lower(trim(language_scope_in))
    else 'all'
  end;
  v_result_limit integer := least(greatest(coalesce(limit_in, 50), 1), 64);
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
$$;

comment on function public.search_game_card_prints_v4(
  text, text, text, text, text, text, integer, integer
) is
  'Set- and game-release-aware bounded canonical card search with exact GV-ID support and an indexable direct-query plan.';

revoke all on function public.search_game_card_prints_v4(
  text, text, text, text, text, text, integer, integer
) from public;

grant execute on function public.search_game_card_prints_v4(
  text, text, text, text, text, text, integer, integer
) to anon, authenticated, service_role;

commit;
