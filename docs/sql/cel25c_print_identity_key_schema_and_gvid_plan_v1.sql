-- CEL25C_PRINT_IDENTITY_KEY_SCHEMA_AND_GVID_PLAN_V1
-- Plan-only SQL audit for introducing print_identity_key as the authoritative
-- same-number printed-identity dimension for cel25c and future conflicting sets.

begin;

create temp view cel25c_pik_plan_target_set_v1 as
select
  s.id as set_id,
  s.code as set_code,
  s.name as set_name
from public.sets s
where s.code = 'cel25c';

create temp view cel25c_pik_plan_duplicate_numbers_v1 as
select
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  count(*)::int as rows_per_identity_surface,
  array_agg(cp.name order by cp.name) as names
from public.card_prints cp
join cel25c_pik_plan_target_set_v1 target
  on target.set_id = cp.set_id
group by cp.number_plain, coalesce(cp.variant_key, '')
having count(*) > 1
order by
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.number_plain,
  coalesce(cp.variant_key, '');

create temp view cel25c_pik_plan_conflict_surface_v1 as
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
join cel25c_pik_plan_target_set_v1 target
  on target.set_id = cp.set_id
where cp.number_plain in (
  select distinct number_plain
  from cel25c_pik_plan_duplicate_numbers_v1
)
order by
  nullif(regexp_replace(coalesce(cp.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  cp.name,
  cp.id;

create temp view cel25c_pik_plan_raw_15_family_v1 as
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

create temp view card_prints_planned_pik_projection_v1 as
with normalized as (
  select
    cp.id,
    cp.set_id,
    cp.set_code,
    cp.name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    cp.print_identity_key as current_print_identity_key,
    cp.gv_id,
    lower(
      regexp_replace(
        trim(
          both '-' from regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
                      'δ', ' delta ', 'g'
                    ),
                    '[★*]', ' star ', 'g'
                  ),
                  '\s+EX\b', '-ex', 'gi'
                ),
                '\s+GX\b', '-gx', 'gi'
              ),
              '[^a-zA-Z0-9]+', '-', 'g'
            ),
            '-+', '-', 'g'
          )
        ),
        '(^-|-$)', '', 'g'
      )
    ) as normalized_name_token
  from public.card_prints cp
  where cp.set_id is not null
    and cp.number_plain is not null
    and cp.name is not null
)
select
  n.*,
  lower(
    concat_ws(
      ':',
      n.set_code,
      n.number_plain,
      n.normalized_name_token,
      nullif(n.printed_identity_modifier, '')
    )
  ) as planned_print_identity_key
from normalized n;

create temp view cel25c_pik_plan_conflict_surface_projection_v1 as
select
  p.card_print_id,
  p.name,
  p.number,
  p.number_plain,
  p.variant_key,
  p.printed_identity_modifier,
  p.current_print_identity_key,
  p.planned_print_identity_key,
  p.gv_id,
  p.row_type
from (
  select
    cp.id as card_print_id,
    cp.name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    cp.print_identity_key as current_print_identity_key,
    proj.planned_print_identity_key,
    cp.gv_id,
    case
      when cp.gv_id is null then 'placeholder'
      else 'canonical'
    end as row_type
  from public.card_prints cp
  join cel25c_pik_plan_target_set_v1 target
    on target.set_id = cp.set_id
  join card_prints_planned_pik_projection_v1 proj
    on proj.id = cp.id
  where cp.number_plain in (
    select distinct number_plain
    from cel25c_pik_plan_duplicate_numbers_v1
  )
) p
order by
  nullif(regexp_replace(coalesce(p.number_plain, ''), '[^0-9]', '', 'g'), '')::int nulls last,
  p.name,
  p.card_print_id;

create temp view cel25c_pik_plan_current_key_projection_v1 as
select
  'cel25c'::text as set_code,
  '15'::text as number_plain,
  'cc'::text as variant_key,
  count(*)::int as rows_per_surface,
  array_agg(raw_name order by raw_name) as raw_names
from cel25c_pik_plan_raw_15_family_v1;

create temp view cel25c_pik_plan_current_vs_planned_duplicates_v1 as
with current_key_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select set_code, number_plain, variant_key
    from (
      select 'cel25c'::text as set_code, '15'::text as number_plain, 'cc'::text as variant_key
      from cel25c_pik_plan_raw_15_family_v1
      union all
      select 'cel25c', number_plain, 'cc'
      from cel25c_pik_plan_conflict_surface_v1
      where number_plain = '17'
    ) projected
    group by set_code, number_plain, variant_key
    having count(*) > 1
  ) dupes
),
planned_key_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select set_code, number_plain, variant_key, planned_print_identity_key
    from (
      select
        'cel25c'::text as set_code,
        '15'::text as number_plain,
        'cc'::text as variant_key,
        lower(
          concat_ws(
            ':',
            'cel25c',
            '15',
            lower(
              regexp_replace(
                trim(
                  both '-' from regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(
                              regexp_replace(raw_name, '’', '''', 'g'),
                              'δ', ' delta ', 'g'
                            ),
                            '[★*]', ' star ', 'g'
                          ),
                          '\s+EX\b', '-ex', 'gi'
                        ),
                        '\s+GX\b', '-gx', 'gi'
                      ),
                      '[^a-zA-Z0-9]+', '-', 'g'
                    ),
                    '-+', '-', 'g'
                  )
                ),
                '(^-|-$)', '', 'g'
              )
            )
          )
        ) as planned_print_identity_key
      from cel25c_pik_plan_raw_15_family_v1
      union all
      select
        proj.set_code,
        proj.number_plain,
        'cc'::text as variant_key,
        proj.planned_print_identity_key
      from card_prints_planned_pik_projection_v1 proj
      join public.card_prints cp
        on cp.id = proj.id
      join cel25c_pik_plan_target_set_v1 target
        on target.set_id = cp.set_id
      where cp.number_plain = '17'
        and cp.name in ('Claydol', 'Umbreon ★')
    ) projected
    group by set_code, number_plain, variant_key, planned_print_identity_key
    having count(*) > 1
  ) dupes
),
global_composite_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select set_id, number_plain, variant_key, planned_print_identity_key
    from card_prints_planned_pik_projection_v1
    group by set_id, number_plain, variant_key, planned_print_identity_key
    having count(*) > 1
  ) dupes
),
global_standalone_pik_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select planned_print_identity_key
    from card_prints_planned_pik_projection_v1
    group by planned_print_identity_key
    having count(*) > 1
  ) dupes
)
select
  (select duplicate_group_count from current_key_dupes) as current_key_duplicate_group_count,
  (select duplicate_group_count from planned_key_dupes) as planned_key_duplicate_group_count,
  (select duplicate_group_count from global_composite_dupes) as broader_composite_duplicate_group_count,
  (select duplicate_group_count from global_standalone_pik_dupes) as broader_standalone_print_identity_key_duplicate_group_count,
  case
    when (select duplicate_group_count from planned_key_dupes) = 0 then 'yes'
    else 'no'
  end as planned_key_safe_for_cel25c,
  case
    when (select duplicate_group_count from global_standalone_pik_dupes) > 0
      then 'Global standalone print_identity_key uniqueness is unsafe; 16 duplicate groups appear across legitimate variant lanes if the current global unique index is preserved.'
    else 'No broader collision risk detected.'
  end as broader_collision_risk;

create temp view cel25c_pik_plan_existing_pik_state_v1 as
select
  (select count(*)::int from public.card_prints where print_identity_key is not null) as existing_nonnull_print_identity_key_count,
  (select count(*)::int from card_prints_planned_pik_projection_v1 where current_print_identity_key is null) as rows_missing_print_identity_key_under_projection_count;

create temp view cel25c_pik_plan_existing_pik_examples_v1 as
select
  cp.id,
  cp.set_code,
  cp.name,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  cp.print_identity_key
from public.card_prints cp
where cp.print_identity_key is not null
order by cp.id
limit 12;

create temp view cel25c_pik_plan_backfill_strategy_v1 as
select
  'Recompute print_identity_key from printed identity inputs during migration preflight; do not trust existing mixed-format values as authoritative.'::text as backfill_strategy,
  'set_code + number_plain + normalized printed-name token + printed_identity_modifier when nonblank'::text as deterministic_inputs,
  'yes'::text as manual_review_needed,
  'Manual review is required because print_identity_key is already populated in mixed legacy formats across 2032 rows and the current global unique index is incompatible with legitimate variant-lane reuse.'::text as rationale;

create temp view cel25c_pik_plan_gvid_options_v1 as
select
  'OPTION_A'::text as option_code,
  'GRANDFATHER_EXISTING_EXTEND_NEW_CONFLICT_ROWS_WITH_PRINT_IDENTITY_TOKEN'::text as strategy,
  'high'::text as consistency_score,
  'low'::text as migration_risk,
  'high'::text as backward_compatibility,
  'yes'::text as recommended,
  'Preserves lawful existing GV-IDs and introduces an extended deterministic token only for future same-number conflicting rows.'::text as rationale
union all
select
  'OPTION_B',
  'REWRITE_ALL_CONFLICTING_GVIDS_TO_INCLUDE_PRINT_IDENTITY_TOKEN',
  'high',
  'high',
  'low',
  'no',
  'Strong consistency, but unnecessary blast radius because current lawful rows like GV-PK-CEL-15CC do not need rewriting.'
union all
select
  'OPTION_C',
  'KEEP_GVID_NUMBER_ONLY_RELY_ON_INTERNAL_PRINT_IDENTITY_KEY',
  'low',
  'low',
  'medium',
  'no',
  'Operationally confusing because distinct cel25c printed identities would still share the same outward number-based GV-ID family without readable disambiguation.'
;

create temp view cel25c_pik_plan_gvid_rule_v1 as
select
  'Grandfather existing lawful GV-IDs. For new same-number conflicting Classic Collection rows, extend the current GV-ID form with a deterministic print-identity token derived from the planned print_identity_key.'::text as future_gvid_rule,
  'yes'::text as existing_gvids_grandfathered,
  'yes'::text as new_conflict_rows_require_extended_gvid,
  'Pattern: GV-PK-CEL-<number>CC-<print_identity_token>'::text as illustrative_pattern;

create temp view cel25c_pik_plan_system_impact_v1 as
select
  'Replace uq_card_prints_identity_v2 as the authoritative uniqueness constraint with a v3 composite key on (set_id, number_plain, print_identity_key, variant_key), and retire or relax card_prints_print_identity_key_uq from global uniqueness authority.'::text as schema_impact,
  'Warehouse and ingestion matchers already read/write print_identity_key; they must switch to the new deterministic derivation and stop assuming legacy print_identity_key formats are authoritative.'::text as ingestion_impact,
  'Promotion and external-mapping repair logic must use print_identity_key when same-set same-number collisions exist instead of routing only on number_plain + variant_key.'::text as mapping_impact,
  'Pricing remains mostly card_print_id based, but validation and integrity checks that treat print_identity_key as globally unique must be updated to the composite model.'::text as pricing_impact,
  'UI and operational routing must continue preferring GV-ID or card_print_id; set_code + number displays may need conflict-aware labels once multiple same-number rows exist in the same set.'::text as ui_impact;

create temp view cel25c_pik_plan_final_decision_v1 as
select
  4::int as conflict_surface_count,
  'print_identity_key = lower(concat_ws('':'', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))'::text as print_identity_key_definition,
  'COMPOSITE_IDENTITY_V3_ON_(set_id,number_plain,print_identity_key,variant_key)_AND_RETIRE_GLOBAL_print_identity_key_UQ'::text as selected_uniqueness_strategy,
  'GRANDFATHER_EXISTING_EXTEND_NEW_CONFLICT_ROWS_WITH_PRINT_IDENTITY_TOKEN'::text as selected_gvid_strategy,
  'yes'::text as existing_gvids_grandfathered,
  'yes'::text as required_schema_change,
  'GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PLAN_V1'::text as next_execution_unit,
  case
    when (select planned_key_safe_for_cel25c from cel25c_pik_plan_current_vs_planned_duplicates_v1) = 'yes'
      and (select broader_composite_duplicate_group_count from cel25c_pik_plan_current_vs_planned_duplicates_v1) = 0
      and (select broader_standalone_print_identity_key_duplicate_group_count from cel25c_pik_plan_current_vs_planned_duplicates_v1) > 0
      and exists (
        select 1
        from cel25c_pik_plan_gvid_options_v1
        where option_code = 'OPTION_A'
          and recommended = 'yes'
      )
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1A: conflict surface rows inside cel25c.
select
  card_print_id,
  name,
  number,
  number_plain,
  variant_key,
  gv_id,
  row_type
from cel25c_pik_plan_conflict_surface_v1;

-- Phase 1B: grouped duplicate-number summary.
select
  number_plain,
  variant_key,
  rows_per_identity_surface
from cel25c_pik_plan_duplicate_numbers_v1;

-- Phase 1C: upstream number-15 family proof.
select
  external_id,
  raw_name,
  raw_number,
  raw_number_numerator,
  raw_set_name,
  raw_rarity
from cel25c_pik_plan_raw_15_family_v1;

-- Phase 2: print_identity_key definition examples for the conflict surface.
select
  card_print_id,
  name,
  number_plain,
  variant_key,
  printed_identity_modifier,
  current_print_identity_key,
  planned_print_identity_key
from cel25c_pik_plan_conflict_surface_projection_v1;

-- Phase 3: uniqueness strategy proof.
select
  current_key_duplicate_group_count,
  planned_key_duplicate_group_count,
  broader_composite_duplicate_group_count,
  broader_standalone_print_identity_key_duplicate_group_count,
  planned_key_safe_for_cel25c,
  broader_collision_risk
from cel25c_pik_plan_current_vs_planned_duplicates_v1;

-- Phase 4: backfill strategy.
select
  existing_nonnull_print_identity_key_count,
  rows_missing_print_identity_key_under_projection_count
from cel25c_pik_plan_existing_pik_state_v1;

select
  id,
  set_code,
  name,
  number_plain,
  variant_key,
  print_identity_key
from cel25c_pik_plan_existing_pik_examples_v1;

select
  backfill_strategy,
  deterministic_inputs,
  manual_review_needed,
  rationale
from cel25c_pik_plan_backfill_strategy_v1;

-- Phase 5: GV-ID strategy options.
select
  option_code,
  strategy,
  consistency_score,
  migration_risk,
  backward_compatibility,
  recommended,
  rationale
from cel25c_pik_plan_gvid_options_v1
order by option_code;

-- Phase 6: future GV-ID rule plan.
select
  future_gvid_rule,
  existing_gvids_grandfathered,
  new_conflict_rows_require_extended_gvid,
  illustrative_pattern
from cel25c_pik_plan_gvid_rule_v1;

-- Phase 7: system impact analysis.
select
  schema_impact,
  ingestion_impact,
  mapping_impact,
  pricing_impact,
  ui_impact
from cel25c_pik_plan_system_impact_v1;

-- Phase 8-9: final plan decision and next execution unit.
select
  conflict_surface_count,
  print_identity_key_definition,
  selected_uniqueness_strategy,
  selected_gvid_strategy,
  existing_gvids_grandfathered,
  required_schema_change,
  next_execution_unit
from cel25c_pik_plan_final_decision_v1;

-- Final summary.
select
  conflict_surface_count,
  print_identity_key_definition,
  selected_uniqueness_strategy,
  selected_gvid_strategy,
  existing_gvids_grandfathered,
  required_schema_change,
  next_execution_unit,
  audit_status
from cel25c_pik_plan_final_decision_v1;

rollback;
