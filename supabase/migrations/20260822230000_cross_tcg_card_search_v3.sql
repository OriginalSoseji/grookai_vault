-- CROSS_TCG_CARD_SEARCH_V3
-- One bounded, request-authorized search path for ordinary card-name lookups.
-- Language filtering is applied before the result limit so Japanese Pokemon
-- searches cannot be starved by earlier English rows.

begin;

create or replace function public.search_game_card_prints_v3(
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
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      nullif(lower(trim(game_code_in)), '') as game_code_norm,
      nullif(trim(q), '') as q_norm,
      nullif(lower(trim(set_code_in)), '') as set_code_norm,
      nullif(lower(trim(number_in)), '') as number_norm,
      nullif(lower(trim(illustrator_in)), '') as illustrator_norm,
      case
        when lower(trim(coalesce(language_scope_in, 'all'))) in ('en', 'ja')
        then lower(trim(language_scope_in))
        else 'all'
      end as language_scope,
      least(greatest(coalesce(limit_in, 50), 1), 64) as result_limit,
      least(greatest(coalesce(offset_in, 0), 0), 10000) as result_offset
  ),
  authorized_game as (
    select game.id as game_id, normalized.*
    from normalized
    join public.games game
      on lower(game.code) = normalized.game_code_norm
    where public.catalog_game_visible_to_request_v1(game.code)
  ),
  inferred_scope as (
    select
      authorized_game.*,
      case
        when authorized_game.set_code_norm is not null then authorized_game.set_code_norm
        when position(' ' in coalesce(authorized_game.q_norm, '')) > 0 then (
          select lower(candidate.code)
          from public.sets candidate
          where lower(candidate.game) = authorized_game.game_code_norm
            and lower(candidate.code) = lower(split_part(authorized_game.q_norm, ' ', 1))
          order by candidate.code
          limit 1
        )
        else null
      end as effective_set_code
    from authorized_game
  ),
  effective_scope as (
    select
      inferred_scope.*,
      case
        when inferred_scope.set_code_norm is null
          and inferred_scope.effective_set_code is not null
        then nullif(trim(substr(
          inferred_scope.q_norm,
          length(split_part(inferred_scope.q_norm, ' ', 1)) + 1
        )), '')
        else inferred_scope.q_norm
      end as effective_query
    from inferred_scope
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
  from effective_scope scope
  join public.card_prints card on card.game_id = scope.game_id
  where
    coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and (
      scope.effective_set_code is null
      or lower(card.set_code) = scope.effective_set_code
    )
    and (
      scope.number_norm is null
      or lower(card.number) = scope.number_norm
      or lower(card.number_plain) = scope.number_norm
    )
    and (
      scope.illustrator_norm is null
      or lower(card.artist) = scope.illustrator_norm
    )
    and (
      scope.effective_query is null
      or position(lower(scope.effective_query) in lower(card.name)) > 0
    )
    and (
      scope.game_code_norm <> 'pokemon'
      or scope.language_scope = 'all'
      or (
        scope.language_scope = 'ja'
        and (
          upper(card.gv_id) like 'GV-PK-JPN-%'
          or upper(card.gv_id) like '%-JPN-%'
        )
      )
      or (
        scope.language_scope = 'en'
        and upper(card.gv_id) not like 'GV-PK-JPN-%'
        and upper(card.gv_id) not like '%-JPN-%'
      )
    )
  order by
    case
      when scope.effective_query is not null
        and lower(card.name) = lower(scope.effective_query)
      then 0
      else 1
    end,
    card.name,
    card.set_code,
    card.number,
    card.id
  limit (select result_limit from effective_scope)
  offset (select result_offset from effective_scope);
$$;

comment on function public.search_game_card_prints_v3(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) is
  'Read-only bounded canonical card search with one release-authority check, suppression enforcement, and pre-limit Pokemon language filtering.';

revoke all on function public.search_game_card_prints_v3(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.search_game_card_prints_v3(
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
