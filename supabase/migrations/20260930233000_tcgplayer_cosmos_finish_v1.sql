-- Exact Cosmos resolution. No printing, review, mapping, or price data is created.
begin;

create or replace function public.normalize_tcgplayer_market_finish_v2(
  category_id integer, product_name text, subtype text, mapping_meta jsonb
) returns text language sql immutable parallel safe set search_path = public as $$
  select case
    when category_id = 3 and btrim(product_name) ~* '\(Cosmos Holo\)$' then
      case when lower(btrim(subtype)) = 'holofoil' then 'cosmos' else null end
    when mapping_meta ->> 'required_finish_key' = 'cosmos' then null
    else public.normalize_tcgplayer_market_subtype_v1(subtype)
  end;
$$;

create or replace function public.has_tcgplayer_cosmos_authority_v1(
  printing_id uuid, product_id integer, product_hash text
) returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.card_printings child
    join public.external_printing_mappings mapping
      on mapping.card_printing_id = child.id and mapping.active
      and mapping.source = 'tcgplayer' and mapping.external_id = product_id::text
      and mapping.meta ->> 'finish_authority_version' = 'TCGPLAYER_COSMOS_FINISH_V1'
      and mapping.meta ->> 'source_subtype' = 'Holofoil'
      and mapping.meta ->> 'finish_key' = 'cosmos'
      and mapping.meta ->> 'source_product_payload_hash' = product_hash
    join public.card_printing_truth_reviews review
      on review.card_printing_id = child.id and review.active
      and review.review_status = 'verified' and review.public_visibility = 'visible'
      and 'cosmos' = any(review.expected_finish_keys)
      and nullif(review.source_report_path, '') is not null
    where child.id = printing_id and child.finish_key = 'cosmos'
      and child.is_provisional = false
      and not exists (
        select 1 from public.card_printing_truth_reviews conflict
        where conflict.card_printing_id = child.id and conflict.active
          and (conflict.review_status <> 'verified' or conflict.public_visibility <> 'visible')
      )
      and not exists (
        select 1 from public.external_printing_mappings competitor
        where competitor.source = 'tcgplayer' and competitor.external_id = product_id::text
          and competitor.active and competitor.card_printing_id <> child.id
      )
  );
$$;

revoke all on function public.normalize_tcgplayer_market_finish_v2(integer,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.has_tcgplayer_cosmos_authority_v1(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.normalize_tcgplayer_market_finish_v2(integer,text,text,jsonb) to service_role;
grant execute on function public.has_tcgplayer_cosmos_authority_v1(uuid,integer,text) to service_role;

-- Candidate view and assignment preparation follow below.

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
    public.normalize_tcgplayer_market_finish_v2(observation.category_id, product.name,
      observation.subtype_name, source_mapping.meta) as normalized_finish_key,
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
   and printing.finish_key = public.normalize_tcgplayer_market_finish_v2(observation.category_id, product.name,
     observation.subtype_name, source_mapping.meta)
   and (printing.finish_key <> 'cosmos' or public.has_tcgplayer_cosmos_authority_v1(
     printing.id, product.product_id, product.payload_hash))
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
      and (printing.finish_key is distinct from 'cosmos' or (
        candidate_assignment.card_printing_id = printing.id
        and candidate_assignment.assigned_finish_key = 'cosmos'
      ))
      and candidate_assignment.variant_assignment_version in (
        'MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1',
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1',
        'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
      )
    order by
      case candidate_assignment.variant_assignment_version
        when 'MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1' then 0
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
  end as derived_variant_assignment_status,
  (mapped.normalized_finish_key = 'cosmos' and mapped.finish_key = 'cosmos'
    and mapped.card_printing_id is not null) is true as cosmos_finish_authority
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
      public.normalize_tcgplayer_market_finish_v2(observation.category_id, product.name,
        observation.subtype_name, finish_mapping.meta) as normalized_finish_key,
      product.payload_hash as source_product_hash
    from public.tcgcsv_source_price_daily_observations observation
    left join public.tcgcsv_source_products product on product.product_id = observation.product_id
    left join public.external_mappings finish_mapping
      on finish_mapping.source = 'tcgplayer' and finish_mapping.active
      and finish_mapping.external_id = observation.product_id::text
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
     and (printing.finish_key <> 'cosmos' or public.has_tcgplayer_cosmos_authority_v1(
       printing.id, observation.source_product_id, observation.source_product_hash))
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
    case when candidate.normalized_finish_key = 'cosmos'
      then 'MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1'
      else 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1' end,
    case candidate.derived_variant_assignment_status
      when 'exact_child_finish'
        then 'source treatment resolved to one governed exact canonical child finish'
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
        case when candidate.normalized_finish_key = 'cosmos'
          then 'MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1'
          else 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1' end
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
