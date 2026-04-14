-- G1_BLOCKED_CONFLICT_AUDIT_V1
-- Read-only decomposition audit of the unresolved g1 surface.
--
-- Goal:
--   classify every unresolved g1 row into a deterministic execution lane using
--   the current live model and stable normalization rules.
--
-- Important live correction:
--   the earlier blocked-conflict-heavy label overstated the blocker surface.
--   live row-level audit shows g1 splits into:
--   - deterministic BASE_VARIANT_COLLAPSE rows
--   - deterministic PROMOTION_REQUIRED rows on the RC-prefixed identity lane
--   - no residual token-collision blockers after lawful-candidate evaluation
--
-- Schema notes:
--   - set membership is anchored by public.sets.code = 'g1'
--   - unresolved source rows are active public.card_print_identity rows with
--     set_code_identity = 'g1' whose parent public.card_prints row has gv_id is null
--   - canonical targets are public.card_prints rows in the same set with gv_id is not null

begin;

drop table if exists tmp_g1_unresolved_v1;
drop table if exists tmp_g1_canonical_in_set_v1;
drop table if exists tmp_g1_candidate_rows_v1;
drop table if exists tmp_g1_metrics_v1;
drop table if exists tmp_g1_classification_v1;
drop table if exists tmp_g1_grouped_root_causes_v1;

create temp table tmp_g1_unresolved_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cpi.printed_number as old_printed_token,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_suffix,
  cp.set_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'g1'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_g1_canonical_in_set_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.gv_id as candidate_target_gv_id,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
  coalesce(cp.variant_key, '') as candidate_target_variant_key,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(cp.name), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'g1'
  and cp.gv_id is not null;

create temp table tmp_g1_candidate_rows_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_gv_id,
  c.candidate_target_number_plain,
  c.candidate_target_variant_key,
  case
    when c.candidate_target_number = u.old_printed_token
      and c.normalized_name = u.normalized_name
      then 'exact'
    when c.candidate_target_number_plain = u.normalized_token
      and c.normalized_name = u.normalized_name
      and c.candidate_target_number <> u.old_printed_token
      then 'normalized'
    when c.candidate_target_number = u.old_printed_token
      then 'same_token_different_name'
    when c.candidate_target_number_plain = u.normalized_token
      then 'partial'
    else 'other'
  end as match_type
from tmp_g1_unresolved_v1 u
join tmp_g1_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
  or c.candidate_target_number_plain = u.normalized_token;

create temp table tmp_g1_metrics_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  u.source_suffix,
  count(distinct c.candidate_target_id) filter (
    where c.match_type in ('exact', 'normalized')
  )::int as lawful_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'exact'
  )::int as exact_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'normalized'
  )::int as normalized_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'same_token_different_name'
  )::int as same_token_different_name_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'partial'
  )::int as partial_same_base_count
from tmp_g1_unresolved_v1 u
left join tmp_g1_candidate_rows_v1 c
  on c.old_parent_id = u.old_parent_id
group by
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  u.source_suffix;

create temp table tmp_g1_classification_v1 on commit drop as
select
  m.old_parent_id,
  m.old_name,
  m.old_printed_token,
  m.normalized_name,
  m.normalized_token,
  case
    when m.lawful_candidate_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.lawful_candidate_count > 1 then 'MULTI_CANONICAL_TARGET_CONFLICT'
    when m.lawful_candidate_count = 0
      and m.old_printed_token ~ '^RC[0-9]+$'
      then 'PROMOTION_REQUIRED'
    when m.lawful_candidate_count = 0
      and m.same_token_different_name_count > 0
      then 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
    when m.lawful_candidate_count = 0
      and m.source_suffix is null
      and exists (
        select 1
        from tmp_g1_candidate_rows_v1 c
        where c.old_parent_id = m.old_parent_id
          and c.match_type = 'normalized'
          and c.candidate_target_number_plain = m.normalized_token
      )
      then 'SUFFIX_OWNERSHIP_CONFLICT'
    when m.lawful_candidate_count = 0 then 'IDENTITY_MODEL_GAP'
    else 'UNCLASSIFIED'
  end as classification,
  case
    when m.lawful_candidate_count = 1
      and m.exact_candidate_count = 1
      then 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE'
    when m.lawful_candidate_count = 1
      and m.normalized_candidate_count = 1
      and m.source_suffix is not null
      then 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE'
    when m.old_printed_token ~ '^RC[0-9]+$'
      then 'RC_PREFIX_EXACT_TOKEN_PROMOTION_SURFACE'
    else 'OTHER'
  end as grouped_root_cause,
  case
    when m.lawful_candidate_count = 1
      and m.exact_candidate_count = 1
      then 'exact printed token already maps to one lawful same-name canonical target after NAME_NORMALIZE_V3 punctuation normalization'
    when m.lawful_candidate_count = 1
      and m.normalized_candidate_count = 1
      and m.source_suffix is not null
      then 'suffixed source token reduces to one lawful same-name canonical target on the base-number surface'
    when m.old_printed_token ~ '^RC[0-9]+$'
      then 'no lawful same-name canonical target exists, but RC-prefixed exact token is identity-bearing and already supported by existing canonical RC rows in g1'
    when m.same_token_different_name_count > 0
      then 'same exact printed token is already occupied by a different canonical identity'
    else 'residual unresolved surface requires narrower follow-up audit'
  end as proof_reason
from tmp_g1_metrics_v1 m;

create temp table tmp_g1_grouped_root_causes_v1 on commit drop as
select
  grouped_root_cause,
  count(*)::int as row_count
from tmp_g1_classification_v1
group by grouped_root_cause;

-- PHASE 1 — target surface audit
select
  (select count(*)::int from tmp_g1_unresolved_v1) as unresolved_parent_count,
  (select count(*)::int from tmp_g1_canonical_in_set_v1) as canonical_parent_count;

-- PHASE 2 — normalized candidate analysis
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  normalized_token,
  candidate_target_id,
  candidate_target_name,
  candidate_target_gv_id,
  candidate_target_number_plain,
  candidate_target_variant_key,
  match_type
from tmp_g1_candidate_rows_v1
order by old_printed_token, match_type, candidate_target_name, candidate_target_id;

-- PHASE 3 — final row-level classification
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  normalized_token,
  classification,
  grouped_root_cause,
  proof_reason
from tmp_g1_classification_v1
order by old_printed_token, old_parent_id;

-- PHASE 4 — grouped root-cause summary
select
  count(*) filter (where classification = 'MULTI_CANONICAL_TARGET_CONFLICT')::int as multi_canonical_target_conflict_count,
  count(*) filter (where classification = 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES')::int as token_collision_with_distinct_identities_count,
  count(*) filter (where classification = 'SUFFIX_OWNERSHIP_CONFLICT')::int as suffix_ownership_conflict_count,
  count(*) filter (where classification = 'PROMOTION_REQUIRED')::int as promotion_required_count,
  count(*) filter (where classification = 'IDENTITY_MODEL_GAP')::int as identity_model_gap_count,
  count(*) filter (where classification = 'BASE_VARIANT_COLLAPSE')::int as base_variant_collapse_count,
  count(*) filter (where classification = 'UNCLASSIFIED')::int as unclassified_count
from tmp_g1_classification_v1;

select
  grouped_root_cause,
  row_count
from tmp_g1_grouped_root_causes_v1
order by row_count desc, grouped_root_cause;

-- PHASE 5 / 6 — dominant pattern extraction and next execution split
select
  grouped_root_cause as dominant_root_cause_category,
  row_count as dominant_root_cause_count,
  case
    when grouped_root_cause = 'RC_PREFIX_EXACT_TOKEN_PROMOTION_SURFACE' then 'no'
    else 'no'
  end as single_contract_possible,
  case
    when grouped_root_cause = 'RC_PREFIX_EXACT_TOKEN_PROMOTION_SURFACE' then 'G1_BASE_VARIANT_COLLAPSE_V1'
    else 'G1_BLOCKED_CONFLICT_AUDIT_V2'
  end as next_lawful_execution_unit
from tmp_g1_grouped_root_causes_v1
order by row_count desc, grouped_root_cause
limit 1;

-- Validation — unclassified rows must remain zero
select
  count(*)::int as unclassified_count
from tmp_g1_classification_v1
where classification = 'UNCLASSIFIED';

rollback;
