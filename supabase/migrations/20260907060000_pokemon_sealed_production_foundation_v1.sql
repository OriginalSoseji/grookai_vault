-- POKEMON_SEALED_PRODUCTION_FOUNDATION_V1
-- Source product evidence cannot establish every vintage manufacturer.
-- Preserve existing values and represent missing manufacturer authority as NULL.
begin;
set local lock_timeout = '5s';
alter table public.sealed_product_families alter column manufacturer_name drop not null;
insert into public.sealed_product_game_release_controls
  (game_key,release_status,release_version,evidence,activated_by)
values ('pokemon','hidden','POKEMON_SEALED_PRODUCTION_V1',
  '{"authority":"founder_end_to_end_pokemon_sealed_request","visibility":"hidden"}'::jsonb,
  'POKEMON_SEALED_PRODUCTION_V1')
on conflict (game_key) do nothing;

create or replace function public.get_active_pokemon_sealed_pricing_v1(
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
    and lower(btrim(p_game_key)) = 'pokemon'
    and family.game_key = lower(btrim(p_game_key))
    and public.catalog_game_visible_to_request_v1(family.game_key)
    and public.sealed_product_game_visible_to_request_v1(family.game_key)
    and mapping.source_provider = 'tcgplayer'
    and variant.language_code in ('en','ja','zh','fr','de','it','ko','pt','es','ru')
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

revoke all on function public.get_active_pokemon_sealed_pricing_v1(
  text, text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.get_active_pokemon_sealed_pricing_v1(
  text, text, integer, integer
) to authenticated, service_role;

comment on function public.get_active_pokemon_sealed_pricing_v1(
  text, text, integer, integer
) is
  'Signed-in sealed pricing read model. Returns only fresh exact prices with exact self-hosted images from image and price releases bound to the same frozen authority.';


create or replace function public.pokemon_sealed_image_object_signing_authorized_v1(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    coalesce(auth.role(), '') in ('authenticated', 'service_role')
    and p_bucket_id = 'user-card-images'
    and p_object_name ~ '^sealed/pokemon/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(jpg|png|gif|webp)$'
    and public.catalog_game_visible_to_request_v1('pokemon')
    and public.sealed_product_game_visible_to_request_v1('pokemon')
    and exists (
      select 1
      from public.sealed_product_image_objects image_object
      join public.sealed_product_variant_image_assertions image_assertion
        on image_assertion.image_object_id = image_object.id
       and image_assertion.game_key = image_object.game_key
       and image_assertion.assertion_state = 'exact_verified'
      join public.sealed_product_image_evidence image_evidence
        on image_evidence.id = image_assertion.image_evidence_id
       and image_evidence.game_key = image_assertion.game_key
       and image_evidence.variant_id = image_assertion.variant_id
       and image_evidence.source_mapping_id = image_assertion.source_mapping_id
       and image_evidence.classification in (
         'exact_image_ready', 'shared_bytes_exact_variant'
       )
      join public.sealed_product_image_release_members image_member
        on image_member.image_assertion_id = image_assertion.id
       and image_member.game_key = image_assertion.game_key
       and image_member.variant_id = image_assertion.variant_id
      join public.sealed_product_image_releases image_release
        on image_release.id = image_member.image_release_id
       and image_release.game_key = image_member.game_key
       and image_release.release_state = 'frozen'
      join public.sealed_product_image_release_pointer image_pointer
        on image_pointer.image_release_id = image_release.id
       and image_pointer.game_key = image_release.game_key
      join public.sealed_product_release_pointer price_pointer
        on price_pointer.release_id = image_release.source_price_release_id
       and price_pointer.game_key = image_release.game_key
      join public.sealed_product_releases price_release
        on price_release.id = price_pointer.release_id
       and price_release.game_key = price_pointer.game_key
       and price_release.release_state = 'frozen'
      join public.sealed_product_release_members price_member
        on price_member.release_id = price_release.id
       and price_member.id = image_evidence.source_release_member_id
       and price_member.variant_id = image_assertion.variant_id
       and price_member.source_mapping_id = image_assertion.source_mapping_id
       and price_member.qualification_status = 'qualified_exact'
      join public.sealed_product_pricing_lane_qualifications qualification
        on qualification.id = price_member.qualification_id
       and qualification.variant_id = price_member.variant_id
       and qualification.source_mapping_id = price_member.source_mapping_id
       and qualification.qualification_status = price_member.qualification_status
      join public.sealed_product_source_mappings mapping
        on mapping.id = price_member.source_mapping_id
       and mapping.variant_id = price_member.variant_id
       and mapping.source_provider = 'tcgplayer'
      join public.sealed_product_variants variant
        on variant.id = price_member.variant_id
       and variant.language_code in ('en','ja','zh','fr','de','it','ko','pt','es','ru')
      join public.sealed_product_families family
        on family.id = variant.family_id
       and family.game_key = image_release.game_key
      where image_object.game_key = 'pokemon'
        and image_object.storage_bucket = p_bucket_id
        and image_object.object_path = p_object_name
        and image_object.storage_readback_sha256 = image_object.content_sha256
        and image_object.content_sha256 = image_evidence.content_sha256
        and image_object.image_mime = image_evidence.image_mime
        and image_object.image_width = image_evidence.image_width
        and image_object.image_height = image_evidence.image_height
        and image_object.image_bytes = image_evidence.image_bytes
        and image_object.object_path =
          'sealed/pokemon/sha256/'
          || left(image_object.content_sha256, 2)
          || '/'
          || image_object.content_sha256
          || case image_object.image_mime
            when 'image/jpeg' then '.jpg'
            when 'image/png' then '.png'
            when 'image/gif' then '.gif'
            when 'image/webp' then '.webp'
          end
        and qualification.source_subtype_name_normalized = 'normal'
        and qualification.currency = 'USD'
        and qualification.observed_on >= current_date - 7
        and qualification.observed_on <= current_date
        and (qualification.qualification_evidence #>> '{observation,market_price}')
          is not null
        and (qualification.qualification_evidence #>> '{observation,market_price}')::numeric
          > 0
    );
$$;

revoke all on function public.pokemon_sealed_image_object_signing_authorized_v1(
  text, text
) from public, anon, authenticated, service_role;

grant execute on function public.pokemon_sealed_image_object_signing_authorized_v1(
  text, text
) to authenticated, service_role;

comment on function public.pokemon_sealed_image_object_signing_authorized_v1(
  text, text
) is
  'Authorizes trusted one-object signing only for byte-verified Pokemon sealed images in the active frozen image release bound to the active frozen fresh exact TCGPlayer price release and both visibility controls; grants no storage.objects access.';



notify pgrst, 'reload schema';
commit;
