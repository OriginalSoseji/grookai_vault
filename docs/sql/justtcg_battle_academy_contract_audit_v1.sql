-- JUSTTCG_BATTLE_ACADEMY_STALE_MAPPING_CONTRACT_AUDIT_V1
-- Read-only contract audit for the two Battle Academy-derived stale JustTCG
-- rows that currently appear remappable under naive name+number logic but are
-- unlawful to map into canonical card_prints.
--
-- Purpose:
-- 1. extract the exact two Battle Academy stale rows
-- 2. show the underlying canonical candidate surfaced by naive matching
-- 3. prove why that candidate is not a lawful remap target
-- 4. define the permanent fail-closed contract for Battle Academy bridge rows

begin;

create temp view justtcg_battle_academy_stale_rows_v1 as
with target_ids as (
  select
    unnest(
      array[
        'pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo',
        'pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo'
      ]::text[]
    ) as external_id
)
select
  em.id as external_mapping_id,
  em.external_id,
  ri.id as raw_import_id,
  ri.payload->>'name' as raw_name,
  ri.payload->>'number' as raw_number,
  ri.payload->>'set' as raw_set,
  ri.payload->>'set_name' as raw_set_name,
  ri.payload->>'rarity' as raw_rarity,
  lower(
    regexp_replace(
      trim(
        regexp_replace(
          coalesce(ri.payload->>'name', ''),
          '\s*-\s*[0-9A-Za-z/]+\s*\(#.*\)\s*$',
          '',
          'g'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name,
  regexp_replace(
    regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', ''),
    '^0+',
    ''
  ) as normalized_number,
  em.card_print_id as current_card_print_id,
  mapped_cp.gv_id as current_gv_id,
  mapped_cp.name as current_name,
  mapped_cp.number as current_number,
  mapped_cp.number_plain as current_number_plain,
  coalesce(mapped_cp.variant_key, '') as current_variant_key,
  mapped_set.code as current_set_code,
  coalesce(ri.payload->>'name', '') ~ '\(#\d+\s+Pikachu Stamped\)' as has_overlay_stamp_marker
from target_ids t
join public.external_mappings em
  on em.source = 'justtcg'
 and em.active is true
 and em.external_id = t.external_id
join public.card_prints mapped_cp
  on mapped_cp.id = em.card_print_id
join public.sets mapped_set
  on mapped_set.id = mapped_cp.set_id
left join public.raw_imports ri
  on ri.source = 'justtcg'
 and coalesce(ri.payload->>'id', ri.payload->>'_external_id') = em.external_id
order by em.id;

create temp view justtcg_battle_academy_underlying_candidates_v1 as
select
  stale.external_id,
  cp.id as candidate_card_print_id,
  cp.gv_id as candidate_gv_id,
  cp.name as candidate_name,
  cp.number as candidate_number,
  cp.number_plain as candidate_number_plain,
  coalesce(cp.variant_key, '') as candidate_variant_key,
  s.code as candidate_set_code,
  'exact'::text as match_type,
  'normalized name + normalized number point at the underlying Sword & Shield base print'::text as naive_match_reason
from justtcg_battle_academy_stale_rows_v1 stale
join public.card_prints cp
  on cp.gv_id is not null
join public.sets s
  on s.id = cp.set_id
where s.code = 'swsh1'
  and cp.name = 'Yamper'
  and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_number
order by stale.external_id;

create temp view justtcg_battle_academy_contract_analysis_v1 as
select
  stale.external_mapping_id,
  stale.external_id,
  stale.raw_name,
  stale.raw_number,
  stale.raw_set,
  stale.normalized_name,
  stale.normalized_number,
  stale.current_card_print_id,
  stale.current_name,
  stale.current_number,
  stale.current_set_code,
  candidate.candidate_card_print_id,
  candidate.candidate_gv_id,
  candidate.candidate_name,
  candidate.candidate_number,
  candidate.candidate_set_code,
  candidate.match_type,
  'Name + number match the underlying Sword & Shield Yamper (`GV-PK-SSH-74`), so a naive bridge could incorrectly treat it as deterministically reusable canon.'::text as why_naive_logic_looks_valid,
  'The raw label contains Battle Academy overlay evidence (`#1 Pikachu Stamped` / `#58 Pikachu Stamped`). Under the Battle Academy contract, that evidence belongs to a product-layer overlay identity and must not collapse into non-BA canon.'::text as why_match_is_invalid,
  'BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING'::text as root_cause_definition,
  'NON_CANONICAL_UPSTREAM'::text as classification,
  'BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING'::text as reason,
  'DO_NOT_REMAP'::text as allowed_action
from justtcg_battle_academy_stale_rows_v1 stale
left join justtcg_battle_academy_underlying_candidates_v1 candidate
  on candidate.external_id = stale.external_id
order by stale.external_mapping_id;

create temp view justtcg_battle_academy_contract_rules_v1 as
select
  1 as rule_order,
  'Battle Academy-derived JustTCG rows must never remap into canonical `card_prints` through cross-set name + number reuse.'::text as system_rule
union all
select
  2 as rule_order,
  'Battle Academy overlay markers such as `(#1 Pikachu Stamped)` and `(#58 Pikachu Stamped)` are not canonical `card_print` identity and therefore must not be translated into variant_key, suffix, or cross-set remap logic.'::text as system_rule
union all
select
  3 as rule_order,
  'If a JustTCG row belongs to Battle Academy product context and only matches an underlying non-BA print, classify it as `NON_CANONICAL_UPSTREAM` for bridge purposes and block remap.'::text as system_rule
union all
select
  4 as rule_order,
  'Future support, if desired, requires a separate product-layer identity model outside `card_prints`; until then the only lawful action is `DO_NOT_REMAP`.'::text as system_rule;

-- Phase 1: target row extraction.
select
  external_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number,
  current_card_print_id,
  current_name,
  current_number,
  current_set_code
from justtcg_battle_academy_stale_rows_v1
order by external_mapping_id;

-- Phase 2: canonical comparison.
select
  external_id,
  candidate_card_print_id,
  candidate_gv_id,
  candidate_name,
  candidate_number,
  candidate_set_code,
  match_type,
  naive_match_reason
from justtcg_battle_academy_underlying_candidates_v1
order by external_id;

-- Phase 3-6: contract analysis.
select
  external_id,
  why_naive_logic_looks_valid,
  why_match_is_invalid,
  root_cause_definition,
  classification,
  reason,
  allowed_action
from justtcg_battle_academy_contract_analysis_v1
order by external_mapping_id;

-- Phase 5: formal system rules.
select
  rule_order,
  system_rule
from justtcg_battle_academy_contract_rules_v1
order by rule_order;

-- Phase 7: final classification output.
select
  external_id,
  classification,
  reason,
  allowed_action
from justtcg_battle_academy_contract_analysis_v1
order by external_mapping_id;

-- Final summary.
select
  (select count(*)::int from justtcg_battle_academy_contract_analysis_v1) as battle_academy_row_count,
  'NON_CANONICAL_UPSTREAM'::text as classification,
  case
    when (select count(*) from justtcg_battle_academy_contract_analysis_v1) = 2
      then 'yes'
    else 'no'
  end as contract_defined,
  'no'::text as canonical_mapping_allowed,
  (
    select jsonb_agg(system_rule order by rule_order)
    from justtcg_battle_academy_contract_rules_v1
  ) as final_system_rules,
  'JUSTTCG_CLASSIC_COLLECTION_STALE_MAPPING_CONTRACT_AUDIT_V1'::text as next_execution_unit,
  case
    when (select count(*) from justtcg_battle_academy_contract_analysis_v1) = 2
      and (select count(*) from justtcg_battle_academy_contract_analysis_v1 where candidate_gv_id is null) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

rollback;
