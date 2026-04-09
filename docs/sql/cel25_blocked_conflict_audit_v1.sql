-- CEL25_BLOCKED_CONFLICT_AUDIT_V1
-- Read-only root-cause audit for the final two blocked cel25 rows.

begin;

drop table if exists tmp_cel25_blocked_rows_v1;
drop table if exists tmp_cel25_blocked_canonical_v1;
drop table if exists tmp_cel25_blocked_candidate_targets_v1;
drop table if exists tmp_cel25_blocked_metrics_v1;
drop table if exists tmp_cel25_blocked_classification_v1;

create temp table tmp_cel25_blocked_rows_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cp.number_plain,
  cp.variant_key,
  cpi.printed_number as old_printed_token,
  lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as exact_name_key,
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
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_cel25_blocked_canonical_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.gv_id as candidate_target_gv_id,
  cp.name as candidate_target_name,
  cp.set_code as candidate_target_set_code,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
  cp.variant_key as candidate_target_variant_key,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as exact_name_key,
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
where cp.set_code = 'cel25'
  and cp.gv_id is not null;

create temp table tmp_cel25_blocked_candidate_targets_v1 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.variant_key as old_variant_key,
  b.normalized_name,
  b.normalized_token,
  c.candidate_target_id,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_number_plain,
  c.candidate_target_variant_key,
  case
    when c.candidate_target_number = b.old_printed_token
      and c.exact_name_key = b.exact_name_key
      then 'exact_token'
    when c.candidate_target_number_plain = b.normalized_token
      and c.normalized_name = b.normalized_name
      then 'suffix_match'
    when c.normalized_name = b.normalized_name
      then 'normalized_name'
    when c.candidate_target_number_plain = b.normalized_token
      then 'partial'
    else 'other'
  end as match_type
from tmp_cel25_blocked_rows_v1 b
join tmp_cel25_blocked_canonical_v1 c
  on c.candidate_target_number_plain = b.normalized_token;

create temp table tmp_cel25_blocked_metrics_v1 on commit drop as
select
  b.old_parent_id,
  count(*)::int as candidate_count,
  count(*) filter (where ct.match_type = 'exact_token')::int as exact_token_count,
  count(*) filter (where ct.match_type = 'normalized_name')::int as normalized_name_count,
  count(*) filter (where ct.match_type = 'suffix_match')::int as suffix_match_count,
  count(*) filter (where ct.match_type = 'partial')::int as partial_count,
  bool_or(ct.candidate_target_name like '%★%') as star_symbol_candidate_present,
  bool_or(ct.candidate_target_name like '%δ%') as delta_symbol_candidate_present
from tmp_cel25_blocked_rows_v1 b
left join tmp_cel25_blocked_candidate_targets_v1 ct
  on ct.old_parent_id = b.old_parent_id
group by b.old_parent_id;

create temp table tmp_cel25_blocked_classification_v1 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.variant_key,
  b.normalized_name,
  b.normalized_token,
  case
    when m.candidate_count > 1 then 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
    when m.candidate_count = 1
      and m.exact_token_count = 0
      and m.normalized_name_count = 0
      and m.suffix_match_count = 0
      and (m.star_symbol_candidate_present or m.delta_symbol_candidate_present)
      then 'IDENTITY_MODEL_GAP'
    when m.candidate_count = 0 then 'PROMOTION_REQUIRED'
    else 'OTHER'
  end as classification,
  case
    when m.candidate_count > 1 then
      'base token routes to multiple canonical cel25 parents with different identities; current NAME_NORMALIZE_V3 cannot prove classic-collection ownership for the star-marked source'
    when m.candidate_count = 1
      and m.exact_token_count = 0
      and m.normalized_name_count = 0
      and m.suffix_match_count = 0
      and m.delta_symbol_candidate_present then
      'only one same-base canonical target exists, but the remaining distinction is carried by unsupported delta-species symbol semantics outside NAME_NORMALIZE_V3'
    when m.candidate_count = 1
      and m.exact_token_count = 0
      and m.normalized_name_count = 0
      and m.suffix_match_count = 0
      and m.star_symbol_candidate_present then
      'only one same-base canonical target exists, but the remaining distinction is carried by unsupported star-symbol semantics outside NAME_NORMALIZE_V3'
    when m.candidate_count = 0 then
      'no lawful in-set canonical target exists for this blocked row'
    else
      'residual blocked row requires a symbol-aware contract before execution'
  end as full_reasoning
from tmp_cel25_blocked_rows_v1 b
join tmp_cel25_blocked_metrics_v1 m
  on m.old_parent_id = b.old_parent_id;

-- PHASE 1 — target row extraction
select
  old_parent_id,
  old_name as name,
  number_plain,
  variant_key,
  normalized_name,
  normalized_token
from tmp_cel25_blocked_rows_v1
order by old_printed_token, old_parent_id;

-- PHASE 2 — candidate target analysis
select
  old_parent_id,
  candidate_target_id,
  candidate_target_gv_id as gv_id,
  candidate_target_name as name,
  candidate_target_number_plain as number_plain,
  candidate_target_variant_key as variant_key,
  match_type
from tmp_cel25_blocked_candidate_targets_v1
order by old_printed_token, candidate_target_number, candidate_target_id;

-- PHASE 3 / 4 — per-row proof output
select
  c.old_parent_id as row_id,
  c.classification,
  c.full_reasoning,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'candidate_target_id', t.candidate_target_id,
          'gv_id', t.candidate_target_gv_id,
          'name', t.candidate_target_name,
          'number_plain', t.candidate_target_number_plain,
          'variant_key', t.candidate_target_variant_key,
          'match_type', t.match_type
        )
        order by t.candidate_target_number, t.candidate_target_id
      )
      from tmp_cel25_blocked_candidate_targets_v1 t
      where t.old_parent_id = c.old_parent_id
    ),
    '[]'::json
  ) as candidate_targets,
  case
    when c.classification = 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
      then 'collapse is blocked because token 17 resolves to multiple distinct canonical cel25 identities, and the star-word source cannot be proven equal to the star-symbol canonical under current normalization'
    when c.classification = 'IDENTITY_MODEL_GAP'
      then 'collapse is blocked because the only same-base candidate is symbol-bearing (delta species), but the source omits that modifier and current normalization has no deterministic rule for the equivalence'
    when c.classification = 'PROMOTION_REQUIRED'
      then 'collapse is blocked because no canonical cel25 target exists'
    else 'collapse is blocked pending manual symbolic identity policy'
  end as why_collapse_is_blocked
from tmp_cel25_blocked_classification_v1 c
order by c.old_printed_token, c.old_parent_id;

-- PHASE 5 — final classification table
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  null::uuid as candidate_target_id,
  null::text as candidate_target_gv_id,
  'cel25'::text as candidate_target_set_code,
  classification as execution_class,
  full_reasoning as proof_reason
from tmp_cel25_blocked_classification_v1
order by old_printed_token, old_parent_id;

select
  count(*)::int as total_blocked_rows
from tmp_cel25_blocked_classification_v1;

select
  classification,
  count(*)::int as row_count
from tmp_cel25_blocked_classification_v1
group by classification
order by classification;

select
  count(*)::int as unclassified_count
from tmp_cel25_blocked_classification_v1
where classification not in (
  'MULTI_CANONICAL_TARGET_CONFLICT',
  'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES',
  'SUFFIX_OWNERSHIP_CONFLICT',
  'PROMOTION_REQUIRED',
  'IDENTITY_MODEL_GAP',
  'OTHER'
);

rollback;
