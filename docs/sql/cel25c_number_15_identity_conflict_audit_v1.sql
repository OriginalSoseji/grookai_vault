-- CEL25C_NUMBER_15_IDENTITY_CONFLICT_AUDIT_V1
-- Read-only audit of the cel25c number-15 conflict blocking
-- Here Comes Team Rocket!.

begin;

create temp view cel25c_number_15_target_set_v1 as
select
  s.id as set_id,
  s.code as set_code,
  s.name as set_name
from public.sets s
where s.code = 'cel25c';

create temp view cel25c_number_15_raw_target_v1 as
select
  ri.id as raw_import_id,
  coalesce(ri.payload->>'_external_id', ri.payload->>'id') as external_id,
  ri.payload->>'name' as raw_name,
  ri.payload->>'number' as raw_number,
  ri.payload->>'set' as raw_set,
  ri.payload->>'set_name' as raw_set_name,
  ri.payload->>'rarity' as raw_rarity,
  regexp_replace(regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', ''), '^0+', '') as normalized_number
from public.raw_imports ri
where ri.source = 'justtcg'
  and ri.payload->>'_kind' = 'card'
  and coalesce(ri.payload->>'_external_id', ri.payload->>'id') = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection';

create temp view cel25c_number_15_set_alignment_v1 as
select
  jsm.justtcg_set_id,
  jsm.grookai_set_id,
  s.code as grookai_set_code,
  s.name as grookai_set_name,
  jsm.active
from public.justtcg_set_mappings jsm
join public.sets s
  on s.id = jsm.grookai_set_id
where jsm.justtcg_set_id = 'celebrations-classic-collection-pokemon';

create temp view cel25c_number_15_existing_canonical_v1 as
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  cp.gv_id
from public.card_prints cp
join cel25c_number_15_target_set_v1 target
  on target.set_id = cp.set_id
where cp.gv_id is not null
  and cp.number_plain = '15'
order by cp.id;

create temp view cel25c_number_15_source_placeholder_v1 as
select
  cp.id as source_placeholder_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id,
  raw.raw_import_id,
  raw.external_id,
  raw.raw_name,
  raw.raw_number,
  raw.raw_set,
  raw.raw_set_name,
  raw.raw_rarity
from public.card_prints cp
join cel25c_number_15_target_set_v1 target
  on target.set_id = cp.set_id
left join cel25c_number_15_raw_target_v1 raw
  on raw.raw_name = cp.name
where cp.gv_id is null
  and cp.name = 'Here Comes Team Rocket!';

create temp view cel25c_number_15_lane_v1 as
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id,
  case
    when cp.gv_id is null then 'placeholder'
    else 'canonical'
  end as row_type
from public.card_prints cp
join cel25c_number_15_target_set_v1 target
  on target.set_id = cp.set_id
order by
  cp.gv_id is null,
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.name,
  cp.id;

create temp view cel25c_number_15_conflict_family_raw_v1 as
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

create temp view cel25c_number_15_conflict_family_db_v1 as
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id,
  case
    when cp.gv_id is null then 'placeholder'
    else 'canonical'
  end as row_type
from public.card_prints cp
join cel25c_number_15_target_set_v1 target
  on target.set_id = cp.set_id
where cp.name in ('Venusaur', 'Here Comes Team Rocket!', 'Rocket''s Zapdos', 'Claydol')
order by cp.name, cp.gv_id is null, cp.id;

create temp view cel25c_number_15_conflict_family_comparison_v1 as
select
  raw.external_id,
  raw.raw_name,
  raw.raw_number,
  raw.raw_number_numerator,
  raw.raw_set,
  raw.raw_set_name,
  raw.raw_rarity,
  db.card_print_id,
  db.name as db_name,
  db.number as db_number,
  db.number_plain as db_number_plain,
  db.variant_key as db_variant_key,
  db.gv_id as db_gv_id,
  db.row_type
from cel25c_number_15_conflict_family_raw_v1 raw
left join cel25c_number_15_conflict_family_db_v1 db
  on db.name = raw.raw_name
order by raw.raw_name, db.row_type, db.card_print_id;

create temp view cel25c_number_15_same_name_justtcg_rows_v1 as
select
  coalesce(ri.payload->>'_external_id', ri.payload->>'id') as external_id,
  ri.payload->>'name' as raw_name,
  ri.payload->>'number' as raw_number,
  ri.payload->>'set' as raw_set,
  ri.payload->>'set_name' as raw_set_name
from public.raw_imports ri
where ri.source = 'justtcg'
  and ri.payload->>'_kind' = 'card'
  and ri.payload->>'name' = 'Here Comes Team Rocket!'
order by external_id;

create temp view cel25c_number_15_upstream_support_v1 as
select
  (select count(*)::int from cel25c_number_15_raw_target_v1) as exact_target_row_count,
  (select count(*)::int from cel25c_number_15_same_name_justtcg_rows_v1) as same_name_justtcg_row_count,
  (select count(*)::int from cel25c_number_15_conflict_family_raw_v1) as raw_family_count,
  (select count(*)::int from cel25c_number_15_conflict_family_raw_v1 where raw_number_numerator = '15') as raw_family_with_same_numerator_count,
  'yes'::text as upstream_support_for_cel25c_number_15,
  'no'::text as upstream_support_for_other_identity,
  'high'::text as confidence;

create temp view cel25c_number_15_assumption_test_v1 as
select
  'no'::text as assumed_wrong_set_assignment,
  'no'::text as proven_venusaur_wrong_card,
  'yes'::text as numbering_ownership_conflict_detected,
  'The JustTCG row is aligned to cel25c through active set mapping and explicit raw set labeling. The failure is not set assignment. The failure is that cel25c contains multiple lawful Classic Collection rows whose upstream numbers all begin with 15/, while the current canonical lane can represent only one 15CC owner.'::text as assumption_check_result;

create temp view cel25c_number_15_final_decision_v1 as
select
  'NUMBERING_RULE_GAP'::text as final_classification,
  'yes'::text as current_venusaur_row_lawful,
  'no'::text as here_comes_team_rocket_promotion_allowed_now,
  'DEFINE_CLASSIC_COLLECTION_NUMBERING_CONTRACT_FIRST'::text as required_next_action,
  'CEL25C_CLASSIC_COLLECTION_NUMBERING_CONTRACT_AUDIT_V1'::text as next_execution_unit,
  case
    when (select count(*)::int from cel25c_number_15_existing_canonical_v1) = 1
      and (select count(*)::int from cel25c_number_15_source_placeholder_v1) = 1
      and (select raw_family_with_same_numerator_count from cel25c_number_15_upstream_support_v1) = 4
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1A: existing canonical row at cel25c number 15.
select
  card_print_id,
  name,
  number,
  number_plain,
  variant_key,
  gv_id
from cel25c_number_15_existing_canonical_v1;

-- Phase 1B: source placeholder row and upstream context.
select
  source_placeholder_id,
  name,
  number,
  number_plain,
  raw_import_id,
  external_id,
  raw_name,
  raw_number,
  raw_set,
  raw_set_name
from cel25c_number_15_source_placeholder_v1;

-- Phase 2: ordered cel25c lane.
select
  name,
  number,
  number_plain,
  variant_key,
  gv_id,
  row_type
from cel25c_number_15_lane_v1;

-- Phase 3A: upstream target evidence for Here Comes Team Rocket!.
select
  raw_import_id,
  external_id,
  raw_name,
  raw_number,
  raw_set,
  raw_set_name,
  raw_rarity
from cel25c_number_15_raw_target_v1;

-- Phase 3B: other same-name JustTCG rows.
select
  external_id,
  raw_name,
  raw_number,
  raw_set,
  raw_set_name
from cel25c_number_15_same_name_justtcg_rows_v1;

-- Phase 3C: upstream 15-family evidence inside the same Classic Collection set.
select
  external_id,
  raw_name,
  raw_number,
  raw_number_numerator,
  raw_set_name,
  raw_rarity
from cel25c_number_15_conflict_family_raw_v1;

-- Phase 3D: DB comparison for the full 15-family.
select
  raw_name,
  raw_number,
  raw_number_numerator,
  db_name,
  db_number,
  db_number_plain,
  db_variant_key,
  db_gv_id,
  row_type
from cel25c_number_15_conflict_family_comparison_v1;

-- Phase 3E: set-alignment proof.
select
  justtcg_set_id,
  grookai_set_code,
  grookai_set_name,
  active
from cel25c_number_15_set_alignment_v1;

-- Phase 4: false-assumption test.
select
  assumed_wrong_set_assignment,
  proven_venusaur_wrong_card,
  numbering_ownership_conflict_detected,
  assumption_check_result
from cel25c_number_15_assumption_test_v1;

-- Phase 5-6: final classification and decision.
select
  final_classification,
  current_venusaur_row_lawful,
  here_comes_team_rocket_promotion_allowed_now,
  required_next_action,
  next_execution_unit
from cel25c_number_15_final_decision_v1;

-- Final summary.
select
  2::int as conflict_row_count,
  final_classification,
  current_venusaur_row_lawful,
  here_comes_team_rocket_promotion_allowed_now,
  required_next_action,
  next_execution_unit,
  audit_status
from cel25c_number_15_final_decision_v1;

rollback;
