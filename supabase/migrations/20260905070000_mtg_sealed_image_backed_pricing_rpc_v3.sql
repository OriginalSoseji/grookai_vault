-- MTG_SEALED_IMAGE_BACKED_PRICING_RPC_V3
-- Signed-in MTG sealed read model requiring fresh exact pricing and exact
-- self-hosted image authority. This migration changes no data or visibility.

begin;

create or replace function public.get_active_sealed_product_pricing_v3(
  p_game_key text,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  price_release_id uuid,
  image_release_id uuid,
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
  evidence_fingerprint text,
  image_storage_bucket text,
  image_object_path text,
  image_content_sha256 text,
  image_mime text,
  image_width integer,
  image_height integer,
  image_bytes bigint,
  image_assertion_fingerprint text,
  image_member_fingerprint text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    price_pointer.release_id,
    image_pointer.image_release_id,
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
    price_member.member_fingerprint,
    image_object.storage_bucket,
    image_object.object_path,
    image_object.content_sha256,
    image_object.image_mime,
    image_object.image_width,
    image_object.image_height,
    image_object.image_bytes,
    image_assertion.assertion_fingerprint,
    image_member.member_fingerprint
  from public.sealed_product_release_pointer price_pointer
  join public.sealed_product_releases price_release
    on price_release.id = price_pointer.release_id
   and price_release.game_key = price_pointer.game_key
   and price_release.release_state = 'frozen'
  join public.sealed_product_release_members price_member
    on price_member.release_id = price_release.id
   and price_member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = price_member.qualification_id
   and qualification.variant_id = price_member.variant_id
   and qualification.source_mapping_id = price_member.source_mapping_id
   and qualification.qualification_status = price_member.qualification_status
  join public.sealed_product_variants variant
    on variant.id = price_member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
   and family.game_key = price_release.game_key
  join public.sealed_product_source_mappings mapping
    on mapping.id = price_member.source_mapping_id
   and mapping.variant_id = price_member.variant_id
  join public.sealed_product_image_release_pointer image_pointer
    on image_pointer.game_key = price_pointer.game_key
  join public.sealed_product_image_releases image_release
    on image_release.id = image_pointer.image_release_id
   and image_release.game_key = image_pointer.game_key
   and image_release.release_state = 'frozen'
   and image_release.source_price_release_id = price_pointer.release_id
  join public.sealed_product_image_release_members image_member
    on image_member.image_release_id = image_release.id
   and image_member.game_key = image_release.game_key
   and image_member.variant_id = price_member.variant_id
  join public.sealed_product_variant_image_assertions image_assertion
    on image_assertion.id = image_member.image_assertion_id
   and image_assertion.game_key = image_member.game_key
   and image_assertion.variant_id = image_member.variant_id
   and image_assertion.source_mapping_id = price_member.source_mapping_id
   and image_assertion.assertion_state = 'exact_verified'
  join public.sealed_product_image_evidence image_evidence
    on image_evidence.id = image_assertion.image_evidence_id
   and image_evidence.game_key = image_assertion.game_key
   and image_evidence.variant_id = image_assertion.variant_id
   and image_evidence.source_mapping_id = image_assertion.source_mapping_id
   and image_evidence.source_release_member_id = price_member.id
   and image_evidence.classification in (
     'exact_image_ready', 'shared_bytes_exact_variant'
   )
  join public.sealed_product_image_objects image_object
    on image_object.id = image_assertion.image_object_id
   and image_object.game_key = image_assertion.game_key
   and image_object.content_sha256 = image_evidence.content_sha256
   and image_object.storage_readback_sha256 = image_evidence.content_sha256
   and image_object.image_mime = image_evidence.image_mime
   and image_object.image_width = image_evidence.image_width
   and image_object.image_height = image_evidence.image_height
   and image_object.image_bytes = image_evidence.image_bytes
  where coalesce(auth.role(), '') in ('authenticated', 'service_role')
    and lower(btrim(p_game_key)) = 'mtg'
    and family.game_key = lower(btrim(p_game_key))
    and public.catalog_game_visible_to_request_v1(family.game_key)
    and public.sealed_product_game_visible_to_request_v1(family.game_key)
    and mapping.source_provider = 'tcgplayer'
    and variant.language_code = 'en'
    and qualification.source_subtype_name_normalized = 'normal'
    and qualification.currency = 'USD'
    and qualification.observed_on >= current_date - 7
    and qualification.observed_on <= current_date
    and (qualification.qualification_evidence #>> '{observation,market_price}')
      is not null
    and (qualification.qualification_evidence #>> '{observation,market_price}')::numeric
      > 0
    and image_object.storage_bucket = 'user-card-images'
    and image_object.object_path like 'sealed/' || family.game_key || '/sha256/%'
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

revoke all on function public.get_active_sealed_product_pricing_v3(
  text, text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.get_active_sealed_product_pricing_v3(
  text, text, integer, integer
) to authenticated, service_role;

comment on function public.get_active_sealed_product_pricing_v3(
  text, text, integer, integer
) is
  'Signed-in sealed pricing read model. Returns only fresh exact prices with exact self-hosted images from image and price releases bound to the same frozen authority.';

commit;
