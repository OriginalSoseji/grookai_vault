-- Publish MTG market rows through their exact product-and-finish mapping when a
-- TCGPlayer product legitimately spans separate foil and nonfoil parents.
-- Existing parent-mapped and Pokemon edition lanes remain unchanged.
begin;

alter table public.market_price_pipeline_candidates add column if not exists
  mtg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;
alter table public.market_price_qualification_decisions add column if not exists
  mtg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;
alter table public.market_price_publication_snapshots add column if not exists
  mtg_printing_mapping_id uuid references public.external_printing_mappings(id) on delete restrict;

alter table public.market_price_publication_snapshots
  drop constraint if exists market_price_snapshot_assignment_lane_v1;
alter table public.market_price_publication_snapshots
  add constraint market_price_snapshot_assignment_lane_v1 check (
    (edition_assignment_id is null and gym_edition_assignment_id is null
      and mtg_printing_mapping_id is null
      and source_mapping_id is not null and variant_assignment_id is not null)
    or (edition_assignment_id is not null and gym_edition_assignment_id is null
      and mtg_printing_mapping_id is null
      and source_mapping_id is null and variant_assignment_id is null)
    or (edition_assignment_id is null and gym_edition_assignment_id is not null
      and mtg_printing_mapping_id is null
      and source_mapping_id is null and variant_assignment_id is null)
    or (edition_assignment_id is null and gym_edition_assignment_id is null
      and mtg_printing_mapping_id is not null
      and source_mapping_id is null and variant_assignment_id is null)
  );

create or replace view public.v_tcgplayer_market_qualification_candidates_v5
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
  candidate.source_mapping_id,
  candidate.source_mapping_meta,
  coalesce(exact.card_print_id, candidate.card_print_id) as card_print_id,
  coalesce(exact.gv_id, candidate.gv_id) as gv_id,
  coalesce(exact.card_rarity, candidate.card_rarity) as card_rarity,
  coalesce(exact.identity_domain, candidate.identity_domain) as identity_domain,
  coalesce(exact.card_printing_id, candidate.card_printing_id) as card_printing_id,
  coalesce(exact.printing_gv_id, candidate.printing_gv_id) as printing_gv_id,
  coalesce(exact.finish_key, candidate.finish_key) as finish_key,
  candidate.variant_assignment_id,
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
    and candidate.source_mapping_id is null
    and candidate.variant_assignment_id is null
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

create or replace function public.mtg_tcgplayer_finish_price_row_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare matched_count integer;
begin
  if row_data->>'mtg_printing_mapping_id' is null
    or row_data->>'source_mapping_id' is not null
    or row_data->>'variant_assignment_id' is not null
    or row_data->>'edition_assignment_id' is not null
    or row_data->>'gym_edition_assignment_id' is not null
    or (row_data ? 'mapping_method' and
      row_data->>'mapping_method' is distinct from 'exact_external_printing_mapping_v1')
    or (row_data ? 'variant_assignment_status' and
      row_data->>'variant_assignment_status' is distinct from 'exact_child_finish')
    or (row_data ? 'variant_assignment_version' and
      row_data->>'variant_assignment_version' is distinct from 'MTG_EXACT_PRINTING_MAPPING_V1')
  then return false; end if;

  select count(*) into matched_count
  from public.external_printing_mappings mapping
  join public.card_printings printing on printing.id = mapping.card_printing_id
  join public.card_prints card on card.id = printing.card_print_id
  join public.card_print_identity identity
    on identity.card_print_id = card.id and identity.is_active
   and identity.identity_domain = 'mtg_eng_paper_print'
  join public.tcgcsv_source_price_daily_observations observation
    on observation.id = (row_data->>'source_observation_id')::uuid
  join public.tcgcsv_source_products product
    on product.product_id = observation.product_id
  join public.tcgcsv_source_sync_runs source_run
    on source_run.id = observation.last_seen_run_id
  where mapping.id = (row_data->>'mtg_printing_mapping_id')::uuid
    and mapping.source = 'tcgplayer_market' and mapping.active
    and mapping.external_id = observation.product_id::text || ':' || printing.finish_key
    and printing.id = (row_data->>'card_printing_id')::uuid
    and printing.card_print_id = (row_data->>'card_print_id')::uuid
    and printing.finish_key = public.normalize_tcgplayer_market_subtype_v1(
      row_data->>'source_subtype_name')
    and printing.is_provisional = false
    and card.gv_id = row_data->>'gv_id'
    and printing.printing_gv_id = row_data->>'printing_gv_id'
    and observation.category_id = 1
    and observation.product_id = (row_data->>'source_product_id')::integer
    and observation.last_seen_run_id = (row_data->>'source_sync_run_id')::uuid
    and observation.payload_hash = row_data->>'source_row_hash'
    and observation.source_price_row_identity = row_data->>'source_price_row_identity'
    and observation.subtype_name = row_data->>'source_subtype_name'
    and observation.currency = row_data->>'currency'
    and observation.market_price = (row_data->>'market_price')::numeric
    and product.category_id = 1 and product.source_active
    and product.catalog_metadata_status = 'current'
    and source_run.status = 'completed'
    and source_run.sync_mode = 'current_full_sync'
    and source_run.failed_count = 0
    and not exists (
      select 1 from public.card_printing_truth_reviews truth_review
      where truth_review.card_printing_id = printing.id
        and truth_review.active
        and truth_review.public_visibility in ('hidden_pending_review','hidden_unsupported')
    );
  return matched_count = 1;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

create or replace function public.guard_mtg_tcgplayer_finish_price_batch_v1()
returns trigger language plpgsql set search_path = '' as $$
declare row_data jsonb; matched boolean;
begin
  for row_data in
    select to_jsonb(incoming) from new_mtg_finish_price_rows incoming
    where incoming.mtg_printing_mapping_id is not null
      and (tg_table_name = 'market_price_publication_snapshots'
        or to_jsonb(incoming)->>'eligible' = 'true')
  loop
    if row_data->>'policy_version' <> 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'
      or not public.mtg_tcgplayer_finish_price_row_valid_v1(row_data)
    then raise exception 'mtg_finish_price_mapping_invalid'; end if;
    if tg_table_name = 'market_price_qualification_decisions' then
      select exists (
        select 1 from public.market_price_pipeline_candidates candidate
        where candidate.id = (row_data->>'pipeline_candidate_id')::uuid
          and candidate.run_id = (row_data->>'run_id')::uuid
          and candidate.mtg_printing_mapping_id =
            (row_data->>'mtg_printing_mapping_id')::uuid
          and candidate.source_observation_id =
            (row_data->>'source_observation_id')::uuid
          and public.mtg_tcgplayer_finish_price_row_valid_v1(candidate.candidate_payload)
      ) into matched;
    else
      select exists (
        select 1 from public.market_price_qualification_decisions decision
        where decision.id = (row_data->>'qualification_decision_id')::uuid
          and decision.run_id = (row_data->>'run_id')::uuid
          and decision.mtg_printing_mapping_id =
            (row_data->>'mtg_printing_mapping_id')::uuid
          and decision.eligible and decision.decision = 'publish'
          and decision.publication_lane = 'current'
          and public.mtg_tcgplayer_finish_price_row_valid_v1(to_jsonb(decision))
      ) into matched;
    end if;
    if not matched then raise exception 'mtg_finish_price_lineage_invalid'; end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists guard_mtg_tcgplayer_finish_decision_batch_v1
  on public.market_price_qualification_decisions;
create trigger guard_mtg_tcgplayer_finish_decision_batch_v1
  after insert on public.market_price_qualification_decisions
  referencing new table as new_mtg_finish_price_rows
  for each statement execute function public.guard_mtg_tcgplayer_finish_price_batch_v1();

drop trigger if exists guard_mtg_tcgplayer_finish_snapshot_batch_v1
  on public.market_price_publication_snapshots;
create trigger guard_mtg_tcgplayer_finish_snapshot_batch_v1
  after insert on public.market_price_publication_snapshots
  referencing new table as new_mtg_finish_price_rows
  for each statement execute function public.guard_mtg_tcgplayer_finish_price_batch_v1();

revoke all on public.v_tcgplayer_market_qualification_candidates_v5 from
  public, anon, authenticated, service_role;
grant select on public.v_tcgplayer_market_qualification_candidates_v5 to service_role;
revoke all on function public.mtg_tcgplayer_finish_price_row_valid_v1(jsonb) from public;
revoke all on function public.guard_mtg_tcgplayer_finish_price_batch_v1() from public;

comment on view public.v_tcgplayer_market_qualification_candidates_v5 is
  'Current TCGPlayer candidates with an exact MTG product-and-finish lane for products whose finishes have separate canonical parents.';
comment on column public.market_price_publication_snapshots.mtg_printing_mapping_id is
  'Exact external_printing_mappings lineage for the MTG product-and-finish publication lane.';

commit;
