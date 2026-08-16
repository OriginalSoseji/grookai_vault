-- CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1 schema-only rollback candidate.
-- Valid only before canonical sealed data exists and only after explicit approval.

begin;

drop table if exists public.sealed_product_release_pointer;
drop table if exists public.sealed_product_release_members;
drop table if exists public.sealed_product_releases;
drop table if exists public.sealed_product_pricing_lane_qualifications;
drop table if exists public.sealed_product_variant_evidence;
drop table if exists public.sealed_product_source_mappings;
drop table if exists public.sealed_product_candidate_reviews;
drop table if exists public.sealed_product_candidates;
drop table if exists public.sealed_product_variants;
drop table if exists public.sealed_product_families;
drop function if exists public.sealed_product_set_active_release_v1(uuid, uuid, uuid);
drop function if exists public.sealed_product_freeze_release_v1(uuid, text, uuid);
drop function if exists public.sealed_product_guard_release_member_insert_v1();
drop function if exists public.sealed_product_guard_release_mutation_v1();
drop function if exists public.sealed_product_reject_row_mutation_v1();

commit;
