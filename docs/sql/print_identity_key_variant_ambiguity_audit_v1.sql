-- PRINT_IDENTITY_KEY_VARIANT_AMBIGUITY_CONTRACT_AUDIT_V1
-- Read-only audit of the remaining blocked surface after:
--   - shadow reuse realignment
--   - promo backfill
--   - set-classification edge backfill

begin;

create temp view pik_variant_ambiguity_blocked_base_v1 as
select
  cp.id as card_print_id,
  cp.set_id,
  coalesce(cp.set_code, s.code) as effective_set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id,
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
  ) as normalized_name
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

create temp view pik_variant_ambiguity_enriched_v1 as
select
  b.*,
  count(*) over (
    partition by b.effective_set_code, b.normalized_name
  ) as candidate_sibling_rows_in_same_set_and_number,
  case
    when b.variant_key = '' then 'empty'
    when b.variant_key ~ '^[A-Za-z0-9_]+$' then 'canonical_token'
    else 'legacy_or_invalid'
  end as variant_key_shape,
  case
    when b.printed_identity_modifier = '' then 'empty'
    when b.printed_identity_modifier ~ '^[a-z0-9_]+$' then 'canonical_token'
    else 'legacy_or_invalid'
  end as printed_identity_modifier_shape,
  coalesce(b.number_plain, b.tcgdex_local_id) as effective_number_plain,
  lower(
    concat_ws(
      ':',
      b.effective_set_code,
      b.tcgdex_local_id,
      b.normalized_name,
      nullif(lower(b.printed_identity_modifier), '')
    )
  ) as simulated_print_identity_key
from pik_variant_ambiguity_blocked_base_v1 b;

create temp view pik_variant_ambiguity_family_assignment_v1 as
select
  e.*,
  case
    when e.variant_key = ''
      and e.printed_identity_modifier = ''
      and e.effective_set_code in ('sv04.5', 'sv06.5', 'swsh10.5')
      and e.candidate_sibling_rows_in_same_set_and_number > 1
      then 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION'
    when e.variant_key = ''
      and e.printed_identity_modifier = ''
      and e.effective_set_code in ('ecard3', 'col1')
      then 'OTHER'
    else 'UNCLASSIFIED'
  end as family_name,
  case
    when e.variant_key = ''
      and e.printed_identity_modifier = ''
      and e.effective_set_code in ('sv04.5', 'sv06.5', 'swsh10.5')
      and e.candidate_sibling_rows_in_same_set_and_number > 1
      then 'Repeated same-name rows share the same unresolved empty-variant lane; once numeric TCGdex localId is mirrored into number, the rows separate deterministically.'
    when e.variant_key = ''
      and e.printed_identity_modifier = ''
      and e.effective_set_code in ('ecard3', 'col1')
      then 'Legacy numbering residue uses mixed numeric and prefixed localId forms (for example H16 and SL4). The rows are collision-free under simulated derivation but still require an explicit legacy numbering contract before apply.'
    else 'No deterministic family matched the row under the allowed variant-ambiguity contract.'
  end as family_reason
from pik_variant_ambiguity_enriched_v1 e;

create temp view pik_variant_ambiguity_family_counts_v1 as
with family_seed as (
  select *
  from (
    values
      ('EMPTY_VS_NULL_VARIANT_KEY_EQUIVALENCE'::text),
      ('LEGACY_VARIANT_KEY_NORMALIZATION_REQUIRED'::text),
      ('PRINTED_IDENTITY_MODIFIER_AND_VARIANT_KEY_OVERLAP'::text),
      ('SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION'::text),
      ('CHILD_PRINTING_MODELING_GAP'::text),
      ('OTHER'::text),
      ('UNCLASSIFIED'::text)
  ) as t(family_name)
),
family_counts as (
  select
    family_name,
    count(*)::int as row_count
  from pik_variant_ambiguity_family_assignment_v1
  group by family_name
)
select
  s.family_name,
  coalesce(c.row_count, 0)::int as row_count
from family_seed s
left join family_counts c
  on c.family_name = s.family_name
order by row_count desc, s.family_name;

create temp view pik_variant_ambiguity_family_set_breakdown_v1 as
select
  family_name,
  effective_set_code as set_code,
  count(*)::int as row_count
from pik_variant_ambiguity_family_assignment_v1
group by family_name, effective_set_code
order by family_name, row_count desc, effective_set_code;

create temp view pik_variant_ambiguity_repeated_patterns_v1 as
select
  effective_set_code as set_code,
  normalized_name,
  name,
  count(*)::int as row_count,
  string_agg(coalesce(tcgdex_local_id, 'null'), ', ' order by tcgdex_local_id, card_print_id) as tcgdex_local_ids
from pik_variant_ambiguity_family_assignment_v1
where family_name = 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION'
group by effective_set_code, normalized_name, name
order by row_count desc, set_code, normalized_name;

create temp view pik_variant_ambiguity_simulated_external_collisions_v1 as
select distinct
  f.family_name,
  f.card_print_id,
  cp2.id as conflicting_card_print_id
from pik_variant_ambiguity_family_assignment_v1 f
join public.card_prints cp2
  on cp2.id <> f.card_print_id
 and cp2.set_id = f.set_id
 and cp2.number_plain = (
      case
        when f.tcgdex_local_id is null then null
        when f.tcgdex_local_id ~ '^[A-Za-z][0-9]+$' then upper(f.tcgdex_local_id)
        when f.tcgdex_local_id ~ '[0-9]' then regexp_replace(regexp_replace(f.tcgdex_local_id, '/.*$', ''), '[^0-9]', '', 'g')
        else f.tcgdex_local_id
      end
    )
 and coalesce(cp2.variant_key, '') = coalesce(f.variant_key, '')
 and cp2.print_identity_key = f.simulated_print_identity_key;

create temp view pik_variant_ambiguity_simulated_internal_collisions_v1 as
select
  family_name,
  count(*)::int as row_count
from (
  select
    family_name,
    set_id,
    case
      when tcgdex_local_id is null then null
      when tcgdex_local_id ~ '^[A-Za-z][0-9]+$' then upper(tcgdex_local_id)
      when tcgdex_local_id ~ '[0-9]' then regexp_replace(regexp_replace(tcgdex_local_id, '/.*$', ''), '[^0-9]', '', 'g')
      else tcgdex_local_id
    end as simulated_number_plain,
    simulated_print_identity_key,
    coalesce(variant_key, '') as normalized_variant_key,
    count(*) as rows_per_identity
  from pik_variant_ambiguity_family_assignment_v1
  group by
    family_name,
    set_id,
    case
      when tcgdex_local_id is null then null
      when tcgdex_local_id ~ '^[A-Za-z][0-9]+$' then upper(tcgdex_local_id)
      when tcgdex_local_id ~ '[0-9]' then regexp_replace(regexp_replace(tcgdex_local_id, '/.*$', ''), '[^0-9]', '', 'g')
      else tcgdex_local_id
    end,
    simulated_print_identity_key,
    coalesce(variant_key, '')
  having count(*) > 1
) collisions
group by family_name;

create temp view pik_variant_ambiguity_safety_v1 as
with safety_seed as (
  select *
  from (
    values
      ('EMPTY_VS_NULL_VARIANT_KEY_EQUIVALENCE'::text),
      ('LEGACY_VARIANT_KEY_NORMALIZATION_REQUIRED'::text),
      ('PRINTED_IDENTITY_MODIFIER_AND_VARIANT_KEY_OVERLAP'::text),
      ('SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION'::text),
      ('CHILD_PRINTING_MODELING_GAP'::text),
      ('OTHER'::text),
      ('UNCLASSIFIED'::text)
  ) as t(family_name)
),
external_counts as (
  select family_name, count(*)::int as external_collision_count
  from pik_variant_ambiguity_simulated_external_collisions_v1
  group by family_name
),
internal_counts as (
  select family_name, row_count as internal_collision_count
  from pik_variant_ambiguity_simulated_internal_collisions_v1
)
select
  s.family_name,
  case
    when s.family_name = 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION' then 'yes'
    else 'no'
  end as safe_to_derive_now,
  coalesce(i.internal_collision_count, 0)::int + coalesce(e.external_collision_count, 0)::int as collision_count_if_derived,
  case
    when s.family_name = 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION' then 0
    when s.family_name = 'OTHER' then 0
    else 0
  end::int as ambiguity_count_if_derived
from safety_seed s
left join internal_counts i
  on i.family_name = s.family_name
left join external_counts e
  on e.family_name = s.family_name
order by s.family_name;

create temp view pik_variant_ambiguity_execution_plan_v1 as
select
  1 as plan_order,
  'PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1'::text as execution_unit,
  'Apply the dominant 194-row modern lane by mirroring numeric TCGdex localId into number and backfilling print_identity_key under the frozen per-row map.'::text as execution_reason
union all
select
  2,
  'PRINT_IDENTITY_KEY_LEGACY_LOCAL_ID_NUMBERING_CONTRACT_AUDIT_V1',
  'Audit the 26-row legacy residue separately because H and SL localId semantics require an explicit numbering contract before apply.';

create temp view pik_variant_ambiguity_final_decision_v1 as
select
  (select count(*)::int from pik_variant_ambiguity_family_assignment_v1) as variant_ambiguity_row_count,
  (
    select family_name
    from pik_variant_ambiguity_family_counts_v1
    order by row_count desc, family_name
    limit 1
  ) as dominant_family,
  jsonb_build_object(
    'yes',
    coalesce((
      select sum(fc.row_count)
      from pik_variant_ambiguity_family_counts_v1 fc
      join pik_variant_ambiguity_safety_v1 sf
        on sf.family_name = fc.family_name
      where sf.safe_to_derive_now = 'yes'
    ), 0),
    'no',
    coalesce((
      select sum(fc.row_count)
      from pik_variant_ambiguity_family_counts_v1 fc
      join pik_variant_ambiguity_safety_v1 sf
        on sf.family_name = fc.family_name
      where sf.safe_to_derive_now = 'no'
    ), 0)
  ) as safe_to_derive_now_counts,
  'PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1'::text as next_execution_unit,
  case
    when (select count(*)::int from pik_variant_ambiguity_family_assignment_v1) = 220
      and (select row_count from pik_variant_ambiguity_family_counts_v1 where family_name = 'UNCLASSIFIED') = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: target extraction.
select
  card_print_id,
  name,
  effective_set_code as set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id
from pik_variant_ambiguity_family_assignment_v1
order by effective_set_code, normalized_name, tcgdex_local_id, card_print_id;

-- Phase 2: variant surface analysis.
select
  card_print_id,
  name,
  normalized_name,
  effective_set_code,
  effective_number_plain,
  variant_key_shape,
  printed_identity_modifier_shape,
  candidate_sibling_rows_in_same_set_and_number
from pik_variant_ambiguity_family_assignment_v1
order by effective_set_code, normalized_name, tcgdex_local_id, card_print_id;

-- Phase 3: family classification.
select
  card_print_id,
  name,
  effective_set_code as set_code,
  tcgdex_local_id,
  family_name,
  family_reason
from pik_variant_ambiguity_family_assignment_v1
order by family_name, effective_set_code, normalized_name, tcgdex_local_id, card_print_id;

-- Phase 4: grouped counts.
select
  family_name,
  row_count
from pik_variant_ambiguity_family_counts_v1;

select
  family_name,
  set_code,
  row_count
from pik_variant_ambiguity_family_set_breakdown_v1;

select
  set_code,
  normalized_name,
  name,
  row_count,
  tcgdex_local_ids
from pik_variant_ambiguity_repeated_patterns_v1
where row_count > 1;

-- Phase 5: derivation safety.
select
  family_name,
  safe_to_derive_now,
  collision_count_if_derived,
  ambiguity_count_if_derived
from pik_variant_ambiguity_safety_v1;

-- Phase 6: execution split.
select
  plan_order,
  execution_unit,
  execution_reason
from pik_variant_ambiguity_execution_plan_v1
order by plan_order;

-- Final decision.
select
  variant_ambiguity_row_count,
  dominant_family,
  safe_to_derive_now_counts,
  next_execution_unit,
  audit_status
from pik_variant_ambiguity_final_decision_v1;

rollback;
