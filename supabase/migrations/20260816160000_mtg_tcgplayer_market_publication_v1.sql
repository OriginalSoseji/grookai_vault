-- MTG_TCGPLAYER_MARKET_PUBLICATION_V1
-- Extends the governed TCGPlayer market-close pipeline to exact English paper
-- MTG printings while preserving the existing Pokemon publication generation.

begin;

insert into public.finish_keys (key, label, sort_order, is_active, meta)
values ('foil', 'Foil', 40, true, '{"game":"mtg"}'::jsonb)
on conflict (key) do nothing;

create or replace function public.normalize_tcgplayer_market_subtype_v1(raw_subtype text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(btrim(coalesce(raw_subtype, '')))
    when 'normal' then 'normal'
    when 'holofoil' then 'holo'
    when 'reverse holofoil' then 'reverse'
    when 'foil' then 'foil'
    else null
  end;
$$;

comment on function public.normalize_tcgplayer_market_subtype_v1(text) is
  'Maps only unambiguous ordinary Pokemon and MTG TCGPlayer price subtypes to canonical finish keys. Edition, etched, and special-finish subtypes abstain.';

create or replace view public.v_mtg_tcgplayer_parent_mapping_candidates_v1 as
with exact_printing_evidence as materialized (
  select
    split_part(printing_mapping.external_id, ':', 1) as source_product_id,
    printing.card_print_id,
    printing_mapping.id as printing_mapping_id
  from public.external_printing_mappings printing_mapping
  join public.card_printings printing
    on printing.id = printing_mapping.card_printing_id
  join public.card_print_identity identity
    on identity.card_print_id = printing.card_print_id
   and identity.is_active = true
   and identity.identity_domain = 'mtg_eng_paper_print'
  where printing_mapping.source = 'tcgplayer_market'
    and printing_mapping.active = true
    and printing_mapping.external_id ~ '^[1-9][0-9]*:(normal|foil)$'
),
summarized as (
  select
    evidence.source_product_id,
    min(evidence.card_print_id::text)::uuid as card_print_id,
    count(distinct evidence.card_print_id)::integer as canonical_parent_count,
    count(distinct evidence.printing_mapping_id)::integer as supporting_printing_mapping_count
  from exact_printing_evidence evidence
  group by evidence.source_product_id
),
existing as (
  select
    mapping.external_id as source_product_id,
    count(*)::integer as mapping_count,
    count(distinct mapping.card_print_id)::integer as mapped_parent_count,
    min(mapping.card_print_id::text)::uuid as mapped_card_print_id
  from public.external_mappings mapping
  where mapping.source = 'tcgplayer'
    and mapping.active = true
    and mapping.external_id ~ '^[1-9][0-9]*$'
  group by mapping.external_id
)
select
  summarized.source_product_id,
  summarized.card_print_id,
  summarized.canonical_parent_count,
  summarized.supporting_printing_mapping_count,
  coalesce(existing.mapping_count, 0) as existing_mapping_count,
  coalesce(existing.mapped_parent_count, 0) as existing_mapped_parent_count,
  existing.mapped_card_print_id,
  product.category_id as source_category_id,
  product.source_active,
  case
    when summarized.canonical_parent_count <> 1 then 'ambiguous_printing_parents'
    when product.product_id is null then 'missing_mtg_source_product'
    when product.source_active is not true then 'inactive_mtg_source_product'
    when coalesce(existing.mapping_count, 0) = 0 then 'insert_candidate'
    when existing.mapping_count = 1
      and existing.mapped_parent_count = 1
      and existing.mapped_card_print_id = summarized.card_print_id
      then 'already_exact'
    else 'conflicting_existing_mapping'
  end as resolution
from summarized
left join public.tcgcsv_source_products product
  on product.product_id::text = summarized.source_product_id
 and product.category_id = 1
left join existing
  on existing.source_product_id = summarized.source_product_id;

revoke all on public.v_mtg_tcgplayer_parent_mapping_candidates_v1
  from public, anon, authenticated;
grant select on public.v_mtg_tcgplayer_parent_mapping_candidates_v1
  to service_role;

comment on view public.v_mtg_tcgplayer_parent_mapping_candidates_v1 is
  'Service-only insert candidates derived from exact MTG TCGPlayer printing mappings. A product is eligible only when every exact finish points to one canonical parent.';

create or replace view public.v_tcgplayer_market_qualification_candidates_v1 as
with source_run as materialized (
  select sync_run.*
  from public.tcgcsv_source_sync_runs sync_run
  where sync_run.sync_mode = 'current_full_sync'
    and sync_run.status = 'completed'
    and sync_run.failed_count = 0
    and sync_run.finished_at is not null
  order by sync_run.finished_at desc, sync_run.created_at desc, sync_run.id desc
  limit 1
),
source_observations as (
  select
    observation.*,
    source_run.sync_mode as source_sync_mode,
    source_run.status as source_sync_status,
    source_run.finished_at as source_sync_finished_at,
    source_run.failed_count as source_sync_failed_count,
    source_run.artifact_hash as source_run_artifact_hash,
    count(*) over (
      partition by observation.product_id, observation.subtype_name_normalized
    )::integer as duplicate_product_row_count
  from public.tcgcsv_source_price_daily_observations observation
  join source_run
    on source_run.id = observation.last_seen_run_id
  where observation.category_id in (1, 3)
    and observation.observed_on = source_run.observed_on
),
mapped as (
  select
    observation.id as source_observation_id,
    observation.last_seen_run_id as source_sync_run_id,
    observation.source_artifact_id,
    artifact.observed_on as source_artifact_date,
    artifact.sha256 as source_artifact_hash,
    artifact.byte_size as source_artifact_byte_size,
    artifact.http_status as source_artifact_http_status,
    observation.source_price_row_identity,
    observation.payload_hash as source_row_hash,
    observation.product_id as source_product_id,
    observation.category_id,
    observation.group_id,
    observation.subtype_name as source_subtype_name,
    observation.subtype_name_normalized,
    observation.observed_on as source_observed_on,
    observation.last_observed_at as source_last_observed_at,
    observation.duplicate_product_row_count,
    observation.currency,
    observation.low_price,
    observation.mid_price,
    observation.high_price,
    observation.market_price,
    observation.direct_low_price,
    product.name as source_product_name,
    product.source_active as source_product_active,
    product.catalog_metadata_status as source_product_catalog_status,
    product.extended_data as source_product_extended_data,
    observation.source_sync_mode,
    observation.source_sync_status,
    observation.source_sync_finished_at,
    observation.source_sync_failed_count,
    observation.source_run_artifact_hash,
    public.normalize_tcgplayer_market_subtype_v1(
      observation.subtype_name
    ) as normalized_finish_key,
    case when source_mapping.id is null then 0 else 1 end::integer
      as source_mapping_count,
    case when source_mapping.card_print_id is null then 0 else 1 end::integer
      as card_print_mapping_count,
    case when printing.id is null then 0 else 1 end::integer
      as card_printing_mapping_count,
    case when identity.identity_domain is null then 0 else 1 end::integer
      as identity_domain_count,
    source_mapping.id as source_mapping_id,
    source_mapping.meta as source_mapping_meta,
    source_mapping.card_print_id,
    card.gv_id,
    card.rarity as card_rarity,
    identity.identity_domain,
    printing.id as card_printing_id,
    printing.printing_gv_id,
    printing.finish_key,
    assignment.id as variant_assignment_id,
    assignment.variant_assignment_status,
    assignment.variant_assignment_version,
    assignment.variant_assignment_confidence::numeric
      as variant_assignment_confidence
  from source_observations observation
  left join public.tcgcsv_source_artifacts artifact
    on artifact.id = observation.source_artifact_id
  left join public.tcgcsv_source_products product
    on product.product_id = observation.product_id
  left join public.external_mappings source_mapping
    on source_mapping.source = 'tcgplayer'
   and source_mapping.active = true
   and source_mapping.external_id ~ '^[0-9]+$'
   and source_mapping.external_id::integer = observation.product_id
  left join public.card_prints card
    on card.id = source_mapping.card_print_id
  left join public.card_print_identity identity
    on identity.card_print_id = card.id
   and identity.is_active = true
  left join public.card_printings printing
    on printing.card_print_id = card.id
   and printing.finish_key = public.normalize_tcgplayer_market_subtype_v1(
     observation.subtype_name
   )
   and not exists (
     select 1
     from public.card_printing_truth_reviews truth_review
     where truth_review.card_printing_id = printing.id
       and truth_review.active = true
       and truth_review.public_visibility in (
         'hidden_pending_review',
         'hidden_unsupported'
       )
   )
  left join lateral (
    select candidate_assignment.*
    from public.market_evidence_variant_assignments candidate_assignment
    where candidate_assignment.source_family = 'tcgcsv_market_close'
      and candidate_assignment.source_table =
        'tcgcsv_source_price_daily_observations'
      and candidate_assignment.source_row_id = observation.id
      and candidate_assignment.variant_assignment_version in (
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1',
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
      )
    order by
      case candidate_assignment.variant_assignment_version
        when 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1' then 1
        else 2
      end,
      candidate_assignment.created_at desc,
      candidate_assignment.id desc
    limit 1
  ) assignment on true
)
select
  mapped.*,
  exists (
    select 1
    from jsonb_array_elements(
      coalesce(mapped.source_product_extended_data, '[]'::jsonb)
    ) field
    where lower(coalesce(field ->> 'name', '')) = 'number'
      and nullif(btrim(field ->> 'value'), '') is not null
  ) as has_printed_number_evidence,
  coalesce(
    mapped.source_mapping_meta ->> 'mapping_method',
    mapped.source_mapping_meta ->> 'derived_from',
    mapped.source_mapping_meta ->> 'promoted_by'
  ) as mapping_method,
  case
    when coalesce(mapped.source_mapping_meta ->> 'confidence', '') ~
      '^[0-9]+([.][0-9]+)?$'
      then (mapped.source_mapping_meta ->> 'confidence')::numeric
    else null
  end as mapping_confidence,
  case
    when mapped.card_print_mapping_count <> 1 then null
    when mapped.normalized_finish_key is null
      then 'unknown_finish_needs_review'
    when mapped.card_printing_mapping_count = 1
      then 'exact_child_finish'
    else 'no_matching_child_finish'
  end as derived_variant_assignment_status
from mapped;

revoke all on public.v_tcgplayer_market_qualification_candidates_v1
  from public, anon, authenticated;
grant select on public.v_tcgplayer_market_qualification_candidates_v1
  to service_role;

comment on view public.v_tcgplayer_market_qualification_candidates_v1 is
  'Latest reconciled Pokemon and MTG TCGCSV market observations joined one-to-one to canonical parent mappings and non-quarantined exact finish evidence.';

create or replace function public.prepare_tcgplayer_market_variant_assignments_v1(
  p_source_sync_run_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
set enable_nestloop = off
as $$
declare
  inserted_count integer;
  source_observed_on date;
begin
  select source_run.observed_on
    into source_observed_on
  from public.tcgcsv_source_sync_runs source_run
  where source_run.id = p_source_sync_run_id
    and source_run.sync_mode = 'current_full_sync'
    and source_run.status = 'completed'
    and source_run.failed_count = 0
    and source_run.finished_at is not null;

  if source_observed_on is null then
    raise exception
      'source sync run % is not a reconciled completed current run',
      p_source_sync_run_id;
  end if;

  insert into public.market_evidence_variant_assignments (
    contract_version, source_family, source_table, source_row_id,
    observation_id, raw_snapshot_id, card_print_id, gv_id,
    card_printing_id, printing_gv_id, source_finish_hint,
    normalized_finish_key, assigned_finish_key, variant_assignment_status,
    variant_assignment_confidence, variant_assignment_version,
    variant_assignment_reason, variant_assignment_flags, assignment_payload,
    needs_review, publishable, app_visible, market_truth
  )
  with source_observations as materialized (
    select
      observation.id as source_observation_id,
      observation.source_artifact_id,
      observation.product_id as source_product_id,
      observation.subtype_name as source_subtype_name,
      public.normalize_tcgplayer_market_subtype_v1(
        observation.subtype_name
      ) as normalized_finish_key
    from public.tcgcsv_source_price_daily_observations observation
    where observation.last_seen_run_id = p_source_sync_run_id
      and observation.category_id in (1, 3)
      and observation.observed_on = source_observed_on
  ),
  mapped as (
    select
      observation.*,
      source_mapping.id as source_mapping_id,
      source_mapping.card_print_id,
      card.gv_id,
      printing.id as card_printing_id,
      printing.printing_gv_id,
      printing.finish_key,
      case
        when observation.normalized_finish_key is null
          then 'unknown_finish_needs_review'
        when printing.id is not null
          then 'exact_child_finish'
        else 'no_matching_child_finish'
      end as derived_variant_assignment_status
    from source_observations observation
    join public.external_mappings source_mapping
      on source_mapping.source = 'tcgplayer'
     and source_mapping.active = true
     and source_mapping.external_id = observation.source_product_id::text
     and source_mapping.card_print_id is not null
    join public.card_prints card
      on card.id = source_mapping.card_print_id
    left join public.card_printings printing
      on printing.card_print_id = card.id
     and printing.finish_key = observation.normalized_finish_key
     and not exists (
       select 1
       from public.card_printing_truth_reviews truth_review
       where truth_review.card_printing_id = printing.id
         and truth_review.active = true
         and truth_review.public_visibility in (
           'hidden_pending_review',
           'hidden_unsupported'
         )
     )
  )
  select
    'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1',
    'tcgcsv_market_close',
    'tcgcsv_source_price_daily_observations',
    candidate.source_observation_id,
    candidate.source_observation_id,
    candidate.source_artifact_id,
    candidate.card_print_id,
    candidate.gv_id,
    case when candidate.derived_variant_assignment_status = 'exact_child_finish'
      then candidate.card_printing_id else null end,
    case when candidate.derived_variant_assignment_status = 'exact_child_finish'
      then candidate.printing_gv_id else null end,
    candidate.source_subtype_name,
    candidate.normalized_finish_key,
    case when candidate.derived_variant_assignment_status = 'exact_child_finish'
      then candidate.finish_key else null end,
    candidate.derived_variant_assignment_status,
    case when candidate.derived_variant_assignment_status = 'exact_child_finish'
      then 1.0000 else 0.0000 end,
    'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1',
    case candidate.derived_variant_assignment_status
      when 'exact_child_finish'
        then 'ordinary source subtype resolved to one exact canonical child finish'
      when 'unknown_finish_needs_review'
        then 'source subtype is not an approved ordinary finish'
      else 'approved source subtype did not resolve to one exact canonical child finish'
    end,
    case when candidate.derived_variant_assignment_status = 'exact_child_finish'
      then '{}'::text[]
      else array[candidate.derived_variant_assignment_status]::text[] end,
    jsonb_build_object(
      'source_mapping_id', candidate.source_mapping_id,
      'source_product_id', candidate.source_product_id,
      'source_subtype_name', candidate.source_subtype_name,
      'source_observation_id', candidate.source_observation_id
    ),
    candidate.derived_variant_assignment_status <> 'exact_child_finish',
    false,
    false,
    false
  from mapped candidate
  where not exists (
    select 1
    from public.market_evidence_variant_assignments assignment
    where assignment.source_family = 'tcgcsv_market_close'
      and assignment.source_row_id = candidate.source_observation_id
      and assignment.variant_assignment_version =
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
  )
  on conflict (
    source_family, source_row_id, variant_assignment_version
  ) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.prepare_tcgplayer_market_variant_assignments_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prepare_tcgplayer_market_variant_assignments_v1(uuid)
  to service_role;

comment on function public.prepare_tcgplayer_market_variant_assignments_v1(uuid) is
  'Prepares missing Pokemon and MTG TCGCSV market-close assignments from one materialized source-run slice; repeated calls are idempotent.';

commit;
