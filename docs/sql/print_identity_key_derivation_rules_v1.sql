-- PRINT_IDENTITY_KEY_DERIVATION_RULES_V1
-- Read-only contract audit for extending print_identity_key derivation rules
-- without mutating canonical data.

begin;

create temp view pik_rules_base_contract_v1 as
select
  'lower(concat_ws('':'', set_code, number_plain, normalized_printed_name_token, printed_identity_modifier_if_present))'::text as base_derivation_rule,
  'set_code + number_plain + normalized_printed_name_token are mandatory; printed_identity_modifier participates only when nonblank'::text as base_rule_notes;

create temp view pik_rules_canonical_surface_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null;

create temp view pik_rules_blocker_surface_v1 as
select
  *
from pik_rules_canonical_surface_v1
where (set_code is null or btrim(set_code) = '')
   or (number_plain is null or btrim(number_plain) = '')
   or (name is null or btrim(name) = '')
   or (variant_key <> '' and variant_key !~ '^[A-Za-z0-9_]+$')
   or (printed_identity_modifier <> '' and printed_identity_modifier !~ '^[a-z0-9_]+$');

create temp view pik_rules_extended_projection_v1 as
select
  b.*,
  case
    when b.set_code is not null and btrim(b.set_code) <> '' then b.set_code
    when b.joined_set_code is not null and btrim(b.joined_set_code) <> '' then b.joined_set_code
    else null
  end as effective_set_code,
  case
    when b.number_plain is not null and btrim(b.number_plain) <> '' then b.number_plain
    when b.number is not null
      and regexp_replace(b.number, '[^0-9]+', '', 'g') <> ''
      then regexp_replace(b.number, '[^0-9]+', '', 'g')
    when b.number is not null
      and btrim(b.number) <> ''
      and btrim(
        both '-' from regexp_replace(
          regexp_replace(trim(b.number), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      ) <> ''
      then lower(
        btrim(
          both '-' from regexp_replace(
            regexp_replace(trim(b.number), '[^A-Za-z0-9]+', '-', 'g'),
            '-+',
            '-',
            'g'
          )
        )
      )
    else null
  end as effective_number_plain,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(b.name, ''), '’', '''', 'g'),
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
          '-+',
          '-',
          'g'
        )
      ),
      '(^-|-$)',
      '',
      'g'
    )
  ) as normalized_printed_name_token,
  case
    when b.variant_key = '' then ''
    when b.variant_key ~ '^[A-Za-z0-9_]+$' then lower(b.variant_key)
    when b.joined_set_code = 'ex10'
      and b.name = 'Unown'
      and b.number_plain is not null
      and btrim(b.number_plain) <> ''
      and b.variant_key = b.number_plain
      then b.variant_key
    else null
  end as normalized_variant_key,
  case
    when b.printed_identity_modifier = '' then ''
    when b.printed_identity_modifier ~ '^[a-z0-9_]+$' then b.printed_identity_modifier
    else null
  end as normalized_printed_identity_modifier
from pik_rules_blocker_surface_v1 b;

create temp view pik_rules_derivation_result_v1 as
select
  p.*,
  case
    when p.effective_set_code is null then 'BLOCKED_SET_CODE'
    when p.effective_number_plain is null then 'BLOCKED_NUMBER'
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then 'BLOCKED_NAME'
    when p.normalized_variant_key is null then 'BLOCKED_VARIANT'
    when p.normalized_printed_identity_modifier is null then 'BLOCKED_MODIFIER'
    else 'DERIVABLE'
  end as derivation_status,
  case
    when p.effective_set_code is null then null
    when p.effective_number_plain is null then null
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then null
    when p.normalized_variant_key is null then null
    when p.normalized_printed_identity_modifier is null then null
    else lower(
      concat_ws(
        ':',
        p.effective_set_code,
        p.effective_number_plain,
        p.normalized_printed_name_token,
        nullif(p.normalized_printed_identity_modifier, '')
      )
    )
  end as proposed_print_identity_key,
  case
    when p.effective_set_code is null then 'set_code unresolved after local fallback'
    when p.effective_number_plain is null then 'number_plain missing and no deterministic printed-number fallback available'
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then 'printed name token cannot be normalized'
    when p.normalized_variant_key is null then 'variant_key shape not permitted by current contract'
    when p.normalized_printed_identity_modifier is null then 'printed_identity_modifier shape not permitted by current contract'
    else 'derivable under extended rules'
  end as proof_reason
from pik_rules_extended_projection_v1 p;

create temp view pik_rules_candidate_duplicates_v1 as
select
  set_id,
  effective_number_plain as number_plain,
  proposed_print_identity_key as print_identity_key,
  normalized_variant_key as variant_key,
  count(*)::int as rows_per_identity
from pik_rules_derivation_result_v1
where derivation_status = 'DERIVABLE'
group by
  set_id,
  effective_number_plain,
  proposed_print_identity_key,
  normalized_variant_key
having count(*) > 1;

create temp view pik_rules_full_surface_v1 as
select
  cp.id as row_id,
  cp.set_id,
  cp.number_plain,
  cp.print_identity_key,
  coalesce(cp.variant_key, '') as variant_key
from public.card_prints cp
where cp.gv_id is not null
  and cp.print_identity_key is not null

union all

select
  d.card_print_id as row_id,
  d.set_id,
  d.effective_number_plain as number_plain,
  d.proposed_print_identity_key as print_identity_key,
  d.normalized_variant_key as variant_key
from pik_rules_derivation_result_v1 d
where d.derivation_status = 'DERIVABLE';

create temp view pik_rules_full_surface_duplicates_v1 as
select
  set_id,
  number_plain,
  print_identity_key,
  variant_key,
  count(*)::int as rows_per_identity
from pik_rules_full_surface_v1
group by
  set_id,
  number_plain,
  print_identity_key,
  variant_key
having count(*) > 1;

create temp view pik_rules_readiness_summary_v1 as
select
  count(*) filter (where derivation_status = 'DERIVABLE')::int as derivable_row_count,
  count(*) filter (where derivation_status <> 'DERIVABLE')::int as remaining_blocked_count,
  count(*) filter (where derivation_status = 'DERIVABLE' and set_code is null and joined_set_code is not null)::int as rows_derivable_via_set_id_join,
  count(*) filter (where derivation_status = 'DERIVABLE' and variant_key <> '' and variant_key !~ '^[A-Za-z0-9_]+$')::int as rows_derivable_via_legacy_variant_contract,
  count(*) filter (where derivation_status = 'BLOCKED_NUMBER')::int as blocked_number_count,
  count(*) filter (where derivation_status = 'BLOCKED_SET_CODE')::int as blocked_set_code_count,
  count(*) filter (where derivation_status = 'BLOCKED_VARIANT')::int as blocked_variant_count,
  count(*) filter (where derivation_status = 'BLOCKED_NAME')::int as blocked_name_count,
  count(*) filter (where derivation_status = 'BLOCKED_MODIFIER')::int as blocked_modifier_count
from pik_rules_derivation_result_v1;

create temp view pik_rules_final_decision_v1 as
select
  (select derivable_row_count from pik_rules_readiness_summary_v1) as derivable_row_count,
  (select remaining_blocked_count from pik_rules_readiness_summary_v1) as remaining_blocked_count,
  case
    when (select count(*)::int from pik_rules_candidate_duplicates_v1) = 0
      and (select count(*)::int from pik_rules_full_surface_duplicates_v1) = 0
      then 'none_for_derivable_subset'
    else 'detected'
  end as collision_risk,
  'MIXED_EXECUTION_SPLIT'::text as next_execution_unit,
  case
    when (select derivable_row_count from pik_rules_readiness_summary_v1) = 31
      and (select remaining_blocked_count from pik_rules_readiness_summary_v1) = 1332
      and (select count(*)::int from pik_rules_candidate_duplicates_v1) = 0
      and (select count(*)::int from pik_rules_full_surface_duplicates_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: base derivation rule.
select
  base_derivation_rule,
  base_rule_notes
from pik_rules_base_contract_v1;

-- Phase 2-4: extended per-row rule evaluation.
select
  card_print_id,
  coalesce(joined_set_code, set_code) as joined_set_code,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  effective_set_code,
  effective_number_plain,
  normalized_printed_name_token,
  normalized_variant_key,
  normalized_printed_identity_modifier,
  derivation_status,
  proposed_print_identity_key,
  proof_reason
from pik_rules_derivation_result_v1
order by derivation_status, coalesce(joined_set_code, set_code), name, card_print_id;

-- Phase 5-7: readiness and collision validation.
select
  derivable_row_count,
  remaining_blocked_count,
  rows_derivable_via_set_id_join,
  rows_derivable_via_legacy_variant_contract,
  blocked_number_count,
  blocked_set_code_count,
  blocked_variant_count,
  blocked_name_count,
  blocked_modifier_count
from pik_rules_readiness_summary_v1;

select
  set_id,
  number_plain,
  print_identity_key,
  variant_key,
  rows_per_identity
from pik_rules_candidate_duplicates_v1;

select
  set_id,
  number_plain,
  print_identity_key,
  variant_key,
  rows_per_identity
from pik_rules_full_surface_duplicates_v1;

-- Final decision.
select
  derivable_row_count,
  remaining_blocked_count,
  collision_risk,
  next_execution_unit,
  audit_status
from pik_rules_final_decision_v1;

rollback;
