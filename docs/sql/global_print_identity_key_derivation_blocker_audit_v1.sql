-- GLOBAL_PRINT_IDENTITY_KEY_DERIVATION_BLOCKER_AUDIT_V1
-- Read-only audit of the canonical rows that currently block deterministic
-- print_identity_key derivation.
--
-- Scope note:
--   This audit is intentionally bounded to the 1363-row preflight blocker
--   surface. Rows with print_identity_key = null but complete derivation
--   inputs remain future backfill work, not blocker rows.

begin;

create temp view global_pik_blocker_projection_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.print_identity_key as current_print_identity_key,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
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
  case
    when cp.set_code is null or btrim(cp.set_code) = '' then 'yes'
    else 'no'
  end as missing_set_code,
  case
    when cp.number_plain is null or btrim(cp.number_plain) = '' then 'yes'
    else 'no'
  end as missing_number_plain,
  case
    when cp.name is null or btrim(cp.name) = '' then 'yes'
    else 'no'
  end as missing_name,
  case
    when cp.name is not null
      and btrim(cp.name) <> ''
      and lower(
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
      ) = ''
      then 'yes'
    else 'no'
  end as malformed_name,
  case
    when coalesce(cp.variant_key, '') <> ''
      and cp.variant_key !~ '^[A-Za-z0-9_]+$'
      then 'yes'
    else 'no'
  end as malformed_variant_key,
  case
    when coalesce(cp.printed_identity_modifier, '') <> ''
      and cp.printed_identity_modifier !~ '^[a-z0-9_]+$'
      then 'yes'
    else 'no'
  end as malformed_modifier
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null;

create temp view global_pik_derivation_blockers_v1 as
select
  p.*,
  array_remove(
    array[
      case when p.missing_set_code = 'yes' then 'missing_set_code' end,
      case when p.missing_number_plain = 'yes' then 'missing_number_plain' end,
      case when p.missing_name = 'yes' then 'missing_name' end,
      case when p.malformed_name = 'yes' then 'malformed_name' end,
      case when p.malformed_variant_key = 'yes' then 'malformed_variant_key' end,
      case when p.malformed_modifier = 'yes' then 'malformed_modifier' end
    ],
    null
  ) as blocker_reasons
from global_pik_blocker_projection_v1 p
where p.missing_set_code = 'yes'
   or p.missing_number_plain = 'yes'
   or p.missing_name = 'yes'
   or p.malformed_name = 'yes'
   or p.malformed_variant_key = 'yes'
   or p.malformed_modifier = 'yes';

create temp view global_pik_blocker_scope_summary_v1 as
select
  count(*)::int as blocker_row_count,
  count(*) filter (where current_print_identity_key is null)::int as blockers_with_null_print_identity_key,
  count(*) filter (where current_print_identity_key is not null)::int as blockers_with_existing_print_identity_key,
  (
    select count(*)::int
    from global_pik_blocker_projection_v1
    where current_print_identity_key is null
      and card_print_id not in (select card_print_id from global_pik_derivation_blockers_v1)
  ) as null_print_identity_key_rows_outside_blocker_scope
from global_pik_derivation_blockers_v1;

create temp view global_pik_blocker_classification_v1 as
select
  b.*,
  case
    when b.malformed_variant_key = 'yes' then 'LEGACY_VARIANT_KEY_SHAPE'
    when b.malformed_modifier = 'yes' then 'PRINTED_IDENTITY_MODIFIER_GAP'
    when b.missing_name = 'yes' or b.malformed_name = 'yes' then 'MISSING_OR_INVALID_NAME'
    when b.missing_number_plain = 'yes' then 'MISSING_NUMBER_PLAIN'
    when b.missing_set_code = 'yes' then 'SET_CODE_CLASSIFICATION_GAP'
    else 'OTHER'
  end as execution_class,
  case
    when b.malformed_variant_key = 'yes' then 'LEGACY_PUNCTUATION_VARIANT_KEYS'
    when b.missing_set_code = 'yes' and b.missing_number_plain = 'yes' then 'NULL_NUMBER_SURFACE_AND_SET_CODE_MIRROR_GAP'
    when b.missing_set_code = 'yes' then 'SET_CODE_MIRROR_MISSING_WITH_JOINABLE_SET'
    when b.missing_name = 'yes' or b.malformed_name = 'yes' then 'NAME_SURFACE_INVALID_FOR_DERIVATION'
    when b.malformed_modifier = 'yes' then 'PRINTED_IDENTITY_MODIFIER_SHAPE_GAP'
    else 'OTHER'
  end as grouped_root_cause,
  case
    when b.variant_key = 'rc'
      or b.printed_identity_modifier <> ''
      or coalesce(b.number, '') ~ '^RC[0-9]+$'
      or coalesce(b.name, '') like '%δ%'
      then 'special_identity_rows'
    when coalesce(b.joined_set_code, '') in ('2021swsh', 'me01', 'mep', 'svp')
      or lower(coalesce(b.joined_set_name, '')) like '%promo%'
      or lower(coalesce(b.joined_set_name, '')) like '%collection%'
      then 'promo_sets'
    when coalesce(b.joined_set_code, '') like 'ecard%'
      or coalesce(b.joined_set_code, '') like 'ex%'
      or coalesce(b.joined_set_code, '') like 'bw%'
      or coalesce(b.joined_set_code, '') = 'col1'
      then 'legacy_sets'
    when b.missing_number_plain = 'yes' and b.number is null
      then 'ingestion_anomalies'
    else 'other_domains'
  end as risk_domain,
  case
    when b.malformed_variant_key = 'yes' then 'requires_contract'
    when b.malformed_modifier = 'yes' then 'requires_contract'
    when b.missing_name = 'yes' or b.malformed_name = 'yes' then 'requires_manual_review'
    when b.missing_number_plain = 'yes' then 'requires_contract'
    when b.missing_set_code = 'yes'
      and b.joined_set_code is not null
      and btrim(b.joined_set_code) <> ''
      then 'requires_normalization_fix'
    when b.missing_set_code = 'yes' then 'requires_manual_review'
    else 'ready_now'
  end as readiness_bucket
from global_pik_derivation_blockers_v1 b;

create temp view global_pik_blocker_grouped_counts_v1 as
select
  count(*) filter (where execution_class = 'MISSING_NUMBER_PLAIN')::int as missing_number_plain_count,
  count(*) filter (where execution_class = 'MISSING_OR_INVALID_NAME')::int as missing_name_count,
  count(*) filter (where execution_class = 'LEGACY_VARIANT_KEY_SHAPE')::int as variant_key_shape_count,
  count(*) filter (where execution_class = 'PRINTED_IDENTITY_MODIFIER_GAP')::int as modifier_gap_count,
  count(*) filter (where execution_class = 'SET_CODE_CLASSIFICATION_GAP')::int as set_code_gap_count,
  count(*) filter (where execution_class = 'OTHER')::int as other_count
from global_pik_blocker_classification_v1;

create temp view global_pik_blocker_grouped_root_causes_v1 as
select
  grouped_root_cause,
  count(*)::int as row_count
from global_pik_blocker_classification_v1
group by grouped_root_cause
order by row_count desc, grouped_root_cause;

create temp view global_pik_blocker_domain_summary_v1 as
with domain_list as (
  select 'promo_sets'::text as risk_domain
  union all select 'legacy_sets'::text
  union all select 'special_identity_rows'::text
  union all select 'ingestion_anomalies'::text
),
domain_counts as (
  select
    risk_domain,
    execution_class,
    count(*)::int as row_count
  from global_pik_blocker_classification_v1
  group by risk_domain, execution_class
)
select
  d.risk_domain,
  coalesce(sum(dc.row_count), 0)::int as row_count,
  coalesce((
    select dc2.execution_class
    from domain_counts dc2
    where dc2.risk_domain = d.risk_domain
    order by dc2.row_count desc, dc2.execution_class
    limit 1
  ), 'none') as dominant_failure_type
from domain_list d
left join domain_counts dc
  on dc.risk_domain = d.risk_domain
group by d.risk_domain
order by row_count desc, d.risk_domain;

create temp view global_pik_blocker_readiness_v1 as
select
  count(*) filter (where readiness_bucket = 'ready_now')::int as ready_now_count,
  count(*) filter (where readiness_bucket = 'requires_normalization_fix')::int as requires_normalization_fix_count,
  count(*) filter (where readiness_bucket = 'requires_contract')::int as requires_contract_count,
  count(*) filter (where readiness_bucket = 'requires_manual_review')::int as requires_manual_review_count
from global_pik_blocker_classification_v1;

create temp view global_pik_blocker_final_decision_v1 as
select
  (select blocker_row_count from global_pik_blocker_scope_summary_v1) as blocker_row_count,
  'PRINT_IDENTITY_KEY_DERIVATION_RULES_V1'::text as next_execution_unit,
  case
    when (select blocker_row_count from global_pik_blocker_scope_summary_v1) = 1363
      and (select other_count from global_pik_blocker_grouped_counts_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Phase 1: blocker row extraction.
select
  blocker_row_count,
  blockers_with_null_print_identity_key,
  blockers_with_existing_print_identity_key,
  null_print_identity_key_rows_outside_blocker_scope
from global_pik_blocker_scope_summary_v1;

select
  card_print_id,
  name,
  coalesce(joined_set_code, set_code) as set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier
from global_pik_derivation_blockers_v1
order by coalesce(joined_set_code, set_code), number_plain nulls first, name, card_print_id;

-- Phase 2: derivation input validation.
select
  card_print_id,
  name,
  coalesce(joined_set_code, set_code) as set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  normalized_printed_name_token,
  missing_set_code,
  missing_number_plain,
  missing_name,
  malformed_name,
  malformed_variant_key,
  malformed_modifier
from global_pik_derivation_blockers_v1
order by coalesce(joined_set_code, set_code), number_plain nulls first, name, card_print_id;

-- Phase 3: final per-row classification.
select
  card_print_id,
  name,
  coalesce(joined_set_code, set_code) as set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  execution_class,
  grouped_root_cause,
  readiness_bucket,
  blocker_reasons
from global_pik_blocker_classification_v1
order by execution_class, coalesce(joined_set_code, set_code), number_plain nulls first, name, card_print_id;

-- Phase 4: grouped root-cause counts.
select
  missing_number_plain_count,
  missing_name_count,
  variant_key_shape_count,
  modifier_gap_count,
  set_code_gap_count,
  other_count
from global_pik_blocker_grouped_counts_v1;

select
  grouped_root_cause,
  row_count
from global_pik_blocker_grouped_root_causes_v1;

-- Phase 5: high-risk domains.
select
  risk_domain,
  row_count,
  dominant_failure_type
from global_pik_blocker_domain_summary_v1;

-- Phase 6: backfill readiness.
select
  ready_now_count,
  requires_normalization_fix_count,
  requires_contract_count,
  requires_manual_review_count
from global_pik_blocker_readiness_v1;

-- Phase 7: final decision.
select
  blocker_row_count,
  next_execution_unit,
  audit_status
from global_pik_blocker_final_decision_v1;

rollback;
