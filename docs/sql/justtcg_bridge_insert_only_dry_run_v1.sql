-- JUSTTCG_BRIDGE_INSERT_ONLY_APPLY_V1
-- Read-only dry run for the deterministic insert-only JustTCG bridge surface.
--
-- Purpose:
-- 1. isolate the 26 newly matchable rows that already have exact canonical targets
-- 2. prove the insert lane has zero ambiguity and zero collisions
-- 3. preserve the 3 stale remap rows as blocked read-only surface

begin;

create temp view justtcg_bridge_insert_only_surface_v1 as
with base_surface as (
  select
    edc.upstream_id as external_id,
    edc.card_print_id as target_card_print_id,
    cp.gv_id as target_gv_id,
    min(edc.raw_import_id)::bigint as raw_import_id,
    min(edc.name_raw) as raw_name,
    min(edc.number_raw) as raw_number,
    min(edc.set_id) as raw_set,
    min(coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '')) as proof_reason,
    min(coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '')) as matched_via
  from public.external_discovery_candidates edc
  join public.card_prints cp
    on cp.id = edc.card_print_id
  where edc.source = 'justtcg'
    and edc.card_print_id is not null
    and cp.gv_id is not null
    and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
    and coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') = 'tcgplayer_external_mapping'
  group by edc.upstream_id, edc.card_print_id, cp.gv_id
),
candidate_counts as (
  select
    external_id,
    count(distinct target_card_print_id)::int as target_candidate_count
  from base_surface
  group by external_id
),
existing_mappings as (
  select
    em.external_id,
    count(*)::int as existing_mapping_count,
    min(em.id)::bigint as existing_mapping_id,
    min(em.card_print_id::text)::uuid as existing_card_print_id
  from public.external_mappings em
  where em.source = 'justtcg'
  group by em.external_id
)
select
  bs.external_id,
  bs.target_card_print_id,
  bs.target_gv_id,
  bs.raw_import_id,
  bs.raw_name,
  bs.raw_number,
  bs.raw_set,
  bs.proof_reason,
  bs.matched_via,
  cc.target_candidate_count,
  coalesce(em.existing_mapping_count, 0)::int as existing_mapping_count,
  em.existing_mapping_id,
  em.existing_card_print_id,
  case
    when cc.target_candidate_count <> 1 then 'BLOCKED_AMBIGUOUS'
    when coalesce(em.existing_mapping_count, 0) > 1 then 'BLOCKED_EXISTING_CONFLICT'
    when em.existing_mapping_id is not null and em.existing_card_print_id <> bs.target_card_print_id then 'BLOCKED_EXISTING_CONFLICT'
    when em.existing_mapping_id is not null and em.existing_card_print_id = bs.target_card_print_id then 'ALREADY_INSERTED'
    else 'SAFE_INSERT'
  end as validation_status
from base_surface bs
join candidate_counts cc
  on cc.external_id = bs.external_id
left join existing_mappings em
  on em.external_id = bs.external_id
order by bs.raw_import_id, bs.external_id;

create temp view justtcg_bridge_stale_blocked_v1 as
with stale as (
  select
    em.id as external_mapping_id,
    em.external_id,
    em.card_print_id as old_card_print_id
  from public.external_mappings em
  join public.card_prints cp
    on cp.id = em.card_print_id
  where em.source = 'justtcg'
    and em.active is true
    and cp.gv_id is null
),
staged_targets as (
  select
    edc.upstream_id as external_id,
    count(distinct edc.card_print_id)::int as target_candidate_count,
    min(edc.card_print_id::text)::uuid as candidate_card_print_id
  from public.external_discovery_candidates edc
  join public.card_prints cp
    on cp.id = edc.card_print_id
  where edc.source = 'justtcg'
    and edc.card_print_id is not null
    and cp.gv_id is not null
    and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
  group by edc.upstream_id
)
select
  stale.external_mapping_id,
  stale.external_id,
  stale.old_card_print_id,
  staged.candidate_card_print_id as target_card_print_id,
  coalesce(staged.target_candidate_count, 0)::int as target_candidate_count,
  case
    when coalesce(staged.target_candidate_count, 0) = 0 then 'BLOCKED_NO_TARGET'
    when staged.target_candidate_count = 1 then 'READY'
    else 'BLOCKED_AMBIGUOUS'
  end as validation_status
from stale
left join staged_targets staged
  on staged.external_id = stale.external_id
order by stale.external_mapping_id;

-- Unit A row-level proof.
select
  external_id,
  target_card_print_id,
  target_gv_id,
  validation_status
from justtcg_bridge_insert_only_surface_v1
order by raw_import_id, external_id;

-- Unit B row-level blocked stale surface.
select
  external_mapping_id,
  external_id,
  old_card_print_id,
  target_card_print_id,
  validation_status
from justtcg_bridge_stale_blocked_v1
order by external_mapping_id;

-- Summary proof.
select
  count(*)::int as audited_insert_surface_count,
  count(*) filter (where validation_status = 'SAFE_INSERT')::int as insert_ready_count,
  count(*) filter (where validation_status = 'ALREADY_INSERTED')::int as already_inserted_count,
  count(*) filter (where validation_status = 'BLOCKED_AMBIGUOUS')::int as ambiguity_count,
  count(*) filter (where validation_status = 'BLOCKED_EXISTING_CONFLICT')::int as collision_count
from justtcg_bridge_insert_only_surface_v1;

select
  count(*) filter (where validation_status <> 'READY')::int as stale_rows_blocked
from justtcg_bridge_stale_blocked_v1;

rollback;
