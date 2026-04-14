-- PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1
-- Read-only contract audit for the dominant print_identity_key blocker family:
-- numberless modern main-set rows.

begin;

create temp view pik_numberless_modern_family_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  s.code as set_code,
  s.name as set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
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
  ) as normalized_name_token
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
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

create temp view pik_numberless_modern_external_evidence_v1 as
select
  f.card_print_id,
  em.source,
  em.external_id,
  ri.id as raw_import_id,
  ri.payload->'card'->>'localId' as raw_local_id,
  ri.payload->'card'->>'id' as raw_card_id,
  ri.payload->'card'->>'name' as raw_name,
  ri.payload->'card'->'set'->>'id' as raw_set_id,
  regexp_replace(em.external_id, '^[^-]+-', '') as parsed_external_suffix,
  regexp_replace(coalesce(ri.payload->'card'->>'localId', ''), '^0+', '') as local_id_number_plain,
  case
    when ri.id is not null
      and ri.payload->'card'->>'localId' ~ '^\d+$'
      and regexp_replace(em.external_id, '^[^-]+-', '') = ri.payload->'card'->>'localId'
      and ri.payload->'card'->>'name' = f.name
      and ri.payload->'card'->'set'->>'id' = f.set_code
      then 'yes'
    else 'no'
  end as authoritative_number_recoverable
from pik_numberless_modern_family_v1 f
left join public.external_mappings em
  on em.card_print_id = f.card_print_id
 and em.source = 'tcgdex'
left join public.raw_imports ri
  on ri.source = 'tcgdex'
 and coalesce(
      ri.payload->>'_external_id',
      ri.payload->>'id',
      ri.payload->'card'->>'id',
      ri.payload->'card'->>'_id'
    ) = em.external_id;

create temp view pik_numberless_modern_same_set_candidates_v1 as
select
  f.card_print_id,
  count(cp2.id)::int as same_set_same_name_with_number_count,
  array_agg(cp2.number_plain order by cp2.number_plain) filter (
    where cp2.id is not null
  ) as candidate_numbers
from pik_numberless_modern_family_v1 f
left join public.card_prints cp2
  on cp2.set_id = f.set_id
 and cp2.gv_id is not null
 and cp2.id <> f.card_print_id
 and cp2.number_plain is not null
 and btrim(cp2.number_plain) <> ''
 and lower(
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
    ) = f.normalized_name_token
 and coalesce(cp2.variant_key, '') = f.variant_key
group by f.card_print_id;

create temp view pik_numberless_modern_classification_v1 as
select
  f.*,
  e.source as recovery_source,
  e.external_id as recovery_external_id,
  e.raw_import_id,
  e.raw_local_id,
  e.raw_card_id,
  e.raw_name,
  e.raw_set_id,
  e.local_id_number_plain,
  s.same_set_same_name_with_number_count,
  s.candidate_numbers,
  case
    when f.number is not null and btrim(f.number) <> ''
      then 'NUMBER_RECOVERABLE'
    when e.authoritative_number_recoverable = 'yes'
      then 'NUMBER_RECOVERABLE'
    else 'NUMBER_NOT_PRESENT_ANYWHERE'
  end as recovery_classification,
  case
    when f.number is not null and btrim(f.number) <> ''
      then 'current number field already populated'
    when e.authoritative_number_recoverable = 'yes'
      then 'tcgdex localId matches external_id suffix, raw card name, and raw set id'
    else 'no authoritative number surface located'
  end as recovery_reason
from pik_numberless_modern_family_v1 f
left join pik_numberless_modern_external_evidence_v1 e
  on e.card_print_id = f.card_print_id
left join pik_numberless_modern_same_set_candidates_v1 s
  on s.card_print_id = f.card_print_id;

create temp view pik_numberless_modern_ordering_test_v1 as
with ranked as (
  select
    c.card_print_id,
    c.set_code,
    c.name,
    c.raw_local_id,
    row_number() over (
      partition by c.set_code
      order by c.name, c.card_print_id
    ) as alpha_rank,
    row_number() over (
      partition by c.set_code
      order by c.raw_local_id::int, c.name, c.card_print_id
    ) as numeric_rank
  from pik_numberless_modern_classification_v1 c
  where c.raw_local_id ~ '^\d+$'
)
select
  count(*) filter (where alpha_rank = numeric_rank)::int as rows_with_order_match,
  count(*) filter (where alpha_rank <> numeric_rank)::int as rows_with_order_mismatch
from ranked;

create temp view pik_numberless_modern_option_c_collisions_v1 as
select
  set_code,
  normalized_name_token,
  variant_key,
  count(*)::int as rows_per_group,
  array_agg(name order by name, card_print_id) as names,
  array_agg(card_print_id order by name, card_print_id) as card_print_ids
from pik_numberless_modern_family_v1
group by set_code, normalized_name_token, variant_key
having count(*) > 1;

create temp view pik_numberless_modern_same_set_candidate_distribution_v1 as
select
  same_set_same_name_with_number_count,
  count(*)::int as row_count
from pik_numberless_modern_classification_v1
group by same_set_same_name_with_number_count
order by same_set_same_name_with_number_count;

create temp view pik_numberless_modern_summary_v1 as
select
  count(*)::int as family_row_count,
  count(*) filter (where recovery_classification = 'NUMBER_RECOVERABLE')::int as number_recoverable_count,
  count(*) filter (where recovery_classification = 'NUMBER_NOT_PRESENT_ANYWHERE')::int as number_not_present_count,
  count(*) filter (where number is not null and btrim(number) <> '')::int as recoverable_from_existing_number_field_count,
  count(*) filter (
    where recovery_source = 'tcgdex'
      and raw_import_id is not null
      and raw_local_id ~ '^\d+$'
  )::int as recoverable_from_external_tcgdex_count,
  count(*) filter (
    where same_set_same_name_with_number_count > 0
  )::int as rows_with_same_set_canonical_number_candidates,
  count(*) filter (
    where same_set_same_name_with_number_count > 1
  )::int as rows_with_ambiguous_same_set_number_candidates,
  (select count(*)::int from pik_numberless_modern_option_c_collisions_v1) as collision_count_under_option_c,
  (
    select coalesce(sum(rows_per_group), 0)::int
    from pik_numberless_modern_option_c_collisions_v1
  ) as ambiguity_count_under_option_c,
  (select rows_with_order_match from pik_numberless_modern_ordering_test_v1) as rows_with_order_match,
  (select rows_with_order_mismatch from pik_numberless_modern_ordering_test_v1) as rows_with_order_mismatch
from pik_numberless_modern_classification_v1;

create temp view pik_numberless_modern_final_decision_v1 as
select
  number_recoverable_count,
  number_not_present_count,
  collision_count_under_option_c,
  ambiguity_count_under_option_c,
  'AUTHORITATIVE_TCGDEX_NUMBER_RECOVERY_THEN_STANDARD_DERIVATION'::text as selected_contract_strategy,
  case
    when number_recoverable_count = 1125
      and number_not_present_count = 0
      then 'yes'
    else 'no'
  end as safe_to_derive_numberless_rows,
  'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1'::text as next_execution_unit,
  case
    when number_recoverable_count = 1125
      and number_not_present_count = 0
      and collision_count_under_option_c = 119
      then 'passed'
    else 'failed'
  end as audit_status
from pik_numberless_modern_summary_v1;

-- Phase 1: target row audit.
select
  card_print_id,
  name,
  set_code,
  set_id,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier
from pik_numberless_modern_family_v1
order by set_code, name, card_print_id;

-- Phase 2: number source investigation.
select
  card_print_id,
  name,
  set_code,
  number,
  number_plain,
  recovery_source,
  recovery_external_id,
  raw_local_id,
  local_id_number_plain,
  raw_card_id,
  raw_name,
  raw_set_id,
  same_set_same_name_with_number_count,
  candidate_numbers,
  recovery_classification,
  recovery_reason
from pik_numberless_modern_classification_v1
order by set_code, name, card_print_id;

select
  family_row_count,
  number_recoverable_count,
  number_not_present_count,
  recoverable_from_existing_number_field_count,
  recoverable_from_external_tcgdex_count,
  rows_with_same_set_canonical_number_candidates,
  rows_with_ambiguous_same_set_number_candidates
from pik_numberless_modern_summary_v1;

-- Phase 3: false number assumption test.
select
  rows_with_order_match,
  rows_with_order_mismatch
from pik_numberless_modern_ordering_test_v1;

select
  same_set_same_name_with_number_count,
  row_count
from pik_numberless_modern_same_set_candidate_distribution_v1;

-- Phase 4-5: option evaluation and collision test.
select
  collision_count_under_option_c,
  ambiguity_count_under_option_c
from pik_numberless_modern_summary_v1;

select
  set_code,
  normalized_name_token,
  variant_key,
  rows_per_group,
  names,
  card_print_ids
from pik_numberless_modern_option_c_collisions_v1
order by rows_per_group desc, set_code, normalized_name_token;

-- Phase 6-7: final contract decision.
select
  number_recoverable_count,
  number_not_present_count,
  collision_count_under_option_c,
  ambiguity_count_under_option_c,
  selected_contract_strategy,
  safe_to_derive_numberless_rows,
  next_execution_unit,
  audit_status
from pik_numberless_modern_final_decision_v1;

rollback;
