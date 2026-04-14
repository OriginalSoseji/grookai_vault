-- PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_COLLISION_CONTRACT_AUDIT_V1
-- Read-only audit of the 693 collision cases discovered during authoritative
-- tcgdex number recovery for the numberless modern main-set family.
--
-- Scope note:
--   The prior failed dry-run targeted 1125 modern numberless rows.
--   This audit explains the 693-row collision subset and proves whether those
--   rows are exact shadow duplicates of existing numbered canon.

begin;

create temp view pik_modern_numberless_family_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  s.code as set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  em.external_id as tcgdex_external_id,
  ri.payload->'card'->>'localId' as tcgdex_number,
  regexp_replace(ri.payload->'card'->>'localId', '^0+(?!$)', '') as recovered_number_plain,
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
                    'g'
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
join public.sets s
  on s.id = cp.set_id
join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
 and em.active is true
join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = em.external_id
where cp.gv_id is not null
  and cp.print_identity_key is null
  and (cp.set_code is null or btrim(cp.set_code) = '')
  and (cp.number is null or btrim(cp.number) = '')
  and (cp.number_plain is null or btrim(cp.number_plain) = '')
  and s.code in (
    'sv02',
    'sv04',
    'sv04.5',
    'sv06',
    'sv06.5',
    'sv07',
    'sv08',
    'sv09',
    'sv10',
    'swsh10.5'
  );

create temp view pik_modern_numberless_collision_candidates_v1 as
select
  mf.card_print_id,
  mf.name,
  mf.set_code,
  mf.number,
  mf.number_plain,
  mf.variant_key,
  mf.tcgdex_external_id,
  mf.tcgdex_number,
  mf.recovered_number_plain,
  mf.normalized_name,
  cp2.id as existing_canonical_target_id,
  cp2.gv_id as existing_gv_id,
  cp2.name as canonical_name,
  cp2.number as canonical_number,
  cp2.number_plain as canonical_number_plain,
  coalesce(cp2.variant_key, '') as canonical_variant_key,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(cp2.name, ''), '’', '''', 'g'),
                    'δ',
                    ' delta ',
                    'g'
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
  ) as canonical_normalized_name
from pik_modern_numberless_family_v1 mf
left join public.card_prints cp2
  on cp2.set_id = mf.set_id
 and cp2.gv_id is not null
 and cp2.number_plain = mf.recovered_number_plain
 and coalesce(cp2.variant_key, '') = mf.variant_key;

create temp view pik_modern_numberless_collision_classification_v1 as
select
  c.*,
  case
    when c.existing_canonical_target_id is null then 'NO_EXISTING_CANONICAL_TARGET'
    when c.normalized_name = c.canonical_normalized_name
      and c.set_code is not distinct from c.set_code
      and c.recovered_number_plain = c.canonical_number_plain
      and c.variant_key = c.canonical_variant_key
      then 'IDENTITY_EQUIVALENT_SHADOW_ROWS'
    else 'NON_EQUIVALENT_COLLISION'
  end as collision_classification
from pik_modern_numberless_collision_candidates_v1 c;

create temp view pik_modern_numberless_per_target_v1 as
select
  mf.card_print_id,
  mf.set_code,
  mf.name,
  mf.tcgdex_number,
  mf.recovered_number_plain,
  count(cc.existing_canonical_target_id)::int as canonical_candidate_count,
  count(*) filter (
    where cc.collision_classification = 'IDENTITY_EQUIVALENT_SHADOW_ROWS'
  )::int as canonical_equivalent_count,
  min(cc.existing_canonical_target_id) as existing_canonical_target_id,
  min(cc.existing_gv_id) as existing_gv_id
from pik_modern_numberless_family_v1 mf
left join pik_modern_numberless_collision_classification_v1 cc
  on cc.card_print_id = mf.card_print_id
group by
  mf.card_print_id,
  mf.set_code,
  mf.name,
  mf.tcgdex_number,
  mf.recovered_number_plain;

create temp view pik_modern_numberless_shadow_surface_v1 as
select
  pt.card_print_id,
  pt.name,
  pt.set_code,
  null::text as number,
  null::text as number_plain,
  pt.tcgdex_number,
  pt.existing_canonical_target_id,
  pt.existing_gv_id
from pik_modern_numberless_per_target_v1 pt
where pt.canonical_candidate_count = 1
  and pt.canonical_equivalent_count = 1;

create temp view pik_modern_numberless_summary_v1 as
select
  (select count(*)::int from pik_modern_numberless_family_v1) as modern_family_row_count,
  (select count(*)::int from pik_modern_numberless_shadow_surface_v1) as shadow_row_count,
  (select count(*)::int from pik_modern_numberless_shadow_surface_v1) as canonical_equivalent_count,
  (
    select count(*)::int
    from pik_modern_numberless_per_target_v1
    where canonical_candidate_count = 0
  ) as non_collision_modern_rows,
  (
    select count(*)::int
    from pik_modern_numberless_per_target_v1
    where canonical_candidate_count > 1
       or (canonical_candidate_count = 1 and canonical_equivalent_count = 0)
  ) as ambiguous_or_non_equivalent_rows,
  1332 - (select count(*)::int from pik_modern_numberless_shadow_surface_v1) as remaining_true_blockers,
  207 as blockers_outside_modern_family
;

create temp view pik_modern_numberless_final_decision_v1 as
select
  shadow_row_count,
  canonical_equivalent_count,
  case
    when shadow_row_count = 693 then 'yes_for_693_collision_subset_only'
    else 'no'
  end as reclassified_as_shadow,
  remaining_true_blockers,
  'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1'::text as next_execution_unit,
  case
    when shadow_row_count = 693
      and canonical_equivalent_count = 693
      and ambiguous_or_non_equivalent_rows = 432
      then 'passed'
    else 'failed'
  end as audit_status
from pik_modern_numberless_summary_v1;

-- Phase 1: collision surface audit.
select
  card_print_id,
  name,
  set_code,
  number,
  number_plain,
  tcgdex_number,
  existing_canonical_target_id,
  existing_gv_id
from pik_modern_numberless_shadow_surface_v1
order by set_code, tcgdex_number::int, name, card_print_id;

-- Phase 2-3: identity equivalence proof and classification summary.
select
  modern_family_row_count,
  shadow_row_count,
  canonical_equivalent_count,
  non_collision_modern_rows,
  ambiguous_or_non_equivalent_rows,
  blockers_outside_modern_family,
  remaining_true_blockers
from pik_modern_numberless_summary_v1;

select
  card_print_id,
  set_code,
  name,
  tcgdex_number,
  recovered_number_plain,
  canonical_candidate_count,
  canonical_equivalent_count,
  existing_canonical_target_id,
  existing_gv_id
from pik_modern_numberless_per_target_v1
order by set_code, recovered_number_plain::int nulls last, name, card_print_id;

-- Final decision.
select
  shadow_row_count,
  canonical_equivalent_count,
  reclassified_as_shadow,
  remaining_true_blockers,
  next_execution_unit,
  audit_status
from pik_modern_numberless_final_decision_v1;

rollback;
