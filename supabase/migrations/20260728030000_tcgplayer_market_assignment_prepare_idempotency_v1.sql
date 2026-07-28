begin;

create or replace function public.prepare_tcgplayer_market_variant_assignments_v1(
  p_source_sync_run_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
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
  from public.v_tcgplayer_market_qualification_candidates_v1 candidate
  where candidate.source_sync_run_id = p_source_sync_run_id
    and candidate.variant_assignment_id is null
    and candidate.card_print_mapping_count = 1
    and candidate.card_print_id is not null
    and candidate.derived_variant_assignment_status is not null
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
  'Prepares only missing TCGCSV market-close variant assignments for the requested source run; existing assignments are skipped before insert.';

commit;
