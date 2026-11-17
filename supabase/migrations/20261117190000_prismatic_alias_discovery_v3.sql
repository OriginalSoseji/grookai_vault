-- Approved Prismatic provider lineage is retained; only discovery is projected.
-- PRISMATIC_ALIAS_DISCOVERY_READ_REPAIR_V3. Atomic final reader definitions.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;

create or replace function public.get_prismatic_discovery_exclusions_v1()
returns uuid[] language sql stable security definer set search_path = ''
as $function$
  select coalesce(array_agg(legacy.id order by legacy.id), array[]::uuid[])
  from public.card_print_identity_aliases alias
  join public.card_prints legacy on legacy.id = alias.legacy_card_print_id
  join public.card_prints canonical on canonical.id = alias.canonical_card_print_id
  join public.sets legacy_set on legacy_set.id = legacy.set_id
  join public.sets canonical_set on canonical_set.id = canonical.set_id
  where alias.active and alias.authority_status = 'approved'
    and alias.legacy_set_code = 'sv08.5' and alias.canonical_set_code = 'sv8pt5'
    and legacy.set_code = 'sv08.5' and canonical.set_code = 'sv8pt5'
    and legacy_set.code = 'sv08.5' and canonical_set.code = 'sv8pt5'
    and legacy_set.game = 'pokemon' and canonical_set.game = 'pokemon'
    and legacy.identity_domain = 'pokemon_eng_standard'
    and canonical.identity_domain = legacy.identity_domain
    and legacy.gv_id is not null and canonical.gv_id is not null
    and alias.created_from_audit = 'collectr_catalog_review_20261009'
    and alias.authority_decision ->> 'classification_sha256' = '87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7'
    and alias.authority_decision ->> 'collision_matrix_sha256' = '3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'
    and lower(regexp_replace(btrim(legacy.name), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(canonical.name), '\s+', ' ', 'g'))
    and coalesce(nullif(ltrim(upper(btrim(split_part(replace(legacy.number, '#', ''), '/', 1))), '0'), ''), '0')
      = coalesce(nullif(ltrim(upper(btrim(split_part(replace(canonical.number, '#', ''), '/', 1))), '0'), ''), '0')
    and coalesce(lower(btrim(legacy.variant_key)), '') = coalesce(lower(btrim(canonical.variant_key)), '')
    and coalesce(lower(btrim(legacy.printed_identity_modifier)), '') = coalesce(lower(btrim(canonical.printed_identity_modifier)), '')
    and public.catalog_card_print_visible_to_request_v1(legacy.id)
    and public.catalog_card_print_visible_to_request_v1(canonical.id)
    and not exists (
      select 1 from public.card_print_identity_aliases chained
      where chained.legacy_card_print_id = canonical.id and chained.active
    );
$function$;
revoke all on function public.get_prismatic_discovery_exclusions_v1() from public;
grant execute on function public.get_prismatic_discovery_exclusions_v1() to anon, authenticated, service_role;
comment on function public.get_prismatic_discovery_exclusions_v1() is
  'Visible approved Prismatic legacy aliases only; retained objects and their references are unchanged. No name-based inference or finish transfer.';

create or replace function public.resolve_prismatic_discovery_set_code_v1(p_code text, p_game_code text default null)
returns text language sql stable security definer set search_path = ''
as $function$
  select case
    when lower(btrim(p_code)) = 'sv08.5'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_prismatic_discovery_exclusions_v1()) = 180
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = 'sv08.5' and source_set.code = 'sv08.5' and source_set.game = 'pokemon') = 180
    then 'sv8pt5'
    else lower(btrim(p_code))
  end;
$function$;
revoke all on function public.resolve_prismatic_discovery_set_code_v1(text,text) from public;
grant execute on function public.resolve_prismatic_discovery_set_code_v1(text,text) to anon, authenticated, service_role;
comment on function public.resolve_prismatic_discovery_set_code_v1(text,text) is
  'Redirect only complete approved visible 180-parent Prismatic lineage. Partial, hidden, stale or unrelated evidence retains the requested code.';

create or replace view public.v_card_prints_discovery_v1 with (security_invoker=true) as
SELECT id,
    game_id,
    set_id,
    name,
    number,
    variant_key,
    rarity,
    image_url,
    tcgplayer_id,
    external_ids,
    updated_at,
    set_code,
    artist,
    regulation_mark,
    image_alt_url,
    image_source,
    variants,
    created_at,
    last_synced_at,
    print_identity_key,
    ai_metadata,
    image_hash,
    data_quality_flags,
    image_status,
    image_res,
    image_last_checked_at,
    printed_set_abbrev,
    printed_total,
    number_plain,
    gv_id,
    image_path,
    identity_domain,
    printed_identity_modifier,
    set_identity_model,
    representative_image_url,
    image_note
   FROM card_prints card
  WHERE (id <> ALL (( SELECT get_jungle_edition_discovery_exclusions_v1() AS get_jungle_edition_discovery_exclusions_v1)::uuid[]))
  and card.id <> all ((select public.get_prismatic_discovery_exclusions_v1())::uuid[]);

create or replace view public.v_card_printings_discovery_v1 with (security_invoker=true) as
SELECT id,
    card_print_id,
    finish_key,
    created_at,
    is_provisional,
    provenance_source,
    provenance_ref,
    created_by,
    printing_gv_id,
    image_source,
    image_path,
    image_url,
    image_alt_url,
    image_status,
    image_note
   FROM card_printings printing
  WHERE (card_print_id <> ALL (( SELECT get_jungle_edition_discovery_exclusions_v1() AS get_jungle_edition_discovery_exclusions_v1)::uuid[]))
  and printing.card_print_id <> all ((select public.get_prismatic_discovery_exclusions_v1())::uuid[]);

create or replace view public.v_card_search with (security_invoker=true) as
SELECT cp.id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.number AS number_raw,
    regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) AS number_digits,
        CASE
            WHEN (regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text) THEN lpad(regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
            ELSE NULL::text
        END AS number_padded,
        CASE
            WHEN (cp.number ~ '\d+\s*/\s*\d+'::text) THEN ((lpad(regexp_replace(cp.number, '^\D*?(\d+).*$'::text, '\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\d+).*$'::text, '\1'::text))
            ELSE NULL::text
        END AS number_slashed,
    COALESCE(cp.rarity, NULL::text) AS rarity,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS image_url,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS thumb_url,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS image_best,
        CASE
            WHEN (auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])) THEN pr.latest_price_cents
            ELSE NULL::integer
        END AS latest_price_cents,
        CASE
            WHEN ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])) AND (pr.latest_price_cents IS NOT NULL)) THEN ((pr.latest_price_cents)::numeric / 100.0)
            ELSE NULL::numeric
        END AS latest_price,
    lower(cp.name) AS name_lc,
    NULL::numeric AS search_rank,
    cp.representative_image_url,
    cp.image_status,
    cp.image_note,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS display_image_url,
        CASE
            WHEN (NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url)), ''::text) IS NOT NULL) THEN 'exact'::text
            WHEN (NULLIF(btrim(cp.representative_image_url), ''::text) IS NOT NULL) THEN 'representative'::text
            ELSE 'missing'::text
        END AS display_image_kind
   FROM (card_prints cp
     LEFT JOIN LATERAL ( SELECT (round((COALESCE(p.price_mid, p.price_high, p.price_low) * (100)::numeric)))::integer AS latest_price_cents
           FROM latest_card_prices_v p
          WHERE (p.card_id = cp.id)
          ORDER BY
                CASE
                    WHEN (lower(COALESCE(p.condition, ''::text)) = ANY (ARRAY['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text])) THEN 0
                    ELSE 1
                END, p.observed_at DESC NULLS LAST
         LIMIT 1) pr ON ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]))))
  where cp.id <> all ((select public.get_prismatic_discovery_exclusions_v1())::uuid[]);

create or replace view public.v_grookai_dex_card_prints_v1 with (security_invoker=true) as
SELECT ps.id AS species_id,
    ps.slug AS species_slug,
    ps.display_name AS species_display_name,
    ps.national_dex_number,
    cps.card_print_id,
    cp.gv_id,
    cp.name,
    cp.set_id,
    cp.set_code,
    s.name AS set_name,
    cp.number,
    cp.number_plain,
    cp.rarity,
    cp.variant_key,
    cp.image_url,
    cp.image_alt_url,
    cp.image_source,
    cp.image_path,
    cp.representative_image_url,
    cps.role,
    cps.counts_for_completion,
    cps.source,
    cps.confidence,
    cps.evidence,
    cps.active AS mapping_active
   FROM (((card_print_species cps
     JOIN pokemon_species ps ON ((ps.id = cps.species_id)))
     JOIN card_prints cp ON ((cp.id = cps.card_print_id)))
     LEFT JOIN sets s ON ((s.id = cp.set_id)))
  where cp.id <> all ((select public.get_prismatic_discovery_exclusions_v1())::uuid[]);

CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(p_game_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, game text, code text, name text, hero_image_url text, hero_image_source text, set_role text, catalog_set_type text, printed_set_abbrev text, printed_total integer, release_date date, created_at timestamp with time zone, card_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1() || public.get_prismatic_discovery_exclusions_v1();
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
    and card.id <> all(discovery_exclusions)
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

CREATE OR REPLACE FUNCTION public.get_search_set_catalog_v1(game_code_in text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'complete', count(*) <= 20000,
    'sets', coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]'::jsonb)
  )
  from (
    select id, code, name, printed_set_abbrev, printed_total, release_date, identity_model
    from public.sets
    where game = lower(trim(game_code_in))
      and (code <> 'sv08.5' or public.resolve_prismatic_discovery_set_code_v1(code, game) = code)
    order by id limit 20001
  ) s;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_visible_set_references_v1(code_in text, game_code_in text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, code text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select s.id, s.code from public.sets s
  where s.search_code_lower = (select public.resolve_prismatic_discovery_set_code_v1(code_in, game_code_in))
    and (nullif(lower(trim(game_code_in)), '') is null
      or s.game = lower(trim(game_code_in)))
  order by s.id;
$function$;

CREATE OR REPLACE FUNCTION public.search_game_card_prints_v4(game_code_in text, q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, illustrator_in text DEFAULT NULL::text, language_scope_in text DEFAULT 'all'::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS TABLE(id uuid, gv_id text, name text, number text, number_plain text, rarity text, artist text, image_url text, image_alt_url text, image_source text, image_path text, representative_image_url text, image_status text, image_note text, set_code text, printed_set_abbrev text, external_ids jsonb, variant_key text, printed_identity_modifier text, variants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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

  v_set_code := nullif(public.resolve_prismatic_discovery_set_code_v1(v_set_code, v_game_code), '');
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

CREATE OR REPLACE FUNCTION public.search_print_identity_v1(q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, object_type_in text DEFAULT NULL::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS TABLE(search_document_id text, object_type text, parent_gv_id text, printing_gv_id text, display_name text, display_discriminator text, route_path text, route_query text, matched_fields text[], rank_score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with prepared as not materialized (
    select
      lower(nullif(trim(q), '')) as q_norm,
      regexp_split_to_array(lower(coalesce(nullif(trim(q), ''), '')), '\s+') as q_tokens,
      (select nullif(public.resolve_prismatic_discovery_set_code_v1(set_code_in), '')) as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as number_digits_norm,
      lower(nullif(trim(object_type_in), '')) as object_type_norm,
      greatest(1, least(coalesce(limit_in, 50), 1000)) as result_limit,
      greatest(0, coalesce(offset_in, 0)) as result_offset
  ),
  parent_identity_seed as materialized (
    select cp.id
    from public.card_prints cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id = upper(p.q_norm)
  ),
  name_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and lower(cp.name) like '%' || p.q_norm || '%'
      and (p.set_code_norm is null or lower(cp.set_code) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by
      case when lower(cp.name) = p.q_norm then 0 else 1 end,
      cp.name,
      cp.gv_id
    limit greatest(
      100,
      (select (result_limit + result_offset) * 2 from prepared)
    )
  ),
  matching_sets as materialized (
    select s.id
    from public.sets s
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(s.code, '')) = p.q_norm
        or lower(coalesce(s.name, '')) like '%' || p.q_norm || '%'
      )
  ),
  set_seed as materialized (
    select cp.id
    from matching_sets matched
    join public.v_card_prints_discovery_v1 cp on cp.set_id = matched.id
    union
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is not null
      and lower(cp.set_code) = p.q_norm
  ),
  printing_identity_seed as materialized (
    select cp.id
    from public.card_printings cpn
    join public.card_prints cp on cp.id = cpn.card_print_id
    cross join prepared p
    where p.q_norm is not null
      and cpn.printing_gv_id = upper(p.q_norm)
  ),
  matched_finish_keys as materialized (
    select fk.key
    from public.finish_keys fk
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(fk.key) = p.q_norm
        or lower(coalesce(fk.label, '')) = p.q_norm
      )
  ),
  finish_seed as materialized (
    select cp.id
    from matched_finish_keys matched
    cross join lateral (
      select source.card_print_id
      from public.card_printings source
      where source.finish_key = matched.key
      offset 0
    ) cpn
    join public.v_card_prints_discovery_v1 cp on cp.id = cpn.card_print_id
  ),
  primary_seed as materialized (
    select id from parent_identity_seed
    union
    select id from name_seed
    union
    select id from printing_identity_seed
  ),
  name_seed_sufficient as materialized (
    select
      count(*) >= (select result_limit + result_offset from prepared) as sufficient
    from name_seed
  ),
  cameo_seed as materialized (
    select cp.id
    from public.v_card_print_cameos_public_v1 cameo
    join public.v_card_prints_discovery_v1 cp on cp.gv_id = cameo.gv_id
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(cameo.cameo_subject_name, '')) like '%' || p.q_norm || '%'
        or exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and token <> 'cameo'
            and lower(concat_ws(
              ' ',
              cameo.cameo_subject_name,
              cameo.pokemon_ndex,
              array_to_string(cameo.cameo_qualifiers, ' '),
              cameo.notes_raw
            )) like '%' || token || '%'
        )
      )
  ),
  fast_seed as materialized (
    select id from primary_seed
    union
    select id from set_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from finish_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from cameo_seed
    where not (select sufficient from name_seed_sufficient)
  ),
  filtered_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is null
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by cp.name, cp.gv_id
    limit greatest(
      5000,
      (select (result_limit + result_offset) * 20 from prepared)
    )
  ),
  fallback_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    left join public.sets s on s.id = cp.set_id
    cross join prepared p
    where p.q_norm is not null
      and not exists (select 1 from fast_seed)
      and (
        lower(concat_ws(
          ' ',
          cp.gv_id,
          cp.print_identity_key,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.set_code,
          s.name,
          cp.printed_set_abbrev,
          cp.rarity,
          cp.variant_key,
          cp.printed_identity_modifier,
          cp.external_ids::text
        )) like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and lower(concat_ws(
              ' ',
              cp.gv_id,
              cp.print_identity_key,
              cp.name,
              cp.number,
              cp.number_plain,
              cp.set_code,
              s.name,
              cp.printed_set_abbrev,
              cp.rarity,
              cp.variant_key,
              cp.printed_identity_modifier,
              cp.external_ids::text
            )) not like '%' || token || '%'
        )
      )
    order by cp.name, cp.gv_id
    limit 10000
  ),
  candidate_ids as materialized (
    select id from fast_seed
    union
    select id from filtered_seed
    union
    select id from fallback_seed
  ),
  candidate_cards as materialized (
    select cp.*, s.name as joined_set_name
    from candidate_ids candidate
    cross join lateral (
      select source.*
      from public.card_prints source
      where source.id = candidate.id
      offset 0
    ) cp
    left join public.sets s on s.id = cp.set_id
    cross join prepared p
    where cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
  ),
  cameo_agg as materialized (
    select
      cameo.gv_id,
      string_agg(
        lower(concat_ws(
          ' ',
          'cameo',
          case when cameo.cameo_subject_type = 'trainer' then 'trainer' else 'pokemon' end,
          cameo.cameo_subject_name,
          cameo.pokemon_ndex,
          array_to_string(cameo.cameo_qualifiers, ' '),
          cameo.notes_raw
        )),
        ' '
        order by cameo.cameo_subject_name
      ) as cameo_search_text,
      array_agg(
        distinct (
          case when cameo.cameo_subject_type = 'trainer' then 'Cameo trainer: ' else 'Cameo: ' end
          || cameo.cameo_subject_name
          || case
            when array_length(cameo.cameo_qualifiers, 1) > 0
              then ' · ' || array_to_string(cameo.cameo_qualifiers, ', ')
            else ''
          end
        )
      ) as cameo_labels
    from public.v_card_print_cameos_public_v1 cameo
    join candidate_cards cp on cp.gv_id = cameo.gv_id
    group by cameo.gv_id
  ),
  parent_docs as (
    select
      ('parent:' || cp.gv_id)::text as search_document_id,
      'parent_print'::text as object_type,
      cp.gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      null::text as printing_gv_id,
      cp.name::text as display_name,
      null::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      null::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.external_ids::text,
        cameo.cameo_search_text
      ))::text as search_text,
      20::integer as rank_bucket,
      cameo.cameo_search_text::text as cameo_search_text,
      cameo.cameo_labels::text[] as cameo_labels
    from candidate_cards cp
    left join cameo_agg cameo on cameo.gv_id = cp.gv_id
  ),
  child_docs as (
    select
      ('child:' || cpn.printing_gv_id)::text as search_document_id,
      'child_printing'::text as object_type,
      cpn.printing_gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      cpn.printing_gv_id::text as printing_gv_id,
      cp.name::text as display_name,
      coalesce(fk.label, cpn.finish_key)::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      ('printing=' || cpn.printing_gv_id)::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cpn.printing_gv_id,
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cpn.finish_key,
        fk.label,
        cp.external_ids::text
      ))::text as search_text,
      30::integer as rank_bucket,
      null::text as cameo_search_text,
      null::text[] as cameo_labels
    from candidate_cards cp
    cross join lateral (
      select source.*
      from public.card_printings source
      where source.card_print_id = cp.id
        and source.printing_gv_id is not null
      offset 0
    ) cpn
    left join public.finish_keys fk on fk.key = cpn.finish_key
  ),
  docs as materialized (
    select * from parent_docs
    union all
    select * from child_docs
  ),
  scored as (
    select
      d.search_document_id,
      d.object_type,
      d.parent_gv_id,
      d.printing_gv_id,
      d.display_name,
      case
        when p.q_norm is not null
          and d.cameo_search_text is not null
          and (
            d.cameo_search_text like '%' || p.q_norm || '%'
            or exists (
              select 1
              from unnest(p.q_tokens) token
              where token <> ''
                and token <> 'cameo'
                and d.cameo_search_text like '%' || token || '%'
            )
          )
          then coalesce(d.cameo_labels[1], 'Cameo')
        else d.display_discriminator
      end as display_discriminator,
      d.route_path,
      d.route_query,
      array_remove(array[
        case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 'public_id' end,
        case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 'parent_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 'printing_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 'name' end,
        case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 'search_text' end,
        case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 'cameo_search_text' end,
        case when p.q_norm is not null and exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
        ) then 'cameo_token' end,
        case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 'number' end,
        case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 'set_code' end
      ], null)::text[] as matched_fields,
      (
        d.rank_bucket
        + case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 10000 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 9500 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 9000 else 0 end
        + case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 1600 else 0 end
        + case when p.number_digits_norm is not null and d.number_padded = lpad(p.number_digits_norm, 3, '0') then 1100 else 0 end
        + case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 1200 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) = p.q_norm then 1800 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 800 else 0 end
        + case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 400 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 120
            from unnest(p.q_tokens) token
            where token <> '' and d.search_text like '%' || token || '%'
          )
          else 0
        end
        + case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 300 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 70
            from unnest(p.q_tokens) token
            where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
          )
          else 0
        end
        + case
          when p.q_norm is not null and 'cameo' = any(p.q_tokens) and d.cameo_search_text is not null then 90
          else 0
        end
      )::integer as rank_score
    from docs d
    cross join prepared p
    where (p.object_type_norm is null or d.object_type = p.object_type_norm)
      and (
        p.q_norm is null
        or lower(coalesce(d.public_id, '')) = p.q_norm
        or lower(coalesce(d.parent_gv_id, '')) = p.q_norm
        or lower(coalesce(d.printing_gv_id, '')) = p.q_norm
        or d.search_text like '%' || p.q_norm || '%'
        or d.cameo_search_text like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and d.search_text not like '%' || token || '%'
        )
      )
  )
  select
    search_document_id,
    object_type,
    parent_gv_id,
    printing_gv_id,
    display_name,
    display_discriminator,
    route_path,
    route_query,
    matched_fields,
    rank_score
  from scored
  where rank_score > 0
  order by rank_score desc, display_name asc, parent_gv_id asc, coalesce(printing_gv_id, '') asc
  limit (select result_limit from prepared)
  offset (select result_offset from prepared);
$function$;

CREATE OR REPLACE FUNCTION public.search_card_prints_v1(q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS SETOF v_card_search
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with discovery as materialized (
    select public.get_jungle_edition_discovery_exclusions_v1() as excluded
  ), normalized as (
    select
      nullif(trim(q), '') as q_norm,
      (select nullif(public.resolve_prismatic_discovery_set_code_v1(set_code_in), '')) as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as num_digits
  ),
  prepared as (
    select
      q_norm,
      set_code_norm,
      num_digits,
      case when num_digits is null then null else lpad(num_digits, 3, '0') end as num_padded
    from normalized
  )
  select v.*
  from public.v_card_search v
  cross join prepared p
  where v.id <> all ((select excluded from discovery)::uuid[])
    and (p.set_code_norm is null or lower(v.set_code) = p.set_code_norm)
    and (
      p.num_digits is null
      or v.number_digits = p.num_digits
      or v.number_padded = p.num_padded
      or (v.number_slashed is not null and v.number_slashed like p.num_padded || '/%')
    )
    and (
      p.q_norm is null or v.name ilike '%' || p.q_norm || '%'
    )
  order by
    case
      when p.num_digits is not null and v.number_digits = p.num_digits then 0
      when p.num_digits is not null and v.number_padded = p.num_padded then 1
      when p.num_digits is not null and v.number_slashed like p.num_padded || '/%' then 2
      else 3
    end,
    case when p.set_code_norm is not null and lower(v.set_code) = p.set_code_norm then 0 else 1 end,
    v.name asc,
    v.id asc
  limit greatest(1, coalesce(limit_in, 50))
  offset greatest(0, coalesce(offset_in, 0));
$function$;

notify pgrst, 'reload schema';
commit;
