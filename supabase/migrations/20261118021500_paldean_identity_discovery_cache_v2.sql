-- Evaluate the existing discovery membership once per identity search.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
CREATE OR REPLACE FUNCTION public.search_print_identity_v1(q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, object_type_in text DEFAULT NULL::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS TABLE(search_document_id text, object_type text, parent_gv_id text, printing_gv_id text, display_name text, display_discriminator text, route_path text, route_query text, matched_fields text[], rank_score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with discovery_ids as materialized (
    select id from public.v_card_prints_discovery_v1
  ),
  prismatic_query as materialized (
    select case
      when lower(nullif(trim(q), '')) ~ '(^|[[:space:]])sv08[.]5([[:space:]]|$)'
      then regexp_replace(lower(nullif(trim(q), '')),
        '(^|[[:space:]])sv08[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_prismatic_discovery_set_code_v1('sv08.5'), 'g')
      else lower(nullif(trim(q), ''))
    end as query_text
  ),
  normalized_query as materialized (
    select case
      when prismatic_query.query_text ~ '(^|[[:space:]])sv04[.]5([[:space:]]|$)'
      then regexp_replace(prismatic_query.query_text,
        '(^|[[:space:]])sv04[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('sv04.5'), 'g')
      else prismatic_query.query_text
    end as query_text,
      (select case when lower(trim(q)) like 'gv-%' then nullif(lower(trim(set_code_in)), '')
        else nullif(public.resolve_prismatic_discovery_set_code_v1(set_code_in), '') end) as set_code_norm
    from prismatic_query
  ),
  prepared as not materialized (
    select
      normalized_query.query_text as q_norm,
      regexp_split_to_array(coalesce(normalized_query.query_text, ''), '\s+') as q_tokens,
      normalized_query.set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as number_digits_norm,
      lower(nullif(trim(object_type_in), '')) as object_type_norm,
      greatest(1, least(coalesce(limit_in, 50), 1000)) as result_limit,
      greatest(0, coalesce(offset_in, 0)) as result_offset
    from normalized_query
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
    from (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp
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
    join (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp on cp.set_id = matched.id
    union
    select cp.id
    from (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp
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
    join (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp on cp.id = cpn.card_print_id
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
    join (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp on cp.gv_id = cameo.gv_id
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
    from (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp
    cross join prepared p
    where (select q_norm from prepared) is null
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
    from (select discovery_source.* from public.card_prints discovery_source where discovery_source.id in (select id from discovery_ids)) cp
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
notify pgrst,'reload schema';
commit;
