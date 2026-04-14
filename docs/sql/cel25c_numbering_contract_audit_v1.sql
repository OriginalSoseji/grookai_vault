-- CEL25C_CLASSIC_COLLECTION_NUMBERING_CONTRACT_AUDIT_V1
-- Read-only contract audit for Classic Collection numbering conflicts in cel25c.

begin;

create temp view cel25c_contract_target_set_v1 as
select
  s.id as set_id,
  s.code as set_code,
  s.name as set_name
from public.sets s
where s.code = 'cel25c';

create temp view cel25c_contract_canonical_surface_v1 as
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  cp.gv_id
from public.card_prints cp
join cel25c_contract_target_set_v1 target
  on target.set_id = cp.set_id
where cp.gv_id is not null
order by
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.name,
  cp.id;

create temp view cel25c_contract_duplicate_numbers_all_rows_v1 as
select
  cp.number_plain,
  count(*)::int as rows_per_number,
  array_agg(cp.name order by cp.name) as names
from public.card_prints cp
join cel25c_contract_target_set_v1 target
  on target.set_id = cp.set_id
group by cp.number_plain
having count(*) > 1
order by
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.number_plain;

create temp view cel25c_contract_duplicate_numbers_canonical_v1 as
select
  cp.number_plain,
  count(*)::int as rows_per_number,
  array_agg(cp.name order by cp.name) as names
from public.card_prints cp
join cel25c_contract_target_set_v1 target
  on target.set_id = cp.set_id
where cp.gv_id is not null
group by cp.number_plain
having count(*) > 1
order by
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.number_plain;

create temp view cel25c_contract_conflict_family_db_v1 as
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  cp.gv_id,
  case
    when cp.gv_id is null then 'placeholder'
    else 'canonical'
  end as row_type
from public.card_prints cp
join cel25c_contract_target_set_v1 target
  on target.set_id = cp.set_id
where cp.name in ('Venusaur', 'Here Comes Team Rocket!', 'Rocket''s Zapdos', 'Claydol')
order by cp.name, cp.gv_id is null, cp.id;

create temp view cel25c_contract_conflict_family_raw_v1 as
select
  coalesce(ri.payload->>'_external_id', ri.payload->>'id') as external_id,
  ri.payload->>'name' as raw_name,
  ri.payload->>'number' as raw_number,
  regexp_replace(regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', ''), '^0+', '') as raw_number_numerator,
  ri.payload->>'set' as raw_set,
  ri.payload->>'set_name' as raw_set_name,
  ri.payload->>'rarity' as raw_rarity
from public.raw_imports ri
where ri.source = 'justtcg'
  and ri.payload->>'_kind' = 'card'
  and ri.payload->>'set' = 'celebrations-classic-collection-pokemon'
  and ri.payload->>'number' like '15/%'
order by ri.payload->>'name';

create temp view cel25c_contract_printed_identity_analysis_v1 as
select
  db.name,
  db.number,
  db.number_plain,
  db.variant_key,
  db.printed_identity_modifier,
  db.gv_id,
  raw.external_id,
  raw.raw_number,
  raw.raw_set_name,
  raw.raw_rarity
from cel25c_contract_conflict_family_db_v1 db
left join cel25c_contract_conflict_family_raw_v1 raw
  on raw.raw_name = db.name
order by db.name, db.row_type, db.card_print_id;

create temp view cel25c_contract_identity_model_state_v1 as
select
  idx_v2.indexdef as uq_card_prints_identity_v2,
  idx_pik.indexdef as card_prints_print_identity_key_uq,
  (
    select count(*)::int
    from cel25c_contract_canonical_surface_v1
    where print_identity_key is null
  ) as canonical_rows_missing_print_identity_key,
  (
    select count(*)::int
    from cel25c_contract_conflict_family_raw_v1
  ) as raw_conflict_family_count,
  (
    select count(*)::int
    from cel25c_contract_conflict_family_db_v1
    where row_type = 'canonical'
  ) as canonical_conflict_family_count,
  (
    select count(*)::int
    from cel25c_contract_conflict_family_db_v1
    where row_type = 'placeholder'
  ) as placeholder_conflict_family_count
from pg_indexes idx_v2
join pg_indexes idx_pik
  on idx_pik.indexname = 'card_prints_print_identity_key_uq'
where idx_v2.schemaname = 'public'
  and idx_v2.tablename = 'card_prints'
  and idx_v2.indexname = 'uq_card_prints_identity_v2'
  and idx_pik.schemaname = 'public'
  and idx_pik.tablename = 'card_prints';

create temp view cel25c_contract_option_evaluation_v1 as
select
  'OPTION_A'::text as option_code,
  'SUFFIX_EXPANSION'::text as strategy,
  'no'::text as preserves_printed_identity_truth,
  'no'::text as avoids_artificial_suffixing,
  'yes'::text as deterministic,
  'no'::text as required_schema_change,
  'rejected'::text as decision,
  'Artificial 15a/15b-style suffixes would overwrite printed identity with synthetic numbering.'::text as rationale
union all
select
  'OPTION_B'::text,
  'NAME_INCLUSIVE_IDENTITY'::text,
  'yes'::text,
  'yes'::text,
  'yes'::text,
  'yes'::text,
  'rejected'::text,
  'Using normalized_name directly in the canonical uniqueness key is too broad and pushes text normalization into the primary identity contract for all sets.'
union all
select
  'OPTION_C'::text,
  'PRINT_IDENTITY_KEY_EXTENSION'::text,
  'yes'::text,
  'yes'::text,
  'yes'::text,
  'yes'::text,
  'selected'::text,
  'A dedicated printed identity key can distinguish same-set same-number Classic Collection cards without inventing fake suffixes. The column and unique index scaffold already exist, but the current uniqueness contract and current backfill format are insufficient.'
union all
select
  'OPTION_D'::text,
  'SPECIAL_SET_CONTRACT'::text,
  'yes'::text,
  'yes'::text,
  'partial'::text,
  'partial'::text,
  'rejected'::text,
  'Local cel25c exception logic would solve only one set family and still leave the core canonical identity model inconsistent.'
;

create temp view cel25c_contract_final_decision_v1 as
select
  '15'::text as conflict_number,
  4::int as conflict_row_count,
  true as identity_model_gap,
  'PRINT_IDENTITY_KEY_EXTENSION'::text as selected_contract_strategy,
  'yes'::text as required_schema_change,
  'PLAN_PRINT_IDENTITY_KEY_UNIQUENESS_AND_GVID_RULES'::text as required_next_action,
  'CEL25C_PRINT_IDENTITY_KEY_SCHEMA_AND_GVID_PLAN_V1'::text as next_execution_unit,
  case
    when (select raw_conflict_family_count from cel25c_contract_identity_model_state_v1) = 4
      and (select canonical_rows_missing_print_identity_key from cel25c_contract_identity_model_state_v1) > 0
      and exists (
        select 1
        from cel25c_contract_option_evaluation_v1
        where strategy = 'PRINT_IDENTITY_KEY_EXTENSION'
          and decision = 'selected'
      )
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: full set numbering surface.
select
  card_print_id,
  name,
  number,
  number_plain,
  variant_key,
  gv_id
from cel25c_contract_canonical_surface_v1;

-- Phase 2A: duplicate number detection across all cel25c rows.
select
  number_plain,
  rows_per_number,
  names
from cel25c_contract_duplicate_numbers_all_rows_v1;

-- Phase 2B: duplicate number detection across canonical cel25c rows only.
select
  number_plain,
  rows_per_number,
  names
from cel25c_contract_duplicate_numbers_canonical_v1;

-- Phase 3A: printed identity analysis in the conflict family.
select
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id,
  raw_number,
  raw_set_name,
  raw_rarity
from cel25c_contract_printed_identity_analysis_v1;

-- Phase 3B: upstream 15-family evidence.
select
  external_id,
  raw_name,
  raw_number,
  raw_number_numerator,
  raw_set,
  raw_set_name,
  raw_rarity
from cel25c_contract_conflict_family_raw_v1;

-- Phase 4: current identity-model limitation.
select
  uq_card_prints_identity_v2,
  card_prints_print_identity_key_uq,
  canonical_rows_missing_print_identity_key,
  raw_conflict_family_count,
  canonical_conflict_family_count,
  placeholder_conflict_family_count
from cel25c_contract_identity_model_state_v1;

-- Phase 5: contract options.
select
  option_code,
  strategy,
  preserves_printed_identity_truth,
  avoids_artificial_suffixing,
  deterministic,
  required_schema_change,
  decision,
  rationale
from cel25c_contract_option_evaluation_v1
order by option_code;

-- Phase 6-7: final contract output.
select
  conflict_number,
  conflict_row_count,
  identity_model_gap,
  selected_contract_strategy,
  required_schema_change,
  required_next_action,
  next_execution_unit
from cel25c_contract_final_decision_v1;

-- Final summary.
select
  conflict_number,
  conflict_row_count,
  identity_model_gap,
  selected_contract_strategy,
  required_schema_change,
  required_next_action,
  next_execution_unit,
  audit_status
from cel25c_contract_final_decision_v1;

rollback;
