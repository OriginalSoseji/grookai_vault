-- MEE-TCGDEX-REFERENCE-RAW-SNAPSHOT-REPAIR-V1 preflight.

with tcgdex_candidates as (
  select
    c.id,
    c.source,
    c.raw_snapshot_id,
    c.acquisition_run_id,
    c.raw_payload->>'source_raw_import_id' as raw_import_id
  from public.market_reference_candidates c
  where c.source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
),
distinct_raw_imports as (
  select distinct raw_import_id::bigint as raw_import_id
  from tcgdex_candidates
  where raw_import_id is not null
),
matching_raw_imports as (
  select r.id
  from public.raw_imports r
  join distinct_raw_imports d on d.raw_import_id = r.id
  where r.source = 'tcgdex'
),
existing_snapshots as (
  select id
  from public.market_reference_raw_snapshots
  where source = 'tcgdex_reference'
    and source_object_type = 'tcgdex_raw_import_card'
),
existing_run as (
  select id
  from public.market_reference_acquisition_runs
  where run_key = 'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1'
)
select jsonb_build_object(
  'tcgdex_candidate_rows', (select count(*)::int from tcgdex_candidates),
  'candidate_rows_with_raw_snapshot', (select count(*)::int from tcgdex_candidates where raw_snapshot_id is not null),
  'candidate_rows_with_acquisition_run', (select count(*)::int from tcgdex_candidates where acquisition_run_id is not null),
  'candidate_rows_missing_raw_import_id', (select count(*)::int from tcgdex_candidates where raw_import_id is null),
  'distinct_raw_import_ids', (select count(*)::int from distinct_raw_imports),
  'matching_tcgdex_raw_imports', (select count(*)::int from matching_raw_imports),
  'missing_raw_imports', (
    select count(*)::int
    from distinct_raw_imports d
    left join matching_raw_imports r on r.id = d.raw_import_id
    where r.id is null
  ),
  'existing_tcgdex_reference_snapshots', (select count(*)::int from existing_snapshots),
  'existing_tcgdex_reference_run_rows', (select count(*)::int from existing_run)
) as report;
