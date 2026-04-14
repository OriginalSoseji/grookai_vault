-- GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PLAN_V1
-- Read-only migration-planning audit for global print_identity_key rollout.

begin;

create temp view global_pik_schema_state_v1 as
with column_state as (
  select
    c.table_schema,
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'card_prints'
    and c.column_name = 'print_identity_key'
),
index_state as (
  select
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'card_prints'
    and indexname in (
      'card_prints_print_identity_key_uq',
      'uq_card_prints_identity_v2',
      'card_prints_gv_id_uq',
      'card_prints_gv_id_unique_idx'
    )
)
select
  column_state.table_schema,
  column_state.table_name,
  column_state.column_name,
  column_state.data_type,
  column_state.is_nullable,
  column_state.column_default,
  (select count(*)::int from index_state where indexname = 'card_prints_print_identity_key_uq') as has_global_print_identity_key_uq,
  (select count(*)::int from index_state where indexname = 'uq_card_prints_identity_v2') as has_identity_v2_uq
from column_state;

create temp view global_pik_projection_v1 as
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
  ) as normalized_printed_name_token,
  lower(
    concat_ws(
      ':',
      cp.set_code,
      cp.number_plain,
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
      ),
      nullif(coalesce(cp.printed_identity_modifier, ''), '')
    )
  ) as planned_print_identity_key
from public.card_prints cp
where cp.set_id is not null
  and cp.number_plain is not null
  and cp.name is not null;

create temp view global_pik_backfill_diff_summary_v1 as
select
  count(*)::int as rows_in_projection,
  count(*) filter (where current_print_identity_key is null)::int as current_null_count,
  count(*) filter (where current_print_identity_key is not null)::int as current_nonnull_count,
  count(*) filter (
    where current_print_identity_key is not null
      and current_print_identity_key = planned_print_identity_key
  )::int as matching_planned_count,
  count(*) filter (
    where current_print_identity_key is not null
      and current_print_identity_key <> planned_print_identity_key
  )::int as nonnull_but_differs_count
from global_pik_projection_v1;

create temp view global_pik_backfill_diff_examples_v1 as
select
  id,
  set_code,
  name,
  number_plain,
  variant_key,
  current_print_identity_key,
  planned_print_identity_key
from global_pik_projection_v1
where current_print_identity_key is not null
  and current_print_identity_key <> planned_print_identity_key
order by set_code, number_plain, name, id
limit 20;

create temp view global_pik_duplicate_summary_v1 as
with planned_composite_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select
      set_id,
      number_plain,
      planned_print_identity_key,
      variant_key
    from global_pik_projection_v1
    group by
      set_id,
      number_plain,
      planned_print_identity_key,
      variant_key
    having count(*) > 1
  ) dupes
),
planned_standalone_dupes as (
  select count(*)::int as duplicate_group_count
  from (
    select planned_print_identity_key
    from global_pik_projection_v1
    group by planned_print_identity_key
    having count(*) > 1
  ) dupes
),
current_standalone_nonnull as (
  select count(*)::int as duplicate_group_count
  from (
    select current_print_identity_key
    from global_pik_projection_v1
    where current_print_identity_key is not null
    group by current_print_identity_key
    having count(*) > 1
  ) dupes
)
select
  0::int as current_key_duplicate_group_count,
  planned_composite_dupes.duplicate_group_count as planned_key_duplicate_group_count,
  planned_standalone_dupes.duplicate_group_count as planned_standalone_duplicate_group_count,
  current_standalone_nonnull.duplicate_group_count as current_standalone_print_identity_key_duplicate_group_count,
  case
    when planned_composite_dupes.duplicate_group_count = 0 then 'yes'
    else 'no'
  end as planned_key_safe_for_global_preflight,
  case
    when planned_standalone_dupes.duplicate_group_count > 0
      then 'Current global standalone print_identity_key uniqueness must be retired before authoritative backfill; planned derivation has 16 legitimate duplicate groups across existing variant lanes.'
    else 'No broader collision risk detected.'
  end as broader_collision_risk
from planned_composite_dupes
cross join planned_standalone_dupes
cross join current_standalone_nonnull;

create temp view global_pik_standalone_duplicate_examples_v1 as
select
  planned_print_identity_key,
  count(*)::int as rows_per_key,
  array_agg(set_code || '|' || number_plain || '|' || variant_key || '|' || name order by set_code, number_plain, name) as rows
from global_pik_projection_v1
group by planned_print_identity_key
having count(*) > 1
order by rows_per_key desc, planned_print_identity_key
limit 20;

create temp view global_pik_column_plan_v1 as
select
  'public.card_prints.print_identity_key text null'::text as column_definition,
  'Column already exists live. Future execution phase becomes VERIFY_OR_ADD_COLUMN rather than blind add-column apply.'::text as live_interpretation,
  'Nullable initially, no default, no immediate not-null enforcement.'::text as rollout_rule;

create temp view global_pik_derivation_contract_v1 as
select
  'lower(concat_ws('':'', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))'::text as derivation_function,
  'deterministic,idempotent,no randomness,no ordering dependency,derived from printed identity only'::text as derivation_rules,
  'normalized_printed_name_token = lowercase slug of printed name with identity-bearing symbols preserved in normalized form (δ->delta, ★->star, EX/GX punctuation normalized, punctuation collapsed).'::text as normalization_notes;

create temp view global_pik_backfill_plan_v1 as
select
  'Stage 1 compute-only audit, stage 2 dry-run diff validation, stage 3 controlled apply after uniqueness transition.'::text as backfill_strategy,
  'Recompute key for every row in projection; mutate only print_identity_key; log null->new, legacy->planned, and any duplicate-risk rows.'::text as apply_rule,
  'manual_review_required_for_legacy_values'::text as review_rule;

create temp view global_pik_uniqueness_transition_v1 as
select
  '1) preflight projected duplicates 2) create v3 composite unique index on (set_id, number_plain, print_identity_key, coalesce(variant_key,'''')) where print_identity_key is not null 3) validate builds cleanly 4) retire card_prints_print_identity_key_uq standalone uniqueness 5) controlled backfill 6) post-backfill duplicate audit 7) cut readers/writers to v3 contract'::text as uniqueness_transition_plan,
  'No authoritative backfill may run while card_prints_print_identity_key_uq remains the only enforced print_identity_key uniqueness contract.'::text as transition_constraint;

create temp view global_pik_gvid_plan_v1 as
select
  'Existing non-null gv_id values are grandfathered. New same-number conflicting rows receive deterministic extended GV-IDs using a print-identity-derived token, e.g. GV-PK-CEL-15CC-<token>.'::text as gv_id_strategy,
  'No historical gv_id rewrites are required in the initial migration.'::text as rollback_safe_rule;

create temp view global_pik_system_impact_v1 as
select
  'ingestion matcher'::text as impact_area,
  'must compute planned print_identity_key before canonical routing when same-number collisions exist'::text as impact
union all
select
  'promotion logic',
  'must compute print_identity_key before insert and route uniqueness on v3 composite key'
union all
select
  'external mappings',
  'no direct mutation required in schema rollout, but later remap/canonical creation steps must consume print_identity_key-aware identity'
union all
select
  'pricing',
  'mostly unaffected because pricing joins are card_print_id based, but validators assuming standalone print_identity_key uniqueness must be updated'
union all
select
  'ui',
  'routing should continue to prefer gv_id/card_print_id; display layers may need conflict-aware labels once same-number rows coexist canonically';

create temp view global_pik_migration_phases_v1 as
select
  1 as phase_order,
  'PRE-FLIGHT AUDIT'::text as phase_name,
  'project planned keys globally, measure diffs, audit duplicates, inventory index dependencies'::text as phase_purpose
union all
select
  2,
  'SCHEMA VERIFY OR ADD COLUMN',
  'verify print_identity_key exists with nullable text contract, add only in environments where missing'
union all
select
  3,
  'UNIQUENESS TRANSITION',
  'build v3 composite uniqueness support and retire standalone print_identity_key global uniqueness'
union all
select
  4,
  'BACKFILL APPLY',
  'write planned print_identity_key values only after v3 uniqueness is ready'
union all
select
  5,
  'POST-BACKFILL VALIDATION',
  'verify zero composite duplicates, no gv_id changes, and reader/writer readiness before later conflict-set inserts';

create temp view global_pik_final_plan_v1 as
select
  'public.card_prints.print_identity_key text null (already present live; verify-or-add only for target envs missing it)'::text as column_definition,
  'lower(concat_ws('':'', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))'::text as derivation_function,
  'compute-only audit -> dry-run diff validation -> controlled apply after uniqueness transition'::text as backfill_strategy,
  'preflight -> v3 composite index create/validate -> retire standalone print_identity_key unique index -> backfill -> post-backfill duplicate audit'::text as uniqueness_transition_plan,
  'grandfather all existing non-null gv_id values; new same-number conflicting rows use print-identity-token extended gv_id only when created later'::text as gv_id_strategy,
  'PRE-FLIGHT AUDIT | SCHEMA VERIFY OR ADD COLUMN | UNIQUENESS TRANSITION | BACKFILL APPLY | POST-BACKFILL VALIDATION'::text as migration_phases,
  case
    when (select planned_key_safe_for_global_preflight from global_pik_duplicate_summary_v1) = 'yes'
      then 'yes'
    else 'no'
  end as safe_to_proceed_to_preflight,
  case
    when (select planned_key_duplicate_group_count from global_pik_duplicate_summary_v1) = 0
      and (select planned_standalone_duplicate_group_count from global_pik_duplicate_summary_v1) > 0
      and (select nonnull_but_differs_count from global_pik_backfill_diff_summary_v1) > 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: column introduction / live schema state.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  has_global_print_identity_key_uq,
  has_identity_v2_uq
from global_pik_schema_state_v1;

select
  column_definition,
  live_interpretation,
  rollout_rule
from global_pik_column_plan_v1;

-- Phase 2: derivation function contract.
select
  derivation_function,
  derivation_rules,
  normalization_notes
from global_pik_derivation_contract_v1;

-- Phase 3: backfill strategy and diffs.
select
  rows_in_projection,
  current_null_count,
  current_nonnull_count,
  matching_planned_count,
  nonnull_but_differs_count
from global_pik_backfill_diff_summary_v1;

select
  id,
  set_code,
  name,
  number_plain,
  variant_key,
  current_print_identity_key,
  planned_print_identity_key
from global_pik_backfill_diff_examples_v1;

select
  backfill_strategy,
  apply_rule,
  review_rule
from global_pik_backfill_plan_v1;

-- Phase 4-5: collision precheck and uniqueness transition.
select
  current_key_duplicate_group_count,
  planned_key_duplicate_group_count,
  planned_standalone_duplicate_group_count,
  current_standalone_print_identity_key_duplicate_group_count,
  planned_key_safe_for_global_preflight,
  broader_collision_risk
from global_pik_duplicate_summary_v1;

select
  planned_print_identity_key,
  rows_per_key,
  rows
from global_pik_standalone_duplicate_examples_v1;

select
  uniqueness_transition_plan,
  transition_constraint
from global_pik_uniqueness_transition_v1;

-- Phase 6: GV-ID strategy.
select
  gv_id_strategy,
  rollback_safe_rule
from global_pik_gvid_plan_v1;

-- Phase 7: system impact.
select
  impact_area,
  impact
from global_pik_system_impact_v1
order by impact_area;

-- Phase 9: migration phase split.
select
  phase_order,
  phase_name,
  phase_purpose
from global_pik_migration_phases_v1
order by phase_order;

-- Final summary.
select
  column_definition,
  derivation_function,
  backfill_strategy,
  uniqueness_transition_plan,
  gv_id_strategy,
  migration_phases,
  safe_to_proceed_to_preflight,
  audit_status
from global_pik_final_plan_v1;

rollback;
