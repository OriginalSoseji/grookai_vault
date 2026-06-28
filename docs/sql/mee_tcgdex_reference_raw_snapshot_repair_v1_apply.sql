-- MEE-TCGDEX-REFERENCE-RAW-SNAPSHOT-REPAIR-V1 apply.
-- Internal-only repair: creates raw snapshot anchors for existing TCGdex reference
-- pricing candidates, then attaches candidate rows to those snapshots.

set statement_timeout = '10min';

do $$
declare
  candidate_count int;
  attached_candidate_count int;
  missing_raw_import_count int;
  existing_snapshot_count int;
  existing_run_count int;
begin
  select count(*)::int
    into candidate_count
  from public.market_reference_candidates
  where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference');

  select count(*)::int
    into attached_candidate_count
  from public.market_reference_candidates
  where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
    and raw_snapshot_id is not null;

  with distinct_raw_imports as (
    select distinct (raw_payload->>'source_raw_import_id')::bigint as raw_import_id
    from public.market_reference_candidates
    where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
      and raw_payload->>'source_raw_import_id' is not null
  )
  select count(*)::int
    into missing_raw_import_count
  from distinct_raw_imports d
  left join public.raw_imports r on r.id = d.raw_import_id and r.source = 'tcgdex'
  where r.id is null;

  select count(*)::int
    into existing_snapshot_count
  from public.market_reference_raw_snapshots
  where source = 'tcgdex_reference'
    and source_object_type = 'tcgdex_raw_import_card';

  select count(*)::int
    into existing_run_count
  from public.market_reference_acquisition_runs
  where run_key = 'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1';

  if candidate_count <> 310744 then
    raise exception 'unexpected tcgdex candidate count: %', candidate_count;
  end if;
  if attached_candidate_count <> 0 then
    raise exception 'tcgdex candidates already attached to raw snapshots: %', attached_candidate_count;
  end if;
  if missing_raw_import_count <> 0 then
    raise exception 'tcgdex candidates have missing raw imports: %', missing_raw_import_count;
  end if;
  if existing_snapshot_count <> 0 then
    raise exception 'tcgdex raw snapshots already exist: %', existing_snapshot_count;
  end if;
  if existing_run_count <> 0 then
    raise exception 'tcgdex raw snapshot acquisition run already exists: %', existing_run_count;
  end if;
end $$;

with inserted_run as (
  insert into public.market_reference_acquisition_runs (
    run_key,
    contract_version,
    source_phase,
    source_list,
    batch_artifact_path,
    batch_artifact_hash,
    input_artifact_paths,
    options,
    summary,
    started_at,
    finished_at
  )
  values (
    'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1',
    'MARKET_EVIDENCE_ENGINE_V1',
    'MEE-13B_TCGDEX_REFERENCE_RAW_SNAPSHOT_SUPPORT_V1',
    array['tcgdex_reference', 'tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference']::text[],
    'docs/sql/mee_tcgdex_reference_raw_snapshot_repair_v1_apply.sql',
    null,
    array[
      'public.raw_imports',
      'public.market_reference_candidates',
      'public.market_reference_normalized_evidence'
    ]::text[],
    jsonb_build_object(
      'mode', 'internal_raw_snapshot_repair',
      'provider_calls', false,
      'source_fetches', false,
      'public_pricing', false
    ),
    jsonb_build_object(
      'target_candidate_rows', 310744,
      'target_raw_snapshot_source', 'tcgdex_reference',
      'target_source_object_type', 'tcgdex_raw_import_card'
    ),
    now(),
    now()
  )
  returning id
),
distinct_raw_imports as (
  select distinct (c.raw_payload->>'source_raw_import_id')::bigint as raw_import_id
  from public.market_reference_candidates c
  where c.source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
),
inserted_snapshots as (
  insert into public.market_reference_raw_snapshots (
    acquisition_run_id,
    source,
    source_object_type,
    source_object_id,
    source_url,
    raw_payload,
    observed_at,
    ingested_at,
    payload_hash
  )
  select
    (select id from inserted_run),
    'tcgdex_reference',
    'tcgdex_raw_import_card',
    r.id::text,
    'https://api.tcgdex.net/v2/en/cards/' || coalesce(r.payload->>'_external_id', r.payload->'card'->>'id', r.payload->>'id'),
    r.payload,
    r.ingested_at,
    now(),
    encode(digest(r.payload::text, 'sha256'), 'hex')
  from public.raw_imports r
  join distinct_raw_imports d on d.raw_import_id = r.id
  where r.source = 'tcgdex'
  returning id, source_object_id
),
updated_candidates as (
  update public.market_reference_candidates c
  set
    raw_snapshot_id = s.id,
    acquisition_run_id = (select id from inserted_run)
  from inserted_snapshots s
  where c.source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
    and c.raw_snapshot_id is null
    and c.raw_payload->>'source_raw_import_id' = s.source_object_id
  returning c.id
)
select jsonb_build_object(
  'inserted_acquisition_runs', (select count(*)::int from inserted_run),
  'inserted_raw_snapshots', (select count(*)::int from inserted_snapshots),
  'updated_candidates', (select count(*)::int from updated_candidates)
) as report;
