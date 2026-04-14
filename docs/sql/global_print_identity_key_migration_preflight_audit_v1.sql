-- GLOBAL_PRINT_IDENTITY_KEY_MIGRATION_PREFLIGHT_AUDIT_V1
-- Read-only preflight audit for the global print_identity_key migration.

begin;

create temp view global_pik_preflight_column_state_v1 as
select
  case when count(*) > 0 then 'yes' else 'no' end as column_exists,
  max(data_type) as data_type,
  max(is_nullable) as is_nullable,
  max(column_default) as column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'card_prints'
  and column_name = 'print_identity_key';

create temp view global_pik_preflight_index_state_v1 as
select
  idx.relname as index_name,
  i.indisunique as is_unique,
  pg_get_indexdef(i.indexrelid) as index_definition,
  coalesce(pg_get_expr(i.indpred, i.indrelid), '') as predicate
from pg_index i
join pg_class idx
  on idx.oid = i.indexrelid
join pg_class tbl
  on tbl.oid = i.indrelid
join pg_namespace ns
  on ns.oid = tbl.relnamespace
where ns.nspname = 'public'
  and tbl.relname = 'card_prints'
  and (
    pg_get_indexdef(i.indexrelid) ilike '%print_identity_key%'
    or idx.relname in (
      'uq_card_prints_identity_v2',
      'card_prints_gv_id_uq',
      'card_prints_gv_id_unique_idx'
    )
  )
order by idx.relname;

create temp view global_pik_preflight_projection_v1 as
select
  cp.id,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key,
  cp.gv_id,
  case
    when cp.set_code is null or btrim(cp.set_code) = ''
      or cp.number_plain is null or btrim(cp.number_plain) = ''
      or cp.name is null or btrim(cp.name) = ''
      or (coalesce(cp.variant_key, '') <> '' and cp.variant_key !~ '^[A-Za-z0-9_]+$')
      or (coalesce(cp.printed_identity_modifier, '') <> '' and cp.printed_identity_modifier !~ '^[a-z0-9_]+$')
      then null
    else lower(
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
    )
  end as computed_print_identity_key,
  case
    when cp.set_code is null or btrim(cp.set_code) = ''
      or cp.number_plain is null or btrim(cp.number_plain) = ''
      or cp.name is null or btrim(cp.name) = ''
      or (coalesce(cp.variant_key, '') <> '' and cp.variant_key !~ '^[A-Za-z0-9_]+$')
      or (coalesce(cp.printed_identity_modifier, '') <> '' and cp.printed_identity_modifier !~ '^[a-z0-9_]+$')
      then true
    else false
  end as has_derivation_blocker,
  array_remove(
    array[
      case when cp.set_code is null or btrim(cp.set_code) = '' then 'missing_set_code' end,
      case when cp.number_plain is null or btrim(cp.number_plain) = '' then 'missing_number_plain' end,
      case when cp.name is null or btrim(cp.name) = '' then 'missing_name' end,
      case when coalesce(cp.variant_key, '') <> '' and cp.variant_key !~ '^[A-Za-z0-9_]+$' then 'malformed_variant_key' end,
      case when coalesce(cp.printed_identity_modifier, '') <> '' and cp.printed_identity_modifier !~ '^[a-z0-9_]+$' then 'malformed_printed_identity_modifier' end
    ],
    null
  ) as blocker_reasons
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id;

create temp view global_pik_preflight_current_key_dupes_v1 as
select
  set_id,
  number_plain,
  variant_key,
  count(*)::int as rows_per_group,
  array_agg(id order by id) as row_ids
from global_pik_preflight_projection_v1
where set_id is not null
  and number_plain is not null
group by
  set_id,
  number_plain,
  variant_key
having count(*) > 1
order by rows_per_group desc, set_id, number_plain, variant_key;

create temp view global_pik_preflight_proposed_v3_dupes_v1 as
select
  set_id,
  number_plain,
  computed_print_identity_key,
  variant_key,
  count(*)::int as rows_per_group,
  array_agg(id order by id) as row_ids
from global_pik_preflight_projection_v1
where computed_print_identity_key is not null
group by
  set_id,
  number_plain,
  computed_print_identity_key,
  variant_key
having count(*) > 1
order by rows_per_group desc, set_id, number_plain, variant_key, computed_print_identity_key;

create temp view global_pik_preflight_existing_nonnull_v3_check_v1 as
select
  count(*)::int as existing_nonnull_rows_that_violate_v3_composite
from (
  select
    set_id,
    number_plain,
    variant_key,
    current_print_identity_key
  from global_pik_preflight_projection_v1
  where current_print_identity_key is not null
  group by
    set_id,
    number_plain,
    variant_key,
    current_print_identity_key
  having count(*) > 1
) dupes;

create temp view global_pik_preflight_standalone_index_risk_v1 as
with planned_duplicates as (
  select
    computed_print_identity_key,
    count(*)::int as rows_per_key,
    count(distinct coalesce(joined_set_code, set_code))::int as distinct_set_codes,
    array_agg(
      coalesce(joined_set_code, set_code, '<missing_set_code>')
      || '|'
      || coalesce(number_plain, '<missing_number_plain>')
      || '|'
      || variant_key
      || '|'
      || coalesce(name, '<missing_name>')
      order by coalesce(joined_set_code, set_code), number_plain, name, id
    ) as rows
  from global_pik_preflight_projection_v1
  where computed_print_identity_key is not null
  group by computed_print_identity_key
  having count(*) > 1
)
select
  case
    when exists (
      select 1
      from global_pik_preflight_index_state_v1
      where index_name = 'card_prints_print_identity_key_uq'
        and is_unique = true
    )
      then 'yes'
    else 'no'
  end as standalone_print_identity_key_unique_index_exists,
  'card_prints_print_identity_key_uq'::text as standalone_index_name,
  count(*)::int as lawful_global_duplicate_group_count,
  count(*) filter (where distinct_set_codes > 1)::int as lawful_cross_set_duplicate_group_count,
  count(*) filter (where distinct_set_codes = 1)::int as lawful_same_set_duplicate_group_count,
  case
    when count(*) > 0
      then 'Unsafe because computed print_identity_key is orthogonal to variant_key. Legitimate same-set variant lanes create 16 duplicate groups under standalone global uniqueness.'
    else 'No standalone uniqueness risk detected.'
  end as why_unsafe
from planned_duplicates;

create temp view global_pik_preflight_canonical_shape_readiness_v1 as
select
  count(*)::int as canonical_row_count,
  count(*) filter (where set_code is null or btrim(set_code) = '')::int as missing_set_code,
  count(*) filter (where number_plain is null or btrim(number_plain) = '')::int as missing_number_plain,
  count(*) filter (where name is null or btrim(name) = '')::int as missing_name,
  count(*) filter (where coalesce(variant_key, '') <> '' and variant_key !~ '^[A-Za-z0-9_]+$')::int as malformed_variant_key,
  count(*) filter (where coalesce(printed_identity_modifier, '') <> '' and printed_identity_modifier !~ '^[a-z0-9_]+$')::int as malformed_printed_identity_modifier,
  count(*) filter (where has_derivation_blocker)::int as derivation_input_blocker_count
from global_pik_preflight_projection_v1
where gv_id is not null;

create temp view global_pik_preflight_canonical_blocker_examples_v1 as
select
  id,
  coalesce(joined_set_code, set_code) as set_code_for_reference,
  set_code as current_set_code_value,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  blocker_reasons
from global_pik_preflight_projection_v1
where gv_id is not null
  and has_derivation_blocker
order by coalesce(joined_set_code, set_code), number_plain nulls first, name, id
limit 20;

create temp view global_pik_preflight_same_number_families_v1 as
select
  set_id,
  number_plain
from global_pik_preflight_projection_v1
where set_id is not null
  and number_plain is not null
group by
  set_id,
  number_plain
having count(*) > 1;

create temp view global_pik_preflight_domain_rows_v1 as
select
  'cel25c'::text as domain_name,
  p.*
from global_pik_preflight_projection_v1 p
where p.joined_set_code = 'cel25c'

union all

select
  'same_number_conflict_families'::text as domain_name,
  p.*
from global_pik_preflight_projection_v1 p
join global_pik_preflight_same_number_families_v1 fam
  on fam.set_id = p.set_id
 and fam.number_plain = p.number_plain

union all

select
  'rc_prefix_rows'::text as domain_name,
  p.*
from global_pik_preflight_projection_v1 p
where coalesce(p.number, '') ~ '^RC[0-9]+$'
   or p.variant_key = 'rc'

union all

select
  'delta_species_rows'::text as domain_name,
  p.*
from global_pik_preflight_projection_v1 p
where p.printed_identity_modifier = 'delta_species'
   or p.name like '%δ%'

union all

select
  'printed_identity_modifier_rows'::text as domain_name,
  p.*
from global_pik_preflight_projection_v1 p
where p.printed_identity_modifier <> '';

create temp view global_pik_preflight_domain_summary_v1 as
with current_dupes as (
  select
    domain_name,
    count(*)::int as duplicate_group_count
  from (
    select
      domain_name,
      set_id,
      number_plain,
      variant_key
    from global_pik_preflight_domain_rows_v1
    where set_id is not null
      and number_plain is not null
    group by
      domain_name,
      set_id,
      number_plain,
      variant_key
    having count(*) > 1
  ) dupes
  group by domain_name
),
proposed_dupes as (
  select
    domain_name,
    count(*)::int as duplicate_group_count
  from (
    select
      domain_name,
      set_id,
      number_plain,
      variant_key,
      computed_print_identity_key
    from global_pik_preflight_domain_rows_v1
    where computed_print_identity_key is not null
    group by
      domain_name,
      set_id,
      number_plain,
      variant_key,
      computed_print_identity_key
    having count(*) > 1
  ) dupes
  group by domain_name
)
select
  d.domain_name,
  count(*)::int as row_count,
  coalesce((select duplicate_group_count from current_dupes c where c.domain_name = d.domain_name), 0) as current_key_duplicate_group_count,
  coalesce((select duplicate_group_count from proposed_dupes p where p.domain_name = d.domain_name), 0) as proposed_v3_duplicate_group_count,
  count(*) filter (where has_derivation_blocker)::int as blocker_count,
  case
    when count(*) filter (where has_derivation_blocker) = 0 then 'ready'
    else 'blocked'
  end as readiness_status
from global_pik_preflight_domain_rows_v1 d
group by d.domain_name
order by d.domain_name;

create temp view global_pik_preflight_final_decision_v1 as
select
  (select column_exists from global_pik_preflight_column_state_v1) as column_exists,
  (select count(*)::int from global_pik_preflight_current_key_dupes_v1) as current_key_duplicate_group_count,
  (select count(*)::int from global_pik_preflight_proposed_v3_dupes_v1) as proposed_v3_duplicate_group_count,
  (select standalone_print_identity_key_unique_index_exists from global_pik_preflight_standalone_index_risk_v1) as standalone_print_identity_key_unique_index_exists,
  case
    when (select standalone_print_identity_key_unique_index_exists from global_pik_preflight_standalone_index_risk_v1) = 'yes'
      and (select lawful_global_duplicate_group_count from global_pik_preflight_standalone_index_risk_v1) > 0
      then 'yes'
    else 'no'
  end as retirement_required_before_backfill,
  (select derivation_input_blocker_count from global_pik_preflight_canonical_shape_readiness_v1) as derivation_input_blocker_count,
  case
    when (select column_exists from global_pik_preflight_column_state_v1) = 'yes'
      and (select count(*)::int from global_pik_preflight_proposed_v3_dupes_v1) = 0
      and (select existing_nonnull_rows_that_violate_v3_composite from global_pik_preflight_existing_nonnull_v3_check_v1) = 0
      and (select standalone_print_identity_key_unique_index_exists from global_pik_preflight_standalone_index_risk_v1) = 'yes'
      then 'yes'
    else 'no'
  end as safe_to_proceed_to_uniqueness_transition,
  'GLOBAL_PRINT_IDENTITY_KEY_UNIQUENESS_TRANSITION_V1'::text as next_execution_unit,
  case
    when (select column_exists from global_pik_preflight_column_state_v1) = 'yes'
      and (select count(*)::int from global_pik_preflight_proposed_v3_dupes_v1) = 0
      and (select existing_nonnull_rows_that_violate_v3_composite from global_pik_preflight_existing_nonnull_v3_check_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1A: column existence.
select
  column_exists,
  data_type,
  is_nullable,
  column_default
from global_pik_preflight_column_state_v1;

-- Phase 1B: index / constraint state.
select
  index_name,
  index_definition,
  is_unique,
  predicate
from global_pik_preflight_index_state_v1;

-- Phase 2: current key duplicate audit.
select
  count(*)::int as current_key_duplicate_group_count
from global_pik_preflight_current_key_dupes_v1;

select
  set_id,
  number_plain,
  variant_key,
  rows_per_group,
  row_ids
from global_pik_preflight_current_key_dupes_v1
limit 20;

-- Phase 3: proposed V3 key simulation.
select
  count(*)::int as proposed_v3_duplicate_group_count,
  count(*) filter (where computed_print_identity_key is null and set_id is not null and gv_id is not null)::int as canonical_rows_missing_computed_key,
  count(*) filter (where computed_print_identity_key is not null and btrim(computed_print_identity_key) = '')::int as unexpected_empty_computed_key_count
from global_pik_preflight_projection_v1;

select
  set_id,
  number_plain,
  computed_print_identity_key,
  variant_key,
  rows_per_group,
  row_ids
from global_pik_preflight_proposed_v3_dupes_v1
limit 20;

select
  existing_nonnull_rows_that_violate_v3_composite
from global_pik_preflight_existing_nonnull_v3_check_v1;

-- Phase 4: standalone unique-index risk.
select
  standalone_print_identity_key_unique_index_exists,
  standalone_index_name,
  lawful_global_duplicate_group_count,
  lawful_cross_set_duplicate_group_count,
  lawful_same_set_duplicate_group_count,
  why_unsafe
from global_pik_preflight_standalone_index_risk_v1;

-- Phase 5: null / shape readiness audit.
select
  canonical_row_count,
  missing_set_code,
  missing_number_plain,
  missing_name,
  malformed_variant_key,
  malformed_printed_identity_modifier,
  derivation_input_blocker_count
from global_pik_preflight_canonical_shape_readiness_v1;

select
  id,
  set_code_for_reference,
  current_set_code_value,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  blocker_reasons
from global_pik_preflight_canonical_blocker_examples_v1;

-- Phase 6: high-risk domain spotchecks.
select
  domain_name,
  row_count,
  current_key_duplicate_group_count,
  proposed_v3_duplicate_group_count,
  blocker_count,
  readiness_status
from global_pik_preflight_domain_summary_v1;

-- Phase 7: final decision.
select
  column_exists,
  current_key_duplicate_group_count,
  proposed_v3_duplicate_group_count,
  standalone_print_identity_key_unique_index_exists,
  retirement_required_before_backfill,
  derivation_input_blocker_count,
  safe_to_proceed_to_uniqueness_transition,
  next_execution_unit,
  audit_status
from global_pik_preflight_final_decision_v1;

rollback;
