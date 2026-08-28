-- PRINT_IDENTITY_SEARCH_CANDIDATE_FIRST_V1
-- Preserve the PRINT_IDENTITY_SEARCH_V1 response contract while avoiding a
-- full expansion and sort of every parent and child search document.

begin;

create index if not exists card_printings_finish_key_idx
  on public.card_printings (finish_key);

create or replace function public.search_print_identity_v1(
  q text default null,
  set_code_in text default null,
  number_in text default null,
  object_type_in text default null,
  limit_in integer default 50,
  offset_in integer default 0
)
returns table (
  search_document_id text,
  object_type text,
  parent_gv_id text,
  printing_gv_id text,
  display_name text,
  display_discriminator text,
  route_path text,
  route_query text,
  matched_fields text[],
  rank_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with prepared as not materialized (
    select
      lower(nullif(trim(q), '')) as q_norm,
      regexp_split_to_array(lower(coalesce(nullif(trim(q), ''), '')), '\s+') as q_tokens,
      lower(nullif(trim(set_code_in), '')) as set_code_norm,
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
    from public.card_prints cp
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(cp.name) like '%' || p.q_norm || '%'
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
    join public.card_prints cp on cp.set_id = matched.id
    union
    select cp.id
    from public.card_prints cp
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
    join public.card_prints cp on cp.id = cpn.card_print_id
  ),
  printing_seed as materialized (
    select id from printing_identity_seed
    union
    select id from finish_seed
  ),
  cameo_seed as materialized (
    select cp.id
    from public.v_card_print_cameos_public_v1 cameo
    join public.card_prints cp on cp.gv_id = cameo.gv_id
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
    select id from parent_identity_seed
    union
    select id from name_seed
    union
    select id from set_seed
    union
    select id from printing_seed
    union
    select id from cameo_seed
  ),
  filtered_seed as materialized (
    select cp.id
    from public.card_prints cp
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
    from public.card_prints cp
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
$$;

comment on function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) is
  'PRINT_IDENTITY_SEARCH_CANDIDATE_FIRST_V1. Preserves V1 search output and release visibility while expanding only indexed identity/name/set/printing/cameo candidates.';

revoke all on function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
