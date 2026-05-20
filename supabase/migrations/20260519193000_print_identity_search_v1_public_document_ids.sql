-- PRINT_IDENTITY_SEARCH_V1 public document id patch
-- Remote apply of 20260519190000 exposed search_document_id values derived from internal UUIDs.
-- This patch keeps the same read model but rebuilds public document ids from public identifiers only.

create or replace view public.v_print_identity_search_documents_v1 as
with parent_docs as (
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
      cp.external_ids::text
    ))::text as search_text,
    case when cp.gv_id is not null then 20 else 10 end::integer as rank_bucket
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
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
    case when cpn.printing_gv_id is not null then 30 else 12 end::integer as rank_bucket
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
  'PRINT_IDENTITY_SEARCH_V1 read model. Contains public-safe parent print and child printing search documents; child rows route through parent card pages. search_document_id is derived from public identifiers only.';

revoke all on public.v_print_identity_search_documents_v1 from anon, authenticated;
grant select on public.v_print_identity_search_documents_v1 to service_role;
