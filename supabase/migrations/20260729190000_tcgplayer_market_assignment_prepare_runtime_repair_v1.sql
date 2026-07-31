begin;

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
    contract_version,
    source_family,
    source_table,
    source_row_id,
    observation_id,
    raw_snapshot_id,
    card_print_id,
    gv_id,
    card_printing_id,
    printing_gv_id,
    source_finish_hint,
    normalized_finish_key,
    assigned_finish_key,
    variant_assignment_status,
    variant_assignment_confidence,
    variant_assignment_version,
    variant_assignment_reason,
    variant_assignment_flags,
    assignment_payload,
    needs_review,
    publishable,
    app_visible,
    market_truth
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
      and observation.category_id = 3
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
     and source_mapping.external_id =
       observation.source_product_id::text
     and source_mapping.card_print_id is not null
    join public.card_prints card
      on card.id = source_mapping.card_print_id
    left join public.card_printings printing
      on printing.card_print_id = card.id
     and printing.finish_key = observation.normalized_finish_key
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
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.card_printing_id
      else null
    end,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.printing_gv_id
      else null
    end,
    candidate.source_subtype_name,
    candidate.normalized_finish_key,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.finish_key
      else null
    end,
    candidate.derived_variant_assignment_status,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then 1.0000
      else 0.0000
    end,
    'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1',
    case candidate.derived_variant_assignment_status
      when 'exact_child_finish'
        then 'ordinary source subtype resolved to one exact canonical child finish'
      when 'unknown_finish_needs_review'
        then 'source subtype is not an approved ordinary finish'
      else 'approved source subtype did not resolve to one exact canonical child finish'
    end,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then '{}'::text[]
      else array[candidate.derived_variant_assignment_status]::text[]
    end,
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
    source_family,
    source_row_id,
    variant_assignment_version
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
  'Prepares missing TCGCSV market-close assignments from one materialized source-run slice; repeated calls are idempotent and do not rescan the qualification view.';

commit;
