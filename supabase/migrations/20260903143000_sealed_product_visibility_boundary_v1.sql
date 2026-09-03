-- SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1
-- Separates sealed-product visibility from canonical card-catalog visibility.
-- Existing active sealed games preserve their current catalog visibility;
-- MTG sealed starts hidden and requires an independent release decision.

begin;

create table public.sealed_product_game_release_controls (
  game_key text primary key references public.games(code) on delete restrict,
  release_status text not null default 'hidden'
    check (release_status in ('hidden', 'signed_in', 'public')),
  release_version text not null,
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  activated_at timestamptz null,
  activated_by text null,
  updated_at timestamptz not null default now(),
  constraint sealed_product_game_release_controls_key_check
    check (game_key = lower(game_key) and btrim(game_key) <> '')
);

comment on table public.sealed_product_game_release_controls is
  'Service-owned release boundary for sealed-product reads. Absence or hidden status denies visibility independently from card catalog release.';

alter table public.sealed_product_game_release_controls enable row level security;
alter table public.sealed_product_game_release_controls force row level security;

revoke all on table public.sealed_product_game_release_controls
from public, anon, authenticated, service_role;

grant select, insert, update on table public.sealed_product_game_release_controls
to service_role;

create policy sealed_product_game_release_controls_service_role_all
on public.sealed_product_game_release_controls
for all to service_role using (true) with check (true);

insert into public.sealed_product_game_release_controls (
  game_key, release_status, release_version, evidence,
  activated_at, activated_by
)
select
  pointer.game_key,
  case
    when catalog.release_status in ('signed_in', 'public')
      then catalog.release_status
    else 'hidden'
  end,
  'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_PRESERVED_ACTIVE',
  jsonb_build_object(
    'source', 'existing_active_sealed_pointer',
    'catalog_release_status', catalog.release_status,
    'preserved_behavior', true
  ),
  case when catalog.release_status in ('signed_in', 'public') then now() end,
  case when catalog.release_status in ('signed_in', 'public')
    then 'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1' end
from public.sealed_product_release_pointer pointer
left join public.catalog_game_release_controls catalog
  on catalog.game_code = pointer.game_key
on conflict (game_key) do nothing;

insert into public.sealed_product_game_release_controls (
  game_key, release_status, release_version, evidence
)
values (
  'mtg',
  'hidden',
  'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_MTG_HIDDEN',
  jsonb_build_object(
    'default', 'fail_closed',
    'sealed_payload_apply_authorizes_visibility', false,
    'catalog_release_authorizes_sealed_visibility', false
  )
)
on conflict (game_key) do nothing;

create function public.sealed_product_game_visible_to_request_v1(p_game_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.sealed_product_game_release_controls control
    where control.game_key = lower(btrim(p_game_key))
      and (
        control.release_status = 'public'
        or (
          control.release_status = 'signed_in'
          and coalesce(auth.role(), '') in ('authenticated', 'service_role')
        )
      )
  );
$$;

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
    (qualification.qualification_evidence #>> '{observation,market_price}')::numeric,
    qualification.id,
    member.member_fingerprint
  from public.sealed_product_release_pointer pointer
  join public.sealed_product_releases release
    on release.id = pointer.release_id
   and release.game_key = pointer.game_key
   and release.release_state = 'frozen'
  join public.sealed_product_release_members member
    on member.release_id = release.id
   and member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = member.qualification_id
   and qualification.variant_id = member.variant_id
   and qualification.source_mapping_id = member.source_mapping_id
   and qualification.qualification_status = member.qualification_status
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
   and family.game_key = release.game_key
  join public.sealed_product_source_mappings mapping
    on mapping.id = member.source_mapping_id
   and mapping.variant_id = member.variant_id
  where public.catalog_game_visible_to_request_v1(family.game_key)
    and public.sealed_product_game_visible_to_request_v1(family.game_key)
    and (qualification.qualification_evidence #>> '{observation,market_price}') is not null
    and (
      nullif(btrim(p_query), '') is null
      or variant.canonical_name ilike '%' || btrim(p_query) || '%'
      or family.canonical_name ilike '%' || btrim(p_query) || '%'
      or mapping.source_product_name ilike '%' || btrim(p_query) || '%'
    )
  order by family.game_key, variant.canonical_name, variant.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_active_sealed_product_pricing_v2(
  p_game_key text,
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
    (qualification.qualification_evidence #>> '{observation,market_price}')::numeric,
    qualification.id,
    member.member_fingerprint
  from public.sealed_product_release_pointer pointer
  join public.sealed_product_releases release
    on release.id = pointer.release_id
   and release.game_key = pointer.game_key
   and release.release_state = 'frozen'
  join public.sealed_product_release_members member
    on member.release_id = release.id
   and member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = member.qualification_id
   and qualification.variant_id = member.variant_id
   and qualification.source_mapping_id = member.source_mapping_id
   and qualification.qualification_status = member.qualification_status
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
   and family.game_key = release.game_key
  join public.sealed_product_source_mappings mapping
    on mapping.id = member.source_mapping_id
   and mapping.variant_id = member.variant_id
  where family.game_key = lower(btrim(p_game_key))
    and public.catalog_game_visible_to_request_v1(family.game_key)
    and public.sealed_product_game_visible_to_request_v1(family.game_key)
    and (qualification.qualification_evidence #>> '{observation,market_price}') is not null
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

revoke all on function public.sealed_product_game_visible_to_request_v1(text)
from public, anon, authenticated, service_role;
revoke all on function public.get_active_sealed_product_pricing_v1(
  text, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.get_active_sealed_product_pricing_v2(
  text, text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.sealed_product_game_visible_to_request_v1(text)
to authenticated, service_role;
grant execute on function public.get_active_sealed_product_pricing_v1(
  text, integer, integer
) to authenticated, service_role;
grant execute on function public.get_active_sealed_product_pricing_v2(
  text, text, integer, integer
) to authenticated, service_role;

commit;
