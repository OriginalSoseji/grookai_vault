-- Extend the exact MTG product-and-finish lane to rows whose only hold is
-- absent printed-number text when an independent active finish mapping points
-- to the same already-exact canonical printing.
begin;

create or replace view public.v_tcgplayer_market_qualification_candidates_v6
with (security_invoker = true) as
select
  candidate.source_observation_id,
  candidate.source_sync_run_id,
  candidate.source_artifact_id,
  candidate.source_artifact_date,
  candidate.source_artifact_hash,
  candidate.source_artifact_byte_size,
  candidate.source_artifact_http_status,
  candidate.source_price_row_identity,
  candidate.source_row_hash,
  candidate.source_product_id,
  candidate.category_id,
  candidate.group_id,
  candidate.source_subtype_name,
  candidate.subtype_name_normalized,
  candidate.source_observed_on,
  candidate.source_last_observed_at,
  candidate.duplicate_product_row_count,
  candidate.currency,
  candidate.low_price,
  candidate.mid_price,
  candidate.high_price,
  candidate.market_price,
  candidate.direct_low_price,
  candidate.source_product_name,
  candidate.source_product_active,
  candidate.source_product_catalog_status,
  candidate.source_product_extended_data,
  candidate.source_sync_mode,
  candidate.source_sync_status,
  candidate.source_sync_finished_at,
  candidate.source_sync_failed_count,
  candidate.source_run_artifact_hash,
  candidate.normalized_finish_key,
  case when exact.id is not null then 1 else candidate.source_mapping_count end
    as source_mapping_count,
  case when exact.id is not null then 1 else candidate.card_print_mapping_count end
    as card_print_mapping_count,
  case when exact.id is not null then 1 else candidate.card_printing_mapping_count end
    as card_printing_mapping_count,
  case when exact.id is not null then 1 else candidate.identity_domain_count end
    as identity_domain_count,
  case when exact.id is not null then null else candidate.source_mapping_id end
    as source_mapping_id,
  candidate.source_mapping_meta,
  coalesce(exact.card_print_id, candidate.card_print_id) as card_print_id,
  coalesce(exact.gv_id, candidate.gv_id) as gv_id,
  coalesce(exact.card_rarity, candidate.card_rarity) as card_rarity,
  coalesce(exact.identity_domain, candidate.identity_domain) as identity_domain,
  coalesce(exact.card_printing_id, candidate.card_printing_id) as card_printing_id,
  coalesce(exact.printing_gv_id, candidate.printing_gv_id) as printing_gv_id,
  coalesce(exact.finish_key, candidate.finish_key) as finish_key,
  case when exact.id is not null then null else candidate.variant_assignment_id end
    as variant_assignment_id,
  case when exact.id is not null then 'exact_child_finish'
    else candidate.variant_assignment_status end as variant_assignment_status,
  case when exact.id is not null then 'MTG_EXACT_PRINTING_MAPPING_V1'
    else candidate.variant_assignment_version end as variant_assignment_version,
  case when exact.id is not null then 1::numeric
    else candidate.variant_assignment_confidence end as variant_assignment_confidence,
  candidate.has_printed_number_evidence,
  case when exact.id is not null then 'exact_external_printing_mapping_v1'
    else candidate.mapping_method end as mapping_method,
  case when exact.id is not null then 1::numeric
    else candidate.mapping_confidence end as mapping_confidence,
  case when exact.id is not null then 'exact_child_finish'
    else candidate.derived_variant_assignment_status end as derived_variant_assignment_status,
  candidate.cosmos_finish_authority,
  candidate.edition_assignment_id,
  candidate.gym_edition_assignment_id,
  candidate.edition_binding_id,
  candidate.edition_assignment_sha256,
  candidate.edition_assignment_version,
  candidate.edition_assignment_payload,
  candidate.edition_assignment_required,
  candidate.edition_assignment_current,
  candidate.edition_source_sync_finished_at,
  candidate.printed_identity_modifier,
  exact.id as mtg_printing_mapping_id
from public.v_tcgplayer_market_qualification_candidates_v4 candidate
left join lateral (
  select mapping.id, printing.id as card_printing_id,
    printing.card_print_id, printing.printing_gv_id, printing.finish_key,
    card.gv_id, card.rarity as card_rarity, identity.identity_domain
  from public.external_printing_mappings mapping
  join public.card_printings printing on printing.id = mapping.card_printing_id
  join public.card_prints card on card.id = printing.card_print_id
  join public.card_print_identity identity
    on identity.card_print_id = card.id
   and identity.is_active
   and identity.identity_domain = 'mtg_eng_paper_print'
  where candidate.category_id = 1
    and (
      (candidate.source_mapping_id is null
        and candidate.variant_assignment_id is null)
      or (
        candidate.has_printed_number_evidence = false
        and candidate.source_mapping_id is not null
        and candidate.variant_assignment_id is not null
        and candidate.card_print_mapping_count = 1
        and candidate.card_printing_mapping_count = 1
        and candidate.identity_domain_count = 1
        and candidate.variant_assignment_status = 'exact_child_finish'
        and mapping.card_printing_id = candidate.card_printing_id
      )
    )
    and candidate.edition_assignment_id is null
    and candidate.gym_edition_assignment_id is null
    and candidate.normalized_finish_key in ('normal','foil')
    and mapping.source = 'tcgplayer_market'
    and mapping.active
    and mapping.external_id = candidate.source_product_id::text || ':' ||
      candidate.normalized_finish_key
    and printing.finish_key = candidate.normalized_finish_key
    and printing.is_provisional = false
    and not exists (
      select 1 from public.card_printing_truth_reviews truth_review
      where truth_review.card_printing_id = printing.id
        and truth_review.active
        and truth_review.public_visibility in ('hidden_pending_review','hidden_unsupported')
    )
    and 1 = (
      select count(*) from public.card_print_identity exact_identity
      where exact_identity.card_print_id = card.id
        and exact_identity.is_active
        and exact_identity.identity_domain = 'mtg_eng_paper_print'
    )
) exact on true;


revoke all on public.v_tcgplayer_market_qualification_candidates_v6 from
  public, anon, authenticated, service_role;
grant select on public.v_tcgplayer_market_qualification_candidates_v6 to service_role;

comment on view public.v_tcgplayer_market_qualification_candidates_v6 is
  'Current TCGPlayer candidates with exact MTG product-and-finish authority, including missing-number rows independently confirmed to the same canonical printing.';

commit;
