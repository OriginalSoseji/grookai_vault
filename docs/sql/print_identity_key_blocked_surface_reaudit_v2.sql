-- PRINT_IDENTITY_KEY_BLOCKED_SURFACE_REAUDIT_V2
-- Read-only re-audit of the remaining print_identity_key blocker surface after
-- shadow-row removal and bounded promo backfill.

begin;

create temp view pik_blocked_surface_reaudit_v2 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.print_identity_key,
  cp.set_id,
  cp.set_code as raw_set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  em.external_id as tcgdex_external_id,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(lower(em.external_id), '-', 2), '')
  ) as tcgdex_local_id,
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
left join public.sets s
  on s.id = cp.set_id
left join public.external_mappings em
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

create temp view pik_blocked_surface_detected_v2 as
select
  b.*,
  count(*) over (
    partition by b.joined_set_code, b.normalized_name_token
  ) as same_name_count,
  case
    when b.tcgdex_external_id is not null then 'yes'
    else 'no'
  end as has_tcgdex_mapping,
  case
    when b.tcgdex_local_id is null or btrim(b.tcgdex_local_id) = '' then 'missing'
    when b.tcgdex_local_id ~ '^[0-9]+$' then 'numeric'
    else 'non_numeric'
  end as tcgdex_number_shape
from pik_blocked_surface_reaudit_v2 b;

create temp view pik_blocked_surface_family_assignment_v2 as
select
  d.*,
  case
    when d.tcgdex_local_id is null or btrim(d.tcgdex_local_id) = '' then 'NUMBERLESS_NO_SOURCE'
    when d.joined_set_code in ('ecard3', 'col1') then 'LEGACY_NAME_EDGE'
    when d.same_name_count > 1 then 'VARIANT_AMBIGUITY'
    when d.tcgdex_local_id !~ '^[0-9]+$' then 'AMBIGUOUS_NUMBER'
    else 'SET_CLASSIFICATION_EDGE'
  end as family_name,
  case
    when d.tcgdex_local_id is null or btrim(d.tcgdex_local_id) = '' then
      'row still lacks authoritative TCGdex localId, so number recovery cannot start deterministically'
    when d.joined_set_code in ('ecard3', 'col1') then
      'legacy lane uses mixed numeric and prefixed localId forms (for example H or SL) and must be isolated under a legacy contract first'
    when d.same_name_count > 1 then
      'same normalized name appears multiple times inside the same special set, so missing number_plain creates a live identity distinction gap'
    when d.tcgdex_local_id !~ '^[0-9]+$' then
      'upstream localId is present but not plain numeric, so standard number_plain mirroring would be contractually unsafe'
    else
      'row has authoritative numeric TCGdex localId and unique normalized name inside its set; blocker is a mechanical set/number mirror edge'
  end as family_reason
from pik_blocked_surface_detected_v2 d;

create temp view pik_blocked_surface_family_counts_v2 as
with family_seed as (
  select *
  from (
    values
      ('SET_CLASSIFICATION_EDGE'::text),
      ('VARIANT_AMBIGUITY'::text),
      ('LEGACY_NAME_EDGE'::text),
      ('AMBIGUOUS_NUMBER'::text),
      ('NUMBERLESS_NO_SOURCE'::text)
  ) as t(family_name)
),
family_counts as (
  select
    family_name,
    count(*)::int as row_count
  from pik_blocked_surface_family_assignment_v2
  group by family_name
)
select
  s.family_name,
  coalesce(c.row_count, 0)::int as row_count
from family_seed s
left join family_counts c
  on c.family_name = s.family_name
order by row_count desc, s.family_name;

create temp view pik_blocked_surface_family_set_breakdown_v2 as
select
  family_name,
  joined_set_code as set_code,
  count(*)::int as row_count
from pik_blocked_surface_family_assignment_v2
group by family_name, joined_set_code
order by family_name, row_count desc, joined_set_code;

create temp view pik_blocked_surface_examples_v2 as
with ranked as (
  select
    family_name,
    card_print_id,
    joined_set_code as set_code,
    name,
    number,
    number_plain,
    variant_key,
    print_identity_key,
    tcgdex_local_id,
    tcgdex_external_id,
    same_name_count,
    family_reason,
    row_number() over (
      partition by family_name
      order by joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id
    ) as rn
  from pik_blocked_surface_family_assignment_v2
)
select
  family_name,
  card_print_id,
  set_code,
  name,
  number,
  number_plain,
  variant_key,
  print_identity_key,
  tcgdex_local_id,
  tcgdex_external_id,
  same_name_count,
  family_reason
from ranked
where rn <= 3
order by family_name, rn;

create temp view pik_blocked_surface_next_plan_v2 as
select
  1 as plan_order,
  'PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1'::text as execution_unit,
  'Largest live family: unique-name special-set rows with numeric TCGdex localId and no residual collision. Define the bounded mirror-and-number recovery contract first.'::text as execution_reason

union all

select
  2,
  'PRINT_IDENTITY_KEY_VARIANT_AMBIGUITY_CONTRACT_AUDIT_V1',
  'Second family: same-name multi-number rows inside special sets. Define lawful distinction rules before any recovery apply.'

union all

select
  3,
  'PRINT_IDENTITY_KEY_LEGACY_NAME_EDGE_CONTRACT_AUDIT_V1',
  'Final family: legacy e-Card and Call of Legends numbering semantics need their own historical contract.';

create temp view pik_blocked_surface_final_decision_v2 as
select
  (select count(*)::int from pik_blocked_surface_family_assignment_v2) as blocker_row_count,
  (
    select family_name
    from pik_blocked_surface_family_counts_v2
    order by row_count desc, family_name
    limit 1
  ) as dominant_family,
  'PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1'::text as next_execution_unit,
  case
    when (select count(*)::int from pik_blocked_surface_family_assignment_v2) = 458
      and coalesce((
        select sum(row_count)
        from pik_blocked_surface_family_counts_v2
      ), 0) = 458
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: target extraction.
select
  card_print_id,
  name,
  joined_set_code as set_code,
  number,
  number_plain,
  variant_key,
  print_identity_key
from pik_blocked_surface_family_assignment_v2
order by joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id;

-- Phase 2: family detection diagnostics.
select
  has_tcgdex_mapping,
  tcgdex_number_shape,
  case
    when same_name_count > 1 then 'same_name_multi'
    else 'same_name_unique'
  end as same_name_surface,
  count(*)::int as row_count
from pik_blocked_surface_family_assignment_v2
group by
  has_tcgdex_mapping,
  tcgdex_number_shape,
  case
    when same_name_count > 1 then 'same_name_multi'
    else 'same_name_unique'
  end
order by row_count desc, has_tcgdex_mapping, tcgdex_number_shape, same_name_surface;

-- Phase 3: final family classification.
select
  card_print_id,
  name,
  joined_set_code as set_code,
  tcgdex_local_id,
  tcgdex_external_id,
  same_name_count,
  family_name,
  family_reason
from pik_blocked_surface_family_assignment_v2
order by family_name, joined_set_code, normalized_name_token, tcgdex_local_id, card_print_id;

-- Phase 4: grouped family counts.
select
  family_name,
  row_count
from pik_blocked_surface_family_counts_v2;

select
  family_name,
  set_code,
  row_count
from pik_blocked_surface_family_set_breakdown_v2;

select
  family_name,
  card_print_id,
  set_code,
  name,
  tcgdex_local_id,
  tcgdex_external_id,
  same_name_count,
  family_reason
from pik_blocked_surface_examples_v2;

-- Phase 5: next execution plan.
select
  plan_order,
  execution_unit,
  execution_reason
from pik_blocked_surface_next_plan_v2
order by plan_order;

select
  blocker_row_count,
  dominant_family,
  next_execution_unit,
  audit_status
from pik_blocked_surface_final_decision_v2;

rollback;
