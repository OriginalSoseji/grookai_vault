-- PRINT_IDENTITY_KEY_BLOCKED_SURFACE_AUDIT_V1
-- Read-only decomposition of the remaining blocked print_identity_key surface.
--
-- Scope note:
--   This audit is intentionally bounded to the residual blocked subset of the
--   prior derivation-input-gap surface:
--     - prior gap surface total = 1363
--     - already resolved bounded backfill surface = 31
--     - current blocked surface audited here = 1332
--
--   It is NOT a scan of every canonical row where print_identity_key is null.

begin;

create temp view pik_blocked_gap_surface_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.print_identity_key,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  case
    when cp.number is not null and btrim(cp.number) <> '' then 'yes'
    else 'no'
  end as has_number,
  case
    when cp.number_plain is not null and btrim(cp.number_plain) <> '' then 'yes'
    else 'no'
  end as has_number_plain,
  case
    when cp.number is not null
      and btrim(cp.number) <> ''
      and regexp_replace(cp.number, '[^0-9]+', '', 'g') <> ''
      then 'yes'
    else 'no'
  end as extractable_numeric_token,
  case
    when cp.set_code is not null and btrim(cp.set_code) <> '' then cp.set_code
    when s.code is not null and btrim(s.code) <> '' then s.code
    else null
  end as effective_set_code,
  case
    when cp.number_plain is not null and btrim(cp.number_plain) <> '' then cp.number_plain
    when cp.number is not null
      and regexp_replace(cp.number, '[^0-9]+', '', 'g') <> ''
      then regexp_replace(cp.number, '[^0-9]+', '', 'g')
    when cp.number is not null
      and btrim(cp.number) <> ''
      and trim(
        both '-' from regexp_replace(
          regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      ) <> ''
      then lower(
        trim(
          both '-' from regexp_replace(
            regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
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
  ) as normalized_printed_name_token,
  case
    when coalesce(cp.variant_key, '') = '' then ''
    when cp.variant_key ~ '^[A-Za-z0-9_]+$' then lower(cp.variant_key)
    when s.code = 'ex10'
      and cp.name = 'Unown'
      and cp.number_plain is not null
      and btrim(cp.number_plain) <> ''
      and cp.variant_key = cp.number_plain
      then cp.variant_key
    else null
  end as normalized_variant_key,
  case
    when coalesce(cp.printed_identity_modifier, '') = '' then ''
    when cp.printed_identity_modifier ~ '^[a-z0-9_]+$' then cp.printed_identity_modifier
    else null
  end as normalized_printed_identity_modifier
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null
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

create temp view pik_blocked_gap_scope_summary_v1 as
select
  count(*) filter (where print_identity_key is null)::int as gap_surface_rows_with_null_print_identity_key,
  count(*) filter (where print_identity_key is not null)::int as resolved_gap_surface_rows,
  count(*)::int as total_gap_surface_rows,
  (
    select count(*)::int
    from public.card_prints cp
    where cp.gv_id is not null
      and cp.print_identity_key is null
  ) as all_canonical_rows_with_null_print_identity_key
from pik_blocked_gap_surface_v1;

create temp view pik_blocked_surface_v1 as
select
  g.*,
  case
    when g.effective_set_code is not null
      and g.effective_number_plain is not null
      and g.normalized_printed_name_token is not null
      and g.normalized_printed_name_token <> ''
      and g.normalized_variant_key is not null
      and g.normalized_printed_identity_modifier is not null
      then 'RESOLVED_31_SURFACE'
    else 'BLOCKED'
  end as derivation_lane
from pik_blocked_gap_surface_v1 g
where g.print_identity_key is null;

create temp view pik_blocked_surface_number_analysis_v1 as
select
  b.*,
  case
    when b.number is not null
      and btrim(b.number) <> ''
      and (b.number_plain is null or btrim(b.number_plain) = '')
      and regexp_replace(b.number, '[^0-9]+', '', 'g') <> ''
      then 'HAS_NUMBER_NO_NUMBER_PLAIN'
    when b.number is null or btrim(b.number) = ''
      then 'NO_NUMBER_FIELD'
    when b.number is not null
      and btrim(b.number) <> ''
      and regexp_replace(b.number, '[^0-9]+', '', 'g') = ''
      and lower(trim(b.number)) ~ '^[a-z0-9-]+$'
      then 'NON_NUMERIC_NUMBER_FIELD'
    else 'NUMBER_PRESENT_BUT_UNPARSEABLE'
  end as number_surface_class,
  case
    when (b.set_code is null or btrim(b.set_code) = '')
      and b.set_id is not null
      and b.joined_set_code is not null
      and btrim(b.joined_set_code) <> ''
      then 'SET_CODE_NULL_BUT_SET_ID_VALID'
    when b.set_code is not null
      and b.joined_set_code is not null
      and b.set_code <> b.joined_set_code
      then 'SET_CODE_MISMATCH_WITH_SET_ID'
    else 'SET_CODE_UNRESOLVABLE'
  end as set_code_class,
  case
    when b.name is not null
      and btrim(b.name) <> ''
      and b.normalized_printed_name_token <> ''
      then 'NAME_VALID'
    when b.name is not null and btrim(b.name) <> ''
      then 'NAME_REQUIRES_NORMALIZATION_RULE'
    else 'NAME_UNUSABLE'
  end as name_quality_class,
  case
    when b.normalized_variant_key is not null
      and b.normalized_printed_identity_modifier is not null
      and b.normalized_printed_identity_modifier <> ''
      then 'MODIFIER_REQUIRED'
    when b.normalized_variant_key is not null
      and b.normalized_printed_identity_modifier is not null
      then 'CLEAN_VARIANT'
    when b.normalized_variant_key is null
      then 'LEGACY_VARIANT_SHAPE'
    else 'MODIFIER_INVALID'
  end as variant_modifier_class
from pik_blocked_surface_v1 b
where b.derivation_lane = 'BLOCKED';

create temp view pik_blocked_family_assignment_v1 as
select
  n.*,
  case
    when n.number_surface_class = 'NO_NUMBER_FIELD'
      and n.set_code_class = 'SET_CODE_NULL_BUT_SET_ID_VALID'
      and n.name_quality_class = 'NAME_VALID'
      and n.variant_modifier_class = 'CLEAN_VARIANT'
      and n.joined_set_code in (
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
      )
      then 'FAMILY_1_NUMBERLESS_MODERN_MAINSET_BATCH'
    when n.number_surface_class = 'NO_NUMBER_FIELD'
      and n.set_code_class = 'SET_CODE_NULL_BUT_SET_ID_VALID'
      and n.name_quality_class = 'NAME_VALID'
      and n.variant_modifier_class = 'CLEAN_VARIANT'
      and n.joined_set_code in ('2021swsh', 'me01', 'svp')
      then 'FAMILY_2_NUMBERLESS_PROMO_BATCH'
    when n.number_surface_class = 'NO_NUMBER_FIELD'
      and n.set_code_class = 'SET_CODE_NULL_BUT_SET_ID_VALID'
      and n.name_quality_class = 'NAME_VALID'
      and n.variant_modifier_class = 'CLEAN_VARIANT'
      and n.joined_set_code in ('ecard3', 'col1')
      then 'FAMILY_3_NUMBERLESS_LEGACY_BATCH'
    else 'UNCLASSIFIED'
  end as family_name,
  case
    when n.joined_set_code in (
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
      )
      then 'numberless canonical rows in modern mainset/miniset lanes; printed number must be recovered from authoritative source before derivation'
    when n.joined_set_code in ('2021swsh', 'me01', 'svp')
      then 'numberless promo rows; promo numbering contract must be established before derivation'
    when n.joined_set_code in ('ecard3', 'col1')
      then 'numberless legacy rows; historical numbering contract must be established before derivation'
    else 'row does not fit a bounded family and requires fresh contract analysis'
  end as family_reason
from pik_blocked_surface_number_analysis_v1 n;

create temp view pik_blocked_family_counts_v1 as
select
  family_name,
  count(*)::int as row_count,
  round((count(*)::numeric * 100.0) / 1332.0, 2) as pct_of_total,
  case
    when family_name = 'FAMILY_1_NUMBERLESS_MODERN_MAINSET_BATCH' then 'medium'
    when family_name = 'FAMILY_2_NUMBERLESS_PROMO_BATCH' then 'medium'
    when family_name = 'FAMILY_3_NUMBERLESS_LEGACY_BATCH' then 'high'
    else 'high'
  end as complexity_level
from pik_blocked_family_assignment_v1
group by family_name
order by row_count desc, family_name;

create temp view pik_blocked_family_set_breakdown_v1 as
select
  family_name,
  joined_set_code as set_code,
  count(*)::int as row_count
from pik_blocked_family_assignment_v1
group by family_name, joined_set_code
order by family_name, row_count desc, joined_set_code;

create temp view pik_blocked_examples_v1 as
with ranked as (
  select
    family_name,
    card_print_id,
    joined_set_code as set_code,
    name,
    number,
    number_plain,
    variant_key,
    printed_identity_modifier,
    family_reason,
    row_number() over (
      partition by family_name
      order by joined_set_code, name, card_print_id
    ) as rn
  from pik_blocked_family_assignment_v1
  where family_name <> 'UNCLASSIFIED'
)
select
  family_name,
  card_print_id,
  set_code,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  family_reason
from ranked
where rn <= 3
order by family_name, rn;

create temp view pik_blocked_roadmap_v1 as
select
  1 as roadmap_order,
  'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1'::text as execution_unit,
  'Audit authoritative number recovery for the 1125-row modern mainset family before any bounded backfill.'::text as execution_reason

union all

select
  2,
  'PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_CONTRACT_AUDIT_V1',
  'Audit promo numbering rules for the 181-row promo family once the dominant modern family contract is locked.'

union all

select
  3,
  'PRINT_IDENTITY_KEY_NUMBERLESS_LEGACY_CONTRACT_AUDIT_V1',
  'Audit legacy historical numbering recovery for the 26-row legacy family after the higher-volume families are bounded.';

create temp view pik_blocked_final_decision_v1 as
select
  (select count(*)::int from pik_blocked_family_assignment_v1) as blocker_row_count,
  (
    select family_name
    from pik_blocked_family_counts_v1
    order by row_count desc, family_name
    limit 1
  ) as dominant_family,
  'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1'::text as next_execution_unit,
  case
    when (select count(*)::int from pik_blocked_family_assignment_v1) = 1332
      and coalesce((
        select row_count
        from pik_blocked_family_counts_v1
        where family_name = 'UNCLASSIFIED'
      ), 0) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

-- Scope freeze.
select
  total_gap_surface_rows,
  resolved_gap_surface_rows,
  gap_surface_rows_with_null_print_identity_key as blocked_surface_plus_residual_null_gap_rows,
  all_canonical_rows_with_null_print_identity_key
from pik_blocked_gap_scope_summary_v1;

select
  count(*)::int as blocker_row_count
from pik_blocked_family_assignment_v1;

-- Phase 1: blocker extraction.
select
  card_print_id,
  name,
  joined_set_code as set_code,
  set_id,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier
from pik_blocked_family_assignment_v1
order by joined_set_code, name, card_print_id;

-- Phase 2: number surface analysis.
select
  number_surface_class,
  count(*)::int as row_count
from pik_blocked_family_assignment_v1
group by number_surface_class
order by row_count desc, number_surface_class;

-- Phase 3: set code mirror analysis.
select
  set_code_class,
  count(*)::int as row_count
from pik_blocked_family_assignment_v1
group by set_code_class
order by row_count desc, set_code_class;

-- Phase 4: name tokenization quality.
select
  name_quality_class,
  count(*)::int as row_count
from pik_blocked_family_assignment_v1
group by name_quality_class
order by row_count desc, name_quality_class;

-- Phase 5: variant/modifier shape.
select
  variant_modifier_class,
  count(*)::int as row_count
from pik_blocked_family_assignment_v1
group by variant_modifier_class
order by row_count desc, variant_modifier_class;

-- Phase 6-7: family grouping and priority.
select
  family_name,
  row_count,
  pct_of_total,
  complexity_level
from pik_blocked_family_counts_v1;

select
  family_name,
  set_code,
  row_count
from pik_blocked_family_set_breakdown_v1;

select
  family_name,
  card_print_id,
  set_code,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  family_reason
from pik_blocked_examples_v1;

-- Phase 8: execution roadmap.
select
  roadmap_order,
  execution_unit,
  execution_reason
from pik_blocked_roadmap_v1
order by roadmap_order;

-- Final decision.
select
  blocker_row_count,
  dominant_family,
  next_execution_unit,
  audit_status
from pik_blocked_final_decision_v1;

rollback;
