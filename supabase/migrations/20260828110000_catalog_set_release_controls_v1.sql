-- CATALOG_SET_RELEASE_CONTROLS_V1
-- Allows a newly staged set to remain hidden while its game catalog is live.
-- Existing sets inherit their game-level release status unless explicitly overridden.

begin;

create table if not exists public.catalog_set_release_controls (
  set_id uuid primary key references public.sets(id) on delete restrict,
  release_status text not null default 'hidden'
    check (release_status in ('hidden', 'signed_in', 'public')),
  release_version text not null,
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  activated_at timestamptz null,
  activated_by text null,
  updated_at timestamptz not null default now()
);

comment on table public.catalog_set_release_controls is
  'Service-owned per-set release override. Missing rows inherit catalog_game_release_controls; explicit hidden rows fail closed.';

alter table public.catalog_set_release_controls enable row level security;

revoke all on table public.catalog_set_release_controls
from public, anon, authenticated;
grant select, insert, update on table public.catalog_set_release_controls
to service_role;

drop policy if exists catalog_set_release_controls_service_v1
on public.catalog_set_release_controls;

create policy catalog_set_release_controls_service_v1
on public.catalog_set_release_controls
for all
to service_role
using (true)
with check (true);

create or replace function public.catalog_set_visible_to_request_v1(
  p_set_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when set_control.set_id is not null then
          set_control.release_status = 'public'
          or (
            set_control.release_status = 'signed_in'
            and coalesce(auth.role(), '') in ('authenticated', 'service_role')
          )
        else public.catalog_game_visible_to_request_v1(target_set.game)
      end
      from public.sets target_set
      left join public.catalog_set_release_controls set_control
        on set_control.set_id = target_set.id
      where target_set.id = p_set_id
    ),
    false
  );
$$;

create or replace function public.catalog_card_print_visible_to_request_v1(
  p_card_print_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when card.set_id is not null
          then public.catalog_set_visible_to_request_v1(card.set_id)
        else public.catalog_game_id_visible_to_request_v1(card.game_id)
      end
      from public.card_prints card
      where card.id = p_card_print_id
    ),
    false
  );
$$;

create or replace function public.catalog_parent_gv_id_visible_to_request_v1(
  p_parent_gv_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when card.set_id is not null
          then public.catalog_set_visible_to_request_v1(card.set_id)
        else public.catalog_game_id_visible_to_request_v1(card.game_id)
      end
      from public.card_prints card
      where card.gv_id = p_parent_gv_id
    ),
    false
  );
$$;

revoke all on function public.catalog_set_visible_to_request_v1(uuid) from public;
revoke all on function public.catalog_card_print_visible_to_request_v1(uuid) from public;
revoke all on function public.catalog_parent_gv_id_visible_to_request_v1(text) from public;

grant execute on function public.catalog_set_visible_to_request_v1(uuid)
to anon, authenticated, service_role;
grant execute on function public.catalog_card_print_visible_to_request_v1(uuid)
to anon, authenticated, service_role;
grant execute on function public.catalog_parent_gv_id_visible_to_request_v1(text)
to anon, authenticated, service_role;

drop policy if exists sets_catalog_release_visibility_v1 on public.sets;
create policy sets_catalog_release_visibility_v1
on public.sets
as restrictive
for select
to public
using (public.catalog_set_visible_to_request_v1(id));

drop policy if exists card_prints_catalog_release_visibility_v1 on public.card_prints;
create policy card_prints_catalog_release_visibility_v1
on public.card_prints
as restrictive
for select
to public
using (public.catalog_card_print_visible_to_request_v1(id));

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
            and public.catalog_set_visible_to_request_v1(candidate.id)
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
  where public.catalog_card_print_visible_to_request_v1(card.id)
    and coalesce(
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
  text, text, text, text, text, text, integer, integer
) is
  'Set- and game-release-aware bounded canonical card search with suppression and language filtering.';

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
  select *
  from public.search_game_card_prints_v3(
    game_code_in,
    q,
    set_code_in,
    number_in,
    illustrator_in,
    'all',
    limit_in,
    offset_in
  );
$$;

comment on function public.search_game_card_prints_v2(
  text, text, text, text, text, integer, integer
) is
  'Backward-compatible set-release-aware wrapper over search_game_card_prints_v3.';

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
    and public.catalog_card_print_visible_to_request_v1(card.id)
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
  text, text, text, text, text, text, integer, integer
) is
  'Set- and game-release-aware V3-compatible search with exact GV-ID support.';

revoke all on function public.search_game_card_prints_v2(
  text, text, text, text, text, integer, integer
) from public;
revoke all on function public.search_game_card_prints_v3(
  text, text, text, text, text, text, integer, integer
) from public;
revoke all on function public.search_game_card_prints_v4(
  text, text, text, text, text, text, integer, integer
) from public;

grant execute on function public.search_game_card_prints_v2(
  text, text, text, text, text, integer, integer
) to anon, authenticated, service_role;
grant execute on function public.search_game_card_prints_v3(
  text, text, text, text, text, text, integer, integer
) to anon, authenticated, service_role;
grant execute on function public.search_game_card_prints_v4(
  text, text, text, text, text, text, integer, integer
) to anon, authenticated, service_role;

create or replace function public.get_public_set_card_counts_v1(
  p_set_codes text[]
)
returns table (
  set_code text,
  card_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_set_codes is null or cardinality(p_set_codes) = 0 then
    return;
  end if;

  if cardinality(p_set_codes) > 1000 then
    raise exception 'get_public_set_card_counts_v1 accepts at most 1000 set codes';
  end if;

  return query
  select
    card.set_code,
    count(*)::bigint
  from public.card_prints card
  where card.set_code = any(p_set_codes)
    and card.gv_id is not null
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and public.catalog_card_print_visible_to_request_v1(card.id)
  group by card.set_code
  order by card.set_code;
end;
$function$;

create or replace function public.get_public_set_catalog_facets_v1(
  p_set_codes text[]
)
returns table (
  set_code text,
  card_count bigint,
  cover_gv_id text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_set_codes is null or cardinality(p_set_codes) = 0 then
    return;
  end if;

  if cardinality(p_set_codes) > 1000 then
    raise exception 'get_public_set_catalog_facets_v1 accepts at most 1000 set codes';
  end if;

  return query
  select
    card.set_code,
    count(*)::bigint,
    min(card.gv_id) filter (
      where lower(trim(coalesce(card.image_source, ''))) = 'identity'
        and nullif(trim(coalesce(card.image_path, '')), '') is not null
    ) as cover_gv_id
  from public.card_prints card
  where card.set_code = any(p_set_codes)
    and card.gv_id is not null
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and public.catalog_card_print_visible_to_request_v1(card.id)
  group by card.set_code
  order by card.set_code;
end;
$function$;

revoke all on function public.get_public_set_card_counts_v1(text[])
from public, anon, authenticated, service_role;
grant execute on function public.get_public_set_card_counts_v1(text[])
to anon, authenticated, service_role;

revoke all on function public.get_public_set_catalog_facets_v1(text[])
from public, anon, authenticated, service_role;
grant execute on function public.get_public_set_catalog_facets_v1(text[])
to anon, authenticated, service_role;

comment on function public.get_public_set_card_counts_v1(text[]) is
  'Bounded set- and game-release-aware parent-card counts for exact set codes.';
comment on function public.get_public_set_catalog_facets_v1(text[]) is
  'Bounded set- and game-release-aware parent-card counts and deterministic hosted covers.';

notify pgrst, 'reload schema';

commit;
