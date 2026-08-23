-- CROSS_TCG_CARD_SEARCH_V4
-- Keeps ordinary V3 search behavior and adds exact GV-ID lookup inside the
-- same request-authorized, suppression-aware catalog boundary.

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
  v_query text := nullif(trim(q), '');
  v_language_scope text := case
    when lower(trim(coalesce(language_scope_in, 'all'))) in ('en', 'ja')
    then lower(trim(language_scope_in))
    else 'all'
  end;
  v_result_limit integer := least(greatest(coalesce(limit_in, 50), 1), 64);
  v_result_offset integer := least(greatest(coalesce(offset_in, 0), 0), 10000);
begin
  if v_query is null or lower(v_query) not like 'gv-%' then
    return query
    select *
    from public.search_game_card_prints_v3(
      game_code_in,
      q,
      set_code_in,
      number_in,
      illustrator_in,
      language_scope_in,
      limit_in,
      offset_in
    );
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
  from public.games game
  join public.card_prints card on card.game_id = game.id
  where lower(game.code) = v_game_code
    and public.catalog_game_visible_to_request_v1(game.code)
    and lower(card.gv_id) = lower(v_query)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and (
      nullif(lower(trim(set_code_in)), '') is null
      or lower(card.set_code) = lower(trim(set_code_in))
    )
    and (
      nullif(lower(trim(number_in)), '') is null
      or lower(card.number) = lower(trim(number_in))
      or lower(card.number_plain) = lower(trim(number_in))
    )
    and (
      nullif(lower(trim(illustrator_in)), '') is null
      or lower(card.artist) = lower(trim(illustrator_in))
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
  order by card.id
  limit v_result_limit
  offset v_result_offset;
end;
$$;

comment on function public.search_game_card_prints_v4(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) is
  'Read-only V3-compatible canonical card search with request-authorized exact GV-ID support.';

revoke all on function public.search_game_card_prints_v4(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.search_game_card_prints_v4(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
