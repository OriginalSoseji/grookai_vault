-- JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1
-- Read-only preflight for the bounded JustTCG bridge backfill surface.
--
-- Purpose:
-- 1. isolate the 26 deterministic insert rows
-- 2. isolate the 3 stale JustTCG mappings
-- 3. prove whether all 29 rows are actually ready for mutation
-- 4. fail closed when stale remap targets are missing or ambiguous

begin;

create temp view justtcg_bridge_insert_surface_v1 as
select
  null::bigint as external_mapping_id,
  edc.upstream_id as justtcg_external_id,
  null::uuid as old_card_print_id,
  edc.card_print_id as new_card_print_id,
  cp.gv_id as new_gv_id,
  'INSERT'::text as mapping_action,
  'READY'::text as validation_status,
  1::int as target_candidate_count,
  edc.raw_import_id,
  edc.name_raw,
  edc.number_raw,
  edc.set_id as raw_set,
  coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as proof_reason,
  coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') as matched_via
from public.external_discovery_candidates edc
join public.card_prints cp
  on cp.id = edc.card_print_id
where edc.source = 'justtcg'
  and cp.gv_id is not null
  and edc.card_print_id is not null
  and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
  and coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') = 'tcgplayer_external_mapping'
  and not exists (
    select 1
    from public.external_mappings em
    where em.source = 'justtcg'
      and em.external_id = edc.upstream_id
  );

create temp view justtcg_bridge_stale_surface_v1 as
with stale as (
  select
    em.id as external_mapping_id,
    em.external_id as justtcg_external_id,
    em.card_print_id as old_card_print_id,
    old_cp.gv_id as old_gv_id,
    old_cp.name as old_name,
    old_cp.number as old_number,
    old_cp.number_plain as old_number_plain,
    coalesce(old_cp.variant_key, '') as old_variant_key,
    old_set.code as old_set_code,
    ri.id as raw_import_id,
    ri.payload->>'name' as raw_name,
    ri.payload->>'number' as raw_number,
    ri.payload->>'set' as raw_set
  from public.external_mappings em
  join public.card_prints old_cp
    on old_cp.id = em.card_print_id
  join public.sets old_set
    on old_set.id = old_cp.set_id
  left join public.raw_imports ri
    on ri.source = 'justtcg'
   and ri.payload->>'_kind' = 'card'
   and coalesce(ri.payload->>'id', ri.payload->>'_external_id') = em.external_id
  where em.source = 'justtcg'
    and em.active is true
    and old_cp.gv_id is null
),
staged_candidates as (
  select
    edc.upstream_id as justtcg_external_id,
    edc.card_print_id as new_card_print_id,
    cp.gv_id as new_gv_id,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as proof_reason,
    row_number() over (
      partition by edc.upstream_id
      order by edc.raw_import_id, edc.id
    ) as candidate_rank,
    count(*) over (
      partition by edc.upstream_id
    )::int as target_candidate_count
  from public.external_discovery_candidates edc
  join public.card_prints cp
    on cp.id = edc.card_print_id
  where edc.source = 'justtcg'
    and edc.card_print_id is not null
    and cp.gv_id is not null
    and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
)
select
  stale.external_mapping_id,
  stale.justtcg_external_id,
  stale.old_card_print_id,
  candidate.new_card_print_id,
  candidate.new_gv_id,
  'REMAP'::text as mapping_action,
  coalesce(candidate.target_candidate_count, 0)::int as target_candidate_count,
  case
    when coalesce(candidate.target_candidate_count, 0) = 1
      and candidate.new_card_print_id is not null
      then 'READY'
    when coalesce(candidate.target_candidate_count, 0) = 0
      then 'BLOCKED_NO_TARGET'
    else 'BLOCKED_AMBIGUOUS'
  end as validation_status,
  coalesce(stale.raw_import_id, 0)::bigint as raw_import_id,
  coalesce(stale.raw_name, stale.old_name) as name_raw,
  coalesce(stale.raw_number, stale.old_number) as number_raw,
  coalesce(stale.raw_set, stale.old_set_code) as raw_set,
  coalesce(candidate.proof_reason, 'mapping_target_noncanonical') as proof_reason
from stale
left join staged_candidates candidate
  on candidate.justtcg_external_id = stale.justtcg_external_id
 and candidate.candidate_rank = 1;

create temp view justtcg_tcgplayer_bridge_backfill_dry_run_v1 as
select
  external_mapping_id,
  justtcg_external_id,
  old_card_print_id,
  new_card_print_id,
  new_gv_id,
  mapping_action,
  validation_status,
  target_candidate_count,
  proof_reason
from justtcg_bridge_stale_surface_v1
union all
select
  external_mapping_id,
  justtcg_external_id,
  old_card_print_id,
  new_card_print_id,
  new_gv_id,
  mapping_action,
  validation_status,
  target_candidate_count,
  proof_reason
from justtcg_bridge_insert_surface_v1;

-- Per-row surface.
select
  external_mapping_id,
  justtcg_external_id,
  old_card_print_id,
  new_card_print_id,
  new_gv_id,
  mapping_action,
  validation_status,
  target_candidate_count,
  proof_reason
from justtcg_tcgplayer_bridge_backfill_dry_run_v1
order by mapping_action, justtcg_external_id;

-- Dry-run summary.
select
  (select count(*)::int from justtcg_bridge_stale_surface_v1) as stale_mapping_count,
  (select count(*)::int from justtcg_bridge_insert_surface_v1) as newly_matchable_count,
  (select count(*)::int from justtcg_tcgplayer_bridge_backfill_dry_run_v1) as total_candidate_scope,
  (select count(*)::int from justtcg_tcgplayer_bridge_backfill_dry_run_v1 where validation_status = 'READY') as total_ready_apply_scope,
  (select count(*)::int from justtcg_bridge_stale_surface_v1 where validation_status = 'READY') as stale_ready_count,
  (select count(*)::int from justtcg_bridge_stale_surface_v1 where validation_status <> 'READY') as stale_blocked_count,
  (
    select count(*)::int
    from (
      select justtcg_external_id
      from justtcg_bridge_insert_surface_v1
      group by justtcg_external_id
      having count(*) > 1
    ) dupes
  ) as collision_count,
  (
    select count(*)::int
    from justtcg_bridge_stale_surface_v1
    where validation_status = 'BLOCKED_AMBIGUOUS'
  ) as ambiguity_count,
  (
    select count(*)::int
    from justtcg_bridge_stale_surface_v1
    where validation_status = 'BLOCKED_NO_TARGET'
  ) as hard_gate_failure_count;

rollback;
