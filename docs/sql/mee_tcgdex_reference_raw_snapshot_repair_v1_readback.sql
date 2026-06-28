-- MEE-TCGDEX-REFERENCE-RAW-SNAPSHOT-REPAIR-V1 readback.

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
snapshot_links as (
  select
    c.id,
    c.source,
    c.raw_import_id,
    s.id as snapshot_id,
    s.source as snapshot_source,
    s.source_object_type,
    s.source_object_id,
    s.raw_payload,
    s.payload_hash
  from tcgdex_candidates c
  left join public.market_reference_raw_snapshots s on s.id = c.raw_snapshot_id
),
run_rows as (
  select id
  from public.market_reference_acquisition_runs
  where run_key = 'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1'
)
select jsonb_build_object(
  'tcgdex_candidate_rows', (select count(*)::int from tcgdex_candidates),
  'candidate_rows_with_raw_snapshot', (select count(*)::int from tcgdex_candidates where raw_snapshot_id is not null),
  'candidate_rows_with_acquisition_run', (select count(*)::int from tcgdex_candidates where acquisition_run_id is not null),
  'distinct_raw_snapshots', (select count(distinct raw_snapshot_id)::int from tcgdex_candidates),
  'tcgdex_reference_snapshot_rows', (
    select count(*)::int
    from public.market_reference_raw_snapshots
    where source = 'tcgdex_reference'
      and source_object_type = 'tcgdex_raw_import_card'
  ),
  'acquisition_run_rows', (select count(*)::int from run_rows),
  'bad_snapshot_source_rows', (
    select count(*)::int
    from snapshot_links
    where snapshot_source is distinct from 'tcgdex_reference'
      or source_object_type is distinct from 'tcgdex_raw_import_card'
  ),
  'candidate_snapshot_raw_import_mismatch_rows', (
    select count(*)::int
    from snapshot_links
    where raw_import_id is distinct from source_object_id
  ),
  'snapshot_hash_mismatch_rows', (
    select count(*)::int
    from snapshot_links
    where payload_hash is distinct from encode(digest(raw_payload::text, 'sha256'), 'hex')
  ),
  'public_boundary', jsonb_build_object(
    'pricing_observations_count', (select count(*)::int from public.pricing_observations),
    'ebay_active_prices_latest_count', (select count(*)::int from public.ebay_active_prices_latest),
    'v_card_pricing_references_market_evidence',
      pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%'
  )
) as report;
