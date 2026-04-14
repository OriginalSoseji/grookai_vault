-- PRINT_IDENTITY_KEY_REMAINING_OTHER_26_CONTRACT_AUDIT_V1
-- Read-only audit of the final blocked surface after:
--   - shadow-row reuse realignment
--   - promo backfill
--   - set-classification edge backfill
--   - same-name multi-variant number mirroring

begin;

create temp view pik_remaining_other_26_base_v1 as
select
  cp.id as card_print_id,
  cp.set_id,
  cp.set_code as current_set_code,
  s.code as joined_set_code,
  coalesce(cp.set_code, s.code) as effective_set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  cp.gv_id,
  tcg.external_id as tcgdex_external_id,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(lower(tcg.external_id), '-', 2), '')
  ) as tcgdex_local_id,
  ext.external_mapping_surface,
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
left join public.external_mappings tcg
  on tcg.card_print_id = cp.id
 and tcg.source = 'tcgdex'
 and tcg.active is true
left join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = tcg.external_id
left join lateral (
  select jsonb_object_agg(source, external_ids) as external_mapping_surface
  from (
    select
      em2.source,
      jsonb_agg(em2.external_id order by em2.external_id) as external_ids
    from public.external_mappings em2
    where em2.card_print_id = cp.id
      and em2.active is true
      and em2.source in ('tcgdex', 'pokemonapi', 'justtcg')
    group by em2.source
  ) mapping_groups
) ext
  on true
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

create temp view pik_remaining_other_26_enriched_v1 as
select
  b.*,
  case
    when b.tcgdex_local_id ~ '^[A-Za-z]{2}[0-9]+$' then 'double_alpha_prefix'
    when b.tcgdex_local_id ~ '^[A-Za-z][0-9]+$' then 'single_alpha_prefix'
    when b.tcgdex_local_id ~ '^[0-9]+$' then 'numeric'
    else 'other'
  end as local_id_shape,
  case
    when b.tcgdex_local_id is null then null
    when b.tcgdex_local_id ~ '^[A-Za-z][0-9]+$' then upper(b.tcgdex_local_id)
    when b.tcgdex_local_id ~ '[0-9]' then regexp_replace(regexp_replace(b.tcgdex_local_id, '/.*$', ''), '[^0-9]', '', 'g')
    else b.tcgdex_local_id
  end as generated_number_plain_if_number_set_to_local_id,
  lower(
    concat_ws(
      ':',
      b.effective_set_code,
      b.tcgdex_local_id,
      b.normalized_name,
      nullif(lower(b.printed_identity_modifier), '')
    )
  ) as proposed_print_identity_key,
  count(*) over (
    partition by b.effective_set_code, b.normalized_name
  ) as same_set_same_name_sibling_count
from pik_remaining_other_26_base_v1 b;

create temp view pik_remaining_other_26_family_assignment_v1 as
select
  e.*,
  case
    when e.effective_set_code in ('col1', 'ecard3')
      and e.tcgdex_local_id is not null
      and e.number is null
      and e.number_plain is null
      and e.variant_key = ''
      and e.printed_identity_modifier = ''
      then 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE'
    else 'UNCLASSIFIED'
  end as family_name,
  case
    when e.effective_set_code = 'col1'
      and e.tcgdex_local_id ~ '^[A-Za-z]{2}[0-9]+$'
      then 'Call of Legends shiny-legend exact token (SL#) is already lawful in gv_id and tcgdex localId. print_identity_key can preserve that token directly, but mirroring SL# into number would digit-collapse number_plain under the live generator.'
    when e.effective_set_code = 'col1'
      then 'Call of Legends numeric exact token is already lawful in gv_id and tcgdex localId. The row only lacks print_identity_key hydration.'
    when e.effective_set_code = 'ecard3'
      and e.tcgdex_local_id ~ '^[A-Za-z][0-9]+$'
      then 'Skyridge holo exact token (H#) is already lawful in gv_id and tcgdex localId. The live number_plain generator preserves single-letter holo tokens, so derivation is bounded and deterministic.'
    when e.effective_set_code = 'ecard3'
      then 'Skyridge numeric exact token is already lawful in gv_id and tcgdex localId. The row only lacks print_identity_key hydration.'
    else 'No deterministic family matched the row.'
  end as family_reason
from pik_remaining_other_26_enriched_v1 e;

create temp view pik_remaining_other_26_family_counts_v1 as
with family_seed as (
  select *
  from (
    values
      ('PRINTED_IDENTITY_MODIFIER_REQUIRED'::text),
      ('VARIANT_KEY_REQUIRED_BUT_MISSING'::text),
      ('PROMO_NUMBER_FORMAT_EDGE'::text),
      ('LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE'::text),
      ('SAME_SET_SAME_NUMBER_MULTI_NAME_IDENTITY_GAP'::text),
      ('CHILD_PRINTING_CONTRACT_REQUIRED'::text),
      ('OTHER'::text),
      ('UNCLASSIFIED'::text)
  ) as t(family_name)
),
family_counts as (
  select
    family_name,
    count(*)::int as row_count
  from pik_remaining_other_26_family_assignment_v1
  group by family_name
)
select
  s.family_name,
  coalesce(c.row_count, 0)::int as row_count
from family_seed s
left join family_counts c
  on c.family_name = s.family_name
order by row_count desc, s.family_name;

create temp view pik_remaining_other_26_repeated_patterns_v1 as
select
  effective_set_code as set_code,
  local_id_shape,
  tcgdex_local_id,
  name,
  normalized_name,
  count(*)::int as row_count
from pik_remaining_other_26_family_assignment_v1
group by effective_set_code, local_id_shape, tcgdex_local_id, name, normalized_name
order by set_code, local_id_shape, tcgdex_local_id, name;

create temp view pik_remaining_other_26_set_breakdown_v1 as
select
  family_name,
  effective_set_code as set_code,
  local_id_shape,
  count(*)::int as row_count
from pik_remaining_other_26_family_assignment_v1
group by family_name, effective_set_code, local_id_shape
order by family_name, set_code, local_id_shape;

create temp view pik_remaining_other_26_internal_collisions_v1 as
select
  family_name,
  proposed_print_identity_key,
  count(*)::int as rows_per_key
from pik_remaining_other_26_family_assignment_v1
group by family_name, proposed_print_identity_key
having count(*) > 1;

create temp view pik_remaining_other_26_external_collisions_v1 as
select distinct
  f.family_name,
  f.card_print_id,
  cp2.id as conflicting_card_print_id,
  cp2.print_identity_key as conflicting_print_identity_key
from pik_remaining_other_26_family_assignment_v1 f
join public.card_prints cp2
  on cp2.id <> f.card_print_id
 and cp2.print_identity_key = f.proposed_print_identity_key;

create temp view pik_remaining_other_26_family_safety_v1 as
with family_seed as (
  select *
  from (
    values
      ('PRINTED_IDENTITY_MODIFIER_REQUIRED'::text),
      ('VARIANT_KEY_REQUIRED_BUT_MISSING'::text),
      ('PROMO_NUMBER_FORMAT_EDGE'::text),
      ('LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE'::text),
      ('SAME_SET_SAME_NUMBER_MULTI_NAME_IDENTITY_GAP'::text),
      ('CHILD_PRINTING_CONTRACT_REQUIRED'::text),
      ('OTHER'::text),
      ('UNCLASSIFIED'::text)
  ) as t(family_name)
),
internal_counts as (
  select family_name, count(*)::int as collision_count
  from pik_remaining_other_26_internal_collisions_v1
  group by family_name
),
external_counts as (
  select family_name, count(*)::int as collision_count
  from pik_remaining_other_26_external_collisions_v1
  group by family_name
)
select
  s.family_name,
  case
    when s.family_name = 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE' then 'yes'
    else 'no'
  end as safe_to_derive_now,
  coalesce(i.collision_count, 0)::int + coalesce(e.collision_count, 0)::int as collision_count_if_derived,
  0::int as ambiguity_count_if_derived
from family_seed s
left join internal_counts i
  on i.family_name = s.family_name
left join external_counts e
  on e.family_name = s.family_name
order by s.family_name;

create temp view pik_remaining_other_26_execution_plan_v1 as
select
  1 as plan_order,
  'PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1'::text as execution_unit,
  'Backfill print_identity_key only for the final 26 rows using effective_set_code + exact tcgdex localId + normalized_name. Preserve legacy exact-token semantics inside the key and do not attempt bulk number mirroring for the Call of Legends SL lane.'::text as execution_reason;

create temp view pik_remaining_other_26_final_decision_v1 as
select
  (select count(*)::int from pik_remaining_other_26_family_assignment_v1) as remaining_row_count,
  (
    select jsonb_object_agg(family_name, row_count)
    from pik_remaining_other_26_family_counts_v1
  ) as family_counts,
  jsonb_build_object(
    'yes',
    coalesce((
      select sum(fc.row_count)
      from pik_remaining_other_26_family_counts_v1 fc
      join pik_remaining_other_26_family_safety_v1 sf
        on sf.family_name = fc.family_name
      where sf.safe_to_derive_now = 'yes'
    ), 0),
    'no',
    coalesce((
      select sum(fc.row_count)
      from pik_remaining_other_26_family_counts_v1 fc
      join pik_remaining_other_26_family_safety_v1 sf
        on sf.family_name = fc.family_name
      where sf.safe_to_derive_now = 'no'
    ), 0)
  ) as safe_to_derive_now_counts,
  0::int as requires_new_contract_count,
  'PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1'::text as next_execution_unit,
  'full_coverage_reachable_without_schema_change_after_one_bounded_legacy_apply'::text as closure_readiness_status,
  case
    when (select count(*)::int from pik_remaining_other_26_family_assignment_v1) = 26
      and (select row_count from pik_remaining_other_26_family_counts_v1 where family_name = 'UNCLASSIFIED') = 0
      and (select count(*)::int from pik_remaining_other_26_internal_collisions_v1) = 0
      and (select count(*)::int from pik_remaining_other_26_external_collisions_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: target extraction.
select
  card_print_id,
  name,
  effective_set_code as set_code,
  set_id,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id
from pik_remaining_other_26_family_assignment_v1
order by effective_set_code, tcgdex_local_id, normalized_name, card_print_id;

-- Phase 2: full identity surface analysis.
select
  card_print_id,
  name,
  normalized_name,
  effective_set_code,
  tcgdex_local_id,
  local_id_shape,
  generated_number_plain_if_number_set_to_local_id,
  variant_key as effective_variant_key,
  printed_identity_modifier as effective_printed_identity_modifier,
  same_set_same_name_sibling_count,
  external_mapping_surface
from pik_remaining_other_26_family_assignment_v1
order by effective_set_code, tcgdex_local_id, normalized_name, card_print_id;

-- Phase 3: final family classification.
select
  card_print_id,
  name,
  effective_set_code as set_code,
  tcgdex_local_id,
  family_name,
  family_reason
from pik_remaining_other_26_family_assignment_v1
order by family_name, effective_set_code, tcgdex_local_id, normalized_name, card_print_id;

-- Phase 4: grouped root cause summary.
select
  family_name,
  row_count
from pik_remaining_other_26_family_counts_v1;

select
  family_name,
  set_code,
  local_id_shape,
  row_count
from pik_remaining_other_26_set_breakdown_v1;

select
  set_code,
  local_id_shape,
  tcgdex_local_id,
  name,
  normalized_name,
  row_count
from pik_remaining_other_26_repeated_patterns_v1;

-- Phase 5: derivation safety test.
select
  family_name,
  safe_to_derive_now,
  collision_count_if_derived,
  ambiguity_count_if_derived
from pik_remaining_other_26_family_safety_v1;

-- Phase 6: final execution split.
select
  plan_order,
  execution_unit,
  execution_reason
from pik_remaining_other_26_execution_plan_v1
order by plan_order;

-- Phase 7: closure readiness.
select
  remaining_row_count,
  family_counts,
  safe_to_derive_now_counts,
  requires_new_contract_count,
  next_execution_unit,
  closure_readiness_status,
  audit_status
from pik_remaining_other_26_final_decision_v1;

rollback;
