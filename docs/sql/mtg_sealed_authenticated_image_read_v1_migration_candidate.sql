-- MTG_SEALED_AUTHENTICATED_IMAGE_READ_V1_CANDIDATE
-- Review artifact only. This file is intentionally outside supabase/migrations.
-- It authorizes no migration application, Storage write, release activation,
-- visibility change, or anonymous access.

begin;

create or replace function public.mtg_sealed_image_object_signing_authorized_v1(
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
    and p_object_name ~ '^sealed/mtg/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(jpg|png|gif|webp)$'
    and public.catalog_game_visible_to_request_v1('mtg')
    and public.sealed_product_game_visible_to_request_v1('mtg')
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
       and variant.language_code = 'en'
      join public.sealed_product_families family
        on family.id = variant.family_id
       and family.game_key = image_release.game_key
      where image_object.game_key = 'mtg'
        and image_object.storage_bucket = p_bucket_id
        and image_object.object_path = p_object_name
        and image_object.storage_readback_sha256 = image_object.content_sha256
        and image_object.content_sha256 = image_evidence.content_sha256
        and image_object.image_mime = image_evidence.image_mime
        and image_object.image_width = image_evidence.image_width
        and image_object.image_height = image_evidence.image_height
        and image_object.image_bytes = image_evidence.image_bytes
        and image_object.object_path =
          'sealed/mtg/sha256/'
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

revoke all on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) from public, anon, authenticated, service_role;

grant execute on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) to authenticated, service_role;

comment on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) is
  'Authorizes trusted one-object signing only for byte-verified MTG sealed images in the active frozen image release bound to the active frozen fresh exact TCGPlayer price release and both visibility controls; grants no storage.objects access.';

commit;
