-- PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1
-- Read-only audit of the post-reaudit SET_CLASSIFICATION_EDGE family.
--
-- This lane is defined from live state, not from historical counts:
--   - remaining blocker surface = 458 rows
--   - target family = unique-name, numeric-TCGdex, non-legacy rows
--   - expected live target count = 238 rows

begin;

create temp view pik_set_classification_blocked_base_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code as raw_set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  em.external_id as tcgdex_external_id,
  split_part(lower(em.external_id), '-', 1) as tcgdex_set_code,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(lower(em.external_id), '-', 2), '')
  ) as tcgdex_local_id,
  ri.payload->'card'->'set'->>'id' as tcgdex_raw_set_id,
  ri.payload->'card'->'set'->>'name' as tcgdex_raw_set_name,
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
                    'δ',
                    ' delta ',
                    'gi'
                  ),
                  '[★*]',
                  ' star ',
                  'g'
                ),
                '\s+EX\b',
                '-ex',
                'gi'
              ),
              '\s+GX\b',
              '-gx',
              'gi'
            ),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        )
      ),
      '(^-|-$)',
      '',
      'g'
    )
  ) as normalized_name_token
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
 and em.active is true
left join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = em.external_id
where cp.gv_id is not null
  and cp.print_identity_key is null
  and (
    cp.set_code is null
    or btrim(cp.set_code) = ''
    or cp.number_plain is null
    or btrim(cp.number_plain) = ''
    or cp.name is null
    or btrim(cp.name) = ''
    or (
      coalesce(cp.variant_key, '') <> ''
      and cp.variant_key !~ '^[A-Za-z0-9_]+$'
    )
    or (
      coalesce(cp.printed_identity_modifier, '') <> ''
      and cp.printed_identity_modifier !~ '^[a-z0-9_]+$'
    )
  );

create temp view pik_set_classification_family_v1 as
with annotated as (
  select
    b.*,
    count(*) over (
      partition by b.joined_set_code, b.normalized_name_token
    ) as same_name_count
  from pik_set_classification_blocked_base_v1 b
)
select
  a.*,
  lower(
    concat_ws(
      ':',
      a.joined_set_code,
      a.tcgdex_local_id,
      a.normalized_name_token,
      nullif(lower(a.printed_identity_modifier), '')
    )
  ) as computed_print_identity_key_after_fix
from annotated a
where a.joined_set_code not in ('ecard3', 'col1')
  and a.same_name_count = 1
  and a.tcgdex_local_id ~ '^[0-9]+$';

create temp view pik_set_classification_analysis_v1 as
select
  f.*,
  case
    when f.set_id is not null
      and f.joined_set_code is not null
      and (f.raw_set_code is null or btrim(f.raw_set_code) = '')
      then 'SET_CODE_DERIVABLE_FROM_SET_ID'
    when f.raw_set_code is not null
      and btrim(f.raw_set_code) <> ''
      and f.raw_set_code <> f.joined_set_code
      then 'SET_CODE_MISMATCH_FIXABLE'
    when f.set_id is null
      and f.tcgdex_set_code is not null
      then 'SET_RECOVERABLE_FROM_EXTERNAL_SOURCE'
    else 'SET_UNRESOLVABLE'
  end as classification,
  case
    when f.set_id is not null
      and f.joined_set_code is not null
      and (f.raw_set_code is null or btrim(f.raw_set_code) = '')
      then 'canonical sets join resolves authoritative set_code; tcgdex set prefix agrees'
    when f.raw_set_code is not null
      and btrim(f.raw_set_code) <> ''
      and f.raw_set_code <> f.joined_set_code
      then 'stored set_code disagrees with canonical sets row and can be overridden safely'
    when f.set_id is null
      and f.tcgdex_set_code is not null
      then 'set can be recovered from external mapping because canonical set join is absent'
    else 'set identity remains unresolved under current authoritative sources'
  end as classification_reason,
  case
    when f.tcgdex_set_code = f.joined_set_code then 'yes'
    else 'no'
  end as external_set_matches_canonical,
  case
    when f.tcgdex_local_id ~ '^[0-9]+$' then 'yes'
    else 'no'
  end as numeric_number_recoverable
from pik_set_classification_family_v1 f;

create temp view pik_set_classification_counts_v1 as
with class_seed as (
  select *
  from (
    values
      ('SET_CODE_DERIVABLE_FROM_SET_ID'::text),
      ('SET_CODE_MISMATCH_FIXABLE'::text),
      ('SET_RECOVERABLE_FROM_EXTERNAL_SOURCE'::text),
      ('SET_UNRESOLVABLE'::text)
  ) as t(classification)
),
class_counts as (
  select
    classification,
    count(*)::int as row_count
  from pik_set_classification_analysis_v1
  group by classification
)
select
  s.classification,
  coalesce(c.row_count, 0)::int as row_count
from class_seed s
left join class_counts c
  on c.classification = s.classification
order by row_count desc, s.classification;

create temp view pik_set_classification_collision_audit_v1 as
with internal_dupes as (
  select
    computed_print_identity_key_after_fix
  from pik_set_classification_analysis_v1
  where classification <> 'SET_UNRESOLVABLE'
  group by computed_print_identity_key_after_fix
  having count(*) > 1
),
external_conflicts as (
  select distinct
    a.card_print_id
  from pik_set_classification_analysis_v1 a
  join public.card_prints cp2
    on cp2.print_identity_key = a.computed_print_identity_key_after_fix
   and cp2.id <> a.card_print_id
  where a.classification <> 'SET_UNRESOLVABLE'
)
select
  (select count(*)::int from internal_dupes) as internal_collision_count,
  (select count(*)::int from external_conflicts) as external_collision_count,
  (
    (select count(*)::int from internal_dupes)
    + (select count(*)::int from external_conflicts)
  ) as collision_count_after_fix;

create temp view pik_set_classification_readiness_v1 as
select
  count(*)::int as set_edge_row_count,
  count(*) filter (where classification <> 'SET_UNRESOLVABLE')::int as derivable_after_fix_count,
  count(*) filter (where classification = 'SET_UNRESOLVABLE')::int as remaining_blocked_count
from pik_set_classification_analysis_v1;

create temp view pik_set_classification_set_breakdown_v1 as
select
  joined_set_code as set_code,
  count(*)::int as row_count
from pik_set_classification_analysis_v1
group by joined_set_code
order by row_count desc, joined_set_code;

create temp view pik_set_classification_examples_v1 as
with ranked as (
  select
    classification,
    card_print_id,
    name,
    joined_set_code as set_code,
    tcgdex_local_id,
    tcgdex_external_id,
    computed_print_identity_key_after_fix,
    classification_reason,
    row_number() over (
      partition by classification
      order by joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id
    ) as rn
  from pik_set_classification_analysis_v1
)
select
  classification,
  card_print_id,
  name,
  set_code,
  tcgdex_local_id,
  tcgdex_external_id,
  computed_print_identity_key_after_fix,
  classification_reason
from ranked
where rn <= 5
order by classification, rn;

create temp view pik_set_classification_final_decision_v1 as
select
  (select set_edge_row_count from pik_set_classification_readiness_v1) as set_edge_row_count,
  (select derivable_after_fix_count from pik_set_classification_readiness_v1) as derivable_after_fix_count,
  (select remaining_blocked_count from pik_set_classification_readiness_v1) as remaining_blocked_count,
  (select collision_count_after_fix from pik_set_classification_collision_audit_v1) as collision_count_after_fix,
  'PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1'::text as next_execution_unit,
  case
    when (select set_edge_row_count from pik_set_classification_readiness_v1) = 238
      and (select remaining_blocked_count from pik_set_classification_readiness_v1) = 0
      and (select collision_count_after_fix from pik_set_classification_collision_audit_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: target row audit.
select
  card_print_id,
  name,
  raw_set_code as current_set_code,
  set_id,
  number,
  number_plain,
  variant_key,
  print_identity_key
from pik_set_classification_analysis_v1
order by joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id;

-- Phase 2-4: set source analysis and classification.
select
  card_print_id,
  name,
  raw_set_code as current_set_code,
  joined_set_code as canonical_set_code,
  tcgdex_set_code,
  tcgdex_local_id,
  classification,
  classification_reason,
  external_set_matches_canonical,
  numeric_number_recoverable
from pik_set_classification_analysis_v1
order by classification, joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id;

select
  classification,
  row_count
from pik_set_classification_counts_v1;

select
  set_code,
  row_count
from pik_set_classification_set_breakdown_v1;

-- Phase 5: collision test after simulated set_code + number recovery.
select
  internal_collision_count,
  external_collision_count,
  collision_count_after_fix
from pik_set_classification_collision_audit_v1;

-- Phase 7: readiness.
select
  set_edge_row_count,
  derivable_after_fix_count,
  remaining_blocked_count
from pik_set_classification_readiness_v1;

select
  classification,
  card_print_id,
  name,
  set_code,
  tcgdex_local_id,
  tcgdex_external_id,
  computed_print_identity_key_after_fix,
  classification_reason
from pik_set_classification_examples_v1;

-- Final decision.
select
  set_edge_row_count,
  derivable_after_fix_count,
  remaining_blocked_count,
  collision_count_after_fix,
  next_execution_unit,
  audit_status
from pik_set_classification_final_decision_v1;

rollback;
