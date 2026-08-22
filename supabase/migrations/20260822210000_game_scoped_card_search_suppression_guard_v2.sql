-- GAME_SCOPED_CARD_SEARCH_SUPPRESSION_GUARD_V2
-- Keeps the original applied V1 migration immutable while ensuring the
-- client-facing SECURITY DEFINER search reproduces restrictive card visibility.

begin;

create or replace function public.search_game_card_prints_v2(
  game_code_in text,
  q text default null,
  set_code_in text default null,
  number_in text default null,
  illustrator_in text default null,
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
language sql
stable
security definer
set search_path = public
as $$
  select
    result.id,
    result.gv_id,
    result.name,
    result.number,
    result.number_plain,
    result.rarity,
    result.artist,
    result.image_url,
    result.image_alt_url,
    result.image_source,
    result.image_path,
    result.representative_image_url,
    result.image_status,
    result.image_note,
    result.set_code,
    result.printed_set_abbrev,
    result.external_ids,
    result.variant_key,
    result.printed_identity_modifier,
    result.variants
  from public.search_game_card_prints_v1(
    game_code_in,
    q,
    set_code_in,
    number_in,
    illustrator_in,
    limit_in,
    offset_in
  ) with ordinality as result
  join public.card_prints card on card.id = result.id
  where public.catalog_game_visible_to_request_v1(game_code_in)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
  order by result.ordinality;
$$;

comment on function public.search_game_card_prints_v2(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) is
  'Read-only bounded canonical search for a released game. Explicitly suppressed card rows remain hidden across the SECURITY DEFINER boundary.';

revoke all on function public.search_game_card_prints_v1(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public, anon, authenticated, service_role;

revoke all on function public.search_game_card_prints_v2(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.search_game_card_prints_v2(
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
