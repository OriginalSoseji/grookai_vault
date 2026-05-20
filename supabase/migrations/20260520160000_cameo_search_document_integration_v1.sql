-- CAMEO_SEARCH_V1 Phase 8
-- Draft DB search document integration for approved cameo metadata.
--
-- This migration is read-model only:
-- - extends parent print search documents with cameo tokens and labels
-- - keeps cameo matches routed to /card/<parent_gv_id>
-- - keeps cameo scoring below direct identity / finish / public-id matches
-- - does not modify card identity, Species Dex, scanner, pricing, or UI surfaces

create or replace view public.v_print_identity_search_documents_v1 as
with cameo_agg as (
  select
    c.gv_id,
    string_agg(
      lower(concat_ws(
        ' ',
        'cameo',
        case when c.cameo_subject_type = 'trainer' then 'trainer' else 'pokemon' end,
        c.cameo_subject_name,
        c.pokemon_ndex,
        array_to_string(c.cameo_qualifiers, ' '),
        c.notes_raw
      )),
      ' '
      order by c.cameo_subject_name
    ) as cameo_search_text,
    array_agg(
      distinct (
        case
          when c.cameo_subject_type = 'trainer' then 'Cameo trainer: '
          else 'Cameo: '
        end
        || c.cameo_subject_name
        || case
          when array_length(c.cameo_qualifiers, 1) > 0
            then ' · ' || array_to_string(c.cameo_qualifiers, ', ')
          else ''
        end
      )
    ) as cameo_labels
  from public.v_card_print_cameos_public_v1 c
  group by c.gv_id
),
parent_docs as (
  select
    ('parent:' || cp.gv_id)::text as search_document_id,
    'parent_print'::text as object_type,
    cp.id as card_print_id,
    null::uuid as card_printing_id,
    cp.gv_id::text as public_id,
    cp.gv_id::text as parent_gv_id,
    null::text as printing_gv_id,
    cp.name::text as display_name,
    null::text as display_discriminator,
    ('/card/' || cp.gv_id)::text as route_path,
    null::text as route_query,
    cp.name::text as name,
    cp.number::text as number,
    cp.number_plain::text as number_plain,
    regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
    case
      when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
      else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
    end as number_padded,
    cp.set_code::text as set_code,
    s.name::text as set_name,
    cp.printed_set_abbrev::text as printed_set_abbrev,
    cp.rarity::text as rarity,
    cp.variant_key::text as variant_key,
    cp.printed_identity_modifier::text as printed_identity_modifier,
    null::text as finish_key,
    null::text as finish_label,
    cp.print_identity_key::text as print_identity_key,
    cp.external_ids as external_ids,
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
      cp.external_ids::text,
      ca.cameo_search_text
    ))::text as search_text,
    case when cp.gv_id is not null then 20 else 10 end::integer as rank_bucket,
    ca.cameo_search_text::text as cameo_search_text,
    ca.cameo_labels::text[] as cameo_labels
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  left join cameo_agg ca on ca.gv_id = cp.gv_id
  where cp.gv_id is not null
),
child_docs as (
  select
    ('child:' || cpn.printing_gv_id)::text as search_document_id,
    'child_printing'::text as object_type,
    cp.id as card_print_id,
    cpn.id as card_printing_id,
    cpn.printing_gv_id::text as public_id,
    cp.gv_id::text as parent_gv_id,
    cpn.printing_gv_id::text as printing_gv_id,
    cp.name::text as display_name,
    coalesce(fk.label, cpn.finish_key)::text as display_discriminator,
    ('/card/' || cp.gv_id)::text as route_path,
    ('printing=' || cpn.printing_gv_id)::text as route_query,
    cp.name::text as name,
    cp.number::text as number,
    cp.number_plain::text as number_plain,
    regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
    case
      when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
      else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
    end as number_padded,
    cp.set_code::text as set_code,
    s.name::text as set_name,
    cp.printed_set_abbrev::text as printed_set_abbrev,
    cp.rarity::text as rarity,
    cp.variant_key::text as variant_key,
    cp.printed_identity_modifier::text as printed_identity_modifier,
    cpn.finish_key::text as finish_key,
    fk.label::text as finish_label,
    cp.print_identity_key::text as print_identity_key,
    cp.external_ids as external_ids,
    lower(concat_ws(
      ' ',
      cpn.printing_gv_id,
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
      cpn.finish_key,
      fk.label,
      cp.external_ids::text
    ))::text as search_text,
    case when cpn.printing_gv_id is not null then 30 else 12 end::integer as rank_bucket,
    null::text as cameo_search_text,
    null::text[] as cameo_labels
  from public.card_printings cpn
  join public.card_prints cp on cp.id = cpn.card_print_id
  left join public.finish_keys fk on fk.key = cpn.finish_key
  left join public.sets s on s.id = cp.set_id
  where cp.gv_id is not null
)
select * from parent_docs
union all
select * from child_docs;

comment on view public.v_print_identity_search_documents_v1 is
  'PRINT_IDENTITY_SEARCH_V1 + CAMEO_SEARCH_V1 read model. Contains public-safe parent print, child printing, and parent-only cameo tokens. Child rows route through parent card pages; cameo metadata is descriptive search context, not identity.';

revoke all on public.v_print_identity_search_documents_v1 from anon, authenticated;
grant select on public.v_print_identity_search_documents_v1 to service_role;

create or replace function public.search_print_identity_v1(
  q text default null,
  set_code_in text default null,
  number_in text default null,
  object_type_in text default null,
  limit_in int default 50,
  offset_in int default 0
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
set search_path to 'public'
as $$
  with prepared as (
    select
      lower(nullif(trim(q), '')) as q_norm,
      regexp_split_to_array(lower(coalesce(nullif(trim(q), ''), '')), '\s+') as q_tokens,
      lower(nullif(trim(set_code_in), '')) as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as number_digits_norm,
      lower(nullif(trim(object_type_in), '')) as object_type_norm
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
          then coalesce(
            (
              select
                case
                  when c.cameo_subject_type = 'trainer' then 'Cameo trainer: '
                  else 'Cameo: '
                end
                || c.cameo_subject_name
                || case
                  when array_length(c.cameo_qualifiers, 1) > 0
                    then ' · ' || array_to_string(c.cameo_qualifiers, ', ')
                  else ''
                end
              from public.v_card_print_cameos_public_v1 c
              where c.gv_id = d.parent_gv_id
                and exists (
                  select 1
                  from unnest(p.q_tokens) token
                  where token <> ''
                    and token <> 'cameo'
                    and lower(concat_ws(
                      ' ',
                      c.cameo_subject_name,
                      c.pokemon_ndex,
                      array_to_string(c.cameo_qualifiers, ' '),
                      c.notes_raw
                    )) like '%' || token || '%'
                )
              order by
                case
                  when lower(c.cameo_subject_name) = any(p.q_tokens) then 0
                  else 1
                end,
                c.cameo_subject_name
              limit 1
            ),
            d.cameo_labels[1],
            'Cameo'
          )
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
        + case
            when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 300
            else 0
          end
        + case
            when p.q_norm is not null then (
              select count(*)::integer * 70
              from unnest(p.q_tokens) token
              where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
            )
            else 0
          end
        + case
            when p.q_norm is not null
              and 'cameo' = any(p.q_tokens)
              and d.cameo_search_text is not null
              then 90
            else 0
          end
      )::integer as rank_score
    from public.v_print_identity_search_documents_v1 d
    cross join prepared p
    where
      (p.object_type_norm is null or d.object_type = p.object_type_norm)
      and (p.set_code_norm is null or lower(coalesce(d.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or d.number_digits = p.number_digits_norm
        or d.number_padded = lpad(p.number_digits_norm, 3, '0')
      )
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
  limit greatest(1, coalesce(limit_in, 50))
  offset greatest(0, coalesce(offset_in, 0));
$$;

grant execute on function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) to anon, authenticated, service_role;
