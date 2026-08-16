-- SEALED_PRODUCT_RELEASE_QUALIFICATION_BINDING_V1
-- Binds every release member to exact qualified pricing evidence and exposes
-- a bounded, release-controlled signed-in read interface.

begin;

alter table public.sealed_product_pricing_lane_qualifications
  add constraint sealed_product_pricing_release_binding_unique
  unique (id, variant_id, source_mapping_id, qualification_status);

alter table public.sealed_product_release_members
  add column qualification_id uuid,
  add column qualification_status text not null default 'qualified_exact',
  add constraint sealed_product_release_members_qualified_status_check
    check (qualification_status = 'qualified_exact'),
  add constraint sealed_product_release_members_qualification_binding_fk
    foreign key (
      qualification_id,
      variant_id,
      source_mapping_id,
      qualification_status
    ) references public.sealed_product_pricing_lane_qualifications (
      id,
      variant_id,
      source_mapping_id,
      qualification_status
    ) on delete restrict;

alter table public.sealed_product_release_members
  alter column qualification_id set not null;

alter table public.sealed_product_release_members
  add constraint sealed_product_release_members_release_qualification_unique
  unique (release_id, qualification_id);

create index sealed_product_release_members_qualification_idx
  on public.sealed_product_release_members (qualification_id);

create or replace function public.get_active_sealed_product_pricing_v1(
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  release_id uuid,
  family_id uuid,
  variant_id uuid,
  game_key text,
  family_key text,
  variant_key text,
  canonical_name text,
  package_form text,
  language_code text,
  region_code text,
  edition text,
  wave text,
  release_date date,
  source_provider text,
  source_product_id bigint,
  source_product_name text,
  observed_on date,
  currency text,
  market_price numeric,
  qualification_id uuid,
  evidence_fingerprint text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    pointer.release_id,
    family.id,
    variant.id,
    family.game_key,
    family.family_key,
    variant.variant_key,
    variant.canonical_name,
    variant.package_form,
    variant.language_code,
    variant.region_code,
    variant.edition,
    variant.wave,
    variant.release_date,
    mapping.source_provider,
    mapping.source_product_id,
    mapping.source_product_name,
    qualification.observed_on,
    qualification.currency,
    (qualification.qualification_evidence #>>
      '{observation,market_price}')::numeric,
    qualification.id,
    member.member_fingerprint
  from public.sealed_product_release_pointer pointer
  join public.sealed_product_releases release
    on release.id = pointer.release_id
   and release.release_state = 'frozen'
  join public.sealed_product_release_members member
    on member.release_id = release.id
   and member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = member.qualification_id
   and qualification.variant_id = member.variant_id
   and qualification.source_mapping_id = member.source_mapping_id
   and qualification.qualification_status = member.qualification_status
  join public.sealed_product_variants variant
    on variant.id = member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
  join public.sealed_product_source_mappings mapping
    on mapping.id = member.source_mapping_id
   and mapping.variant_id = member.variant_id
  where pointer.singleton
    and public.catalog_game_visible_to_request_v1(family.game_key)
    and (qualification.qualification_evidence #>>
      '{observation,market_price}') is not null
    and (
      nullif(btrim(p_query), '') is null
      or variant.canonical_name ilike '%' || btrim(p_query) || '%'
      or family.canonical_name ilike '%' || btrim(p_query) || '%'
      or mapping.source_product_name ilike '%' || btrim(p_query) || '%'
    )
  order by variant.canonical_name, variant.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_active_sealed_product_pricing_v1(
  text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.get_active_sealed_product_pricing_v1(
  text, integer, integer
) to authenticated, service_role;

commit;
