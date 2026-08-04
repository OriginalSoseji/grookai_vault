begin;

-- A child printing under an active truth quarantine is not eligible market
-- identity. Preserve the child and all market history, but remove the child
-- from new qualification resolution and from the current-price read model.
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
  where observation.category_id = 3
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
  'Latest reconciled Pokemon TCGCSV market observations joined one-to-one to canonical mapping and non-quarantined exact finish evidence; append-only assignment corrections take deterministic precedence.';

create or replace view public.v_market_price_current_v1 as
with current_snapshots as (
  select
    snapshot.*,
    row_number() over (
      partition by snapshot.card_printing_id
      order by snapshot.source_observed_on desc,
        snapshot.published_at desc,
        snapshot.id desc
    ) as snapshot_rank
  from public.market_price_publication_snapshots snapshot
  join public.market_price_current_publication current_state
    on current_state.publication_set_id = snapshot.publication_set_id
   and current_state.run_id = snapshot.run_id
  join public.market_price_publication_sets publication_set
    on publication_set.id = current_state.publication_set_id
   and publication_set.run_id = current_state.run_id
   and publication_set.publication_state = 'published'
  join public.market_price_pipeline_runs pipeline_run
    on pipeline_run.id = publication_set.run_id
   and pipeline_run.reconciliation_state = 'reconciled'
   and pipeline_run.state in ('published', 'verified')
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
   and decision.eligible = true
   and decision.decision = 'publish'
   and decision.publication_lane = 'current'
  where snapshot.publication_set_id = publication_set.id
    and snapshot.run_id = pipeline_run.id
    and snapshot.publication_state = 'published'
    and snapshot.freshness_state = 'fresh'
    and snapshot.source_sync_finished_at >= now() - interval '36 hours'
    and not exists (
      select 1
      from public.card_printing_truth_reviews truth_review
      where truth_review.card_printing_id = snapshot.card_printing_id
        and truth_review.active = true
        and truth_review.public_visibility in (
          'hidden_pending_review',
          'hidden_unsupported'
        )
    )
)
select
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.source_observed_on,
  snapshot.source_sync_finished_at as observed_at,
  snapshot.published_at,
  'fresh'::text as freshness,
  extract(epoch from (now() - snapshot.source_sync_finished_at))::bigint
    as age_seconds,
  snapshot.provenance_id,
  snapshot.policy_version,
  snapshot.publication_set_id,
  snapshot.run_id
from current_snapshots snapshot
where snapshot.snapshot_rank = 1;

revoke all on public.v_market_price_current_v1
  from public, anon, authenticated;
grant select on public.v_market_price_current_v1 to service_role;

comment on view public.v_market_price_current_v1 is
  'Current governed TCGPlayer market prices. Active printing-truth quarantines remain preserved in history but are excluded from current reads.';

commit;
