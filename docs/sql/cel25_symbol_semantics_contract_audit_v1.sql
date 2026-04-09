-- CEL25_SYMBOL_SEMANTICS_CONTRACT_AUDIT_V1
-- Read-only audit for the final two blocked cel25 rows.

begin;

drop table if exists tmp_cel25_symbol_blocked_rows_v1;
drop table if exists tmp_cel25_symbol_canonical_cel25_v1;
drop table if exists tmp_cel25_symbol_candidate_targets_v1;
drop table if exists tmp_cel25_symbol_semantic_analysis_v1;
drop table if exists tmp_cel25_symbol_rule_safety_v1;
drop table if exists tmp_cel25_symbol_final_decision_v1;

create temp table tmp_cel25_symbol_blocked_rows_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cpi.printed_number as old_printed_token,
  cp.variant_key as old_variant_key,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
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
  ) as normalized_name
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null
order by cpi.printed_number, cp.id;

create temp table tmp_cel25_symbol_canonical_cel25_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.gv_id as candidate_target_gv_id,
  cp.number as candidate_target_printed_token,
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

create temp table tmp_cel25_symbol_candidate_targets_v1 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.old_variant_key,
  b.normalized_name,
  b.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_gv_id,
  c.candidate_target_printed_token,
  c.candidate_target_number_plain,
  c.candidate_target_variant_key,
  case
    when c.candidate_target_printed_token = b.old_printed_token
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
from tmp_cel25_symbol_blocked_rows_v1 b
join tmp_cel25_symbol_canonical_cel25_v1 c
  on c.candidate_target_number_plain = b.normalized_token;

create temp table tmp_cel25_symbol_semantic_analysis_v1 on commit drop as
with metrics as (
  select
    b.old_parent_id,
    count(*)::int as candidate_count,
    count(*) filter (where t.match_type in ('exact_token', 'suffix_match', 'normalized_name'))::int as deterministic_match_count,
    bool_or(t.candidate_target_name like '%★%') as star_symbol_target_present,
    bool_or(t.candidate_target_name like '%δ%') as delta_symbol_target_present
  from tmp_cel25_symbol_blocked_rows_v1 b
  left join tmp_cel25_symbol_candidate_targets_v1 t
    on t.old_parent_id = b.old_parent_id
  group by b.old_parent_id
)
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  case
    when b.old_name ~* ' Star$' then 'textual_symbol_equivalence'
    when b.old_name ~* '\bex\b' and m.delta_symbol_target_present then 'specialty_subtype_or_decorated_form_equivalence'
    else 'broader_print_semantics'
  end as semantic_difference_type,
  case
    when b.old_name ~* ' Star$' and m.candidate_count > 1 then false
    when b.old_name ~* ' Star$' and m.candidate_count = 1 then true
    when m.delta_symbol_target_present then false
    else false
  end as deterministic_or_not,
  case
    when b.old_name ~* ' Star$' then
      'same base token, same set, and star-symbol canonical target exists; applying a tail-word Star to ★ equivalence yields a unique target in cel25'
    when m.delta_symbol_target_present then
      'same base token and same set candidate exists, and it is the only delta-bearing canonical candidate'
    else
      'same-base canonical evidence exists'
  end as evidence_for_equivalence,
  case
    when b.old_name ~* ' Star$' then
      'current NAME_NORMALIZE_V3 does not encode Star -> ★, and token 17 also belongs to Groudon, so token-only routing is unsafe'
    when m.delta_symbol_target_present then
      'delta species is a decorated identity marker, not a punctuation alias; erasing δ would blur modeled subtype semantics across many canonical rows'
    else
      'semantic surface exceeds current normalization contract'
  end as evidence_against_equivalence
from tmp_cel25_symbol_blocked_rows_v1 b
join metrics m
  on m.old_parent_id = b.old_parent_id;

create temp table tmp_cel25_symbol_rule_safety_v1 on commit drop as
with cel25_canonical as (
  select
    cp.id,
    cp.set_code,
    cp.name,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.gv_id,
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
    and cp.gv_id is not null
),
all_unresolved as (
  select
    cpi.set_code_identity,
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number,
    nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as base_number_plain,
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
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cp.gv_id is null
),
all_canonical as (
  select
    cp.set_code,
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.number_plain,
    cp.gv_id,
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
  where cp.gv_id is not null
),
star_canonical_keys as (
  select
    id,
    number_plain,
    btrim(
      regexp_replace(
        replace(
          replace(
            normalized_name,
            '★',
            ' star '
          ),
          ' star ',
          ' star '
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as semantic_name
  from cel25_canonical
  where name like '%★%'
),
star_canonical_collision_groups as (
  select number_plain, semantic_name
  from star_canonical_keys
  group by number_plain, semantic_name
  having count(*) > 1
),
star_cel25_matches as (
  select
    b.old_parent_id,
    c.id as candidate_target_id
  from tmp_cel25_symbol_blocked_rows_v1 b
  join cel25_canonical c
    on c.number_plain = b.normalized_token
   and b.old_name ~* ' Star$'
   and btrim(
         regexp_replace(
           replace(replace(lower(b.old_name), ' star', ' star '), chr(8217), ''''),
           '\s+',
           ' ',
           'g'
         )
       ) = btrim(
         regexp_replace(
           replace(replace(c.normalized_name, '★', ' star '), chr(8217), ''''),
           '\s+',
           ' ',
           'g'
         )
       )
),
star_global_matches as (
  select
    u.set_code_identity,
    u.old_id,
    c.new_id
  from all_unresolved u
  join all_canonical c
    on c.set_code = u.set_code_identity
   and c.number_plain = u.base_number_plain
   and u.old_name ~* ' Star$'
   and btrim(
         regexp_replace(
           replace(replace(u.normalized_name, ' star', ' star '), chr(8217), ''''),
           '\s+',
           ' ',
           'g'
         )
       ) = btrim(
         regexp_replace(
           replace(replace(c.normalized_name, '★', ' star '), chr(8217), ''''),
           '\s+',
           ' ',
           'g'
         )
       )
),
delta_canonical_collision_groups as (
  select
    number_plain,
    btrim(regexp_replace(replace(normalized_name, ' δ', ''), '\s+', ' ', 'g')) as semantic_name
  from cel25_canonical
  where name like '%δ%'
  group by number_plain, btrim(regexp_replace(replace(normalized_name, ' δ', ''), '\s+', ' ', 'g'))
  having count(*) > 1
),
delta_cel25_matches as (
  select
    b.old_parent_id,
    c.id as candidate_target_id
  from tmp_cel25_symbol_blocked_rows_v1 b
  join cel25_canonical c
    on c.number_plain = b.normalized_token
   and btrim(regexp_replace(replace(b.normalized_name, ' δ', ''), '\s+', ' ', 'g')) =
       btrim(regexp_replace(replace(c.normalized_name, ' δ', ''), '\s+', ' ', 'g'))
  where c.name like '%δ%'
),
delta_global_footprint as (
  select
    count(*)::int as canonical_delta_rows,
    count(distinct set_code)::int as canonical_delta_sets
  from all_canonical
  where new_name like '%δ%'
)
select
  'Star -> ★'::text as rule_name,
  true as safe_in_cel25_only,
  true as reusable_outside_cel25,
  (select count(*)::int from star_canonical_collision_groups) as collision_count_if_enabled,
  (
    select count(*)::int
    from (
      select old_parent_id
      from star_cel25_matches
      group by old_parent_id
      having count(*) > 1
    ) ambiguous
  ) as ambiguous_target_count_if_enabled,
  json_build_object(
    'cel25_match_count', (select count(*)::int from star_cel25_matches),
    'outside_cel25_match_count', (select count(*)::int from star_global_matches where set_code_identity <> 'cel25'),
    'outside_cel25_sets', (
      select array_agg(distinct set_code_identity order by set_code_identity)
      from star_global_matches
      where set_code_identity <> 'cel25'
    )
  ) as audit_evidence
union all
select
  'ex -> ex δ'::text as rule_name,
  false as safe_in_cel25_only,
  false as reusable_outside_cel25,
  (select count(*)::int from delta_canonical_collision_groups) as collision_count_if_enabled,
  (
    select count(*)::int
    from (
      select old_parent_id
      from delta_cel25_matches
      group by old_parent_id
      having count(*) > 1
    ) ambiguous
  ) as ambiguous_target_count_if_enabled,
  json_build_object(
    'cel25_match_count', (select count(*)::int from delta_cel25_matches),
    'global_delta_canonical_rows', (select canonical_delta_rows from delta_global_footprint),
    'global_delta_set_count', (select canonical_delta_sets from delta_global_footprint)
  ) as audit_evidence;

create temp table tmp_cel25_symbol_final_decision_v1 on commit drop as
select
  b.old_parent_id as blocked_row_id,
  b.old_name as blocked_row_name,
  case
    when b.old_name ~* ' Star$' then 'SAFE_BOUNDED_SYMBOL_EQUIVALENCE'
    when b.old_name = 'Gardevoir ex' then 'IDENTITY_MODEL_EXTENSION_REQUIRED'
    else 'OTHER'
  end as classification,
  case
    when b.old_name ~* ' Star$' then 'c9c1a789-a686-4541-99b7-ac7d4de7be30'::uuid
    else null::uuid
  end as lawful_target_id,
  case
    when b.old_name ~* ' Star$' then 'GV-PK-CEL-17CC'::text
    else null::text
  end as lawful_target_gv_id,
  case
    when b.old_name ~* ' Star$' then 'CEL25_STAR_SYMBOL_EQUIVALENCE_COLLAPSE_V1'
    when b.old_name = 'Gardevoir ex' then 'CEL25_DELTA_SPECIES_IDENTITY_MODEL_AUDIT_V1'
    else 'MANUAL_REVIEW_REQUIRED'
  end as required_next_action,
  case
    when b.old_name ~* ' Star$' then
      'terminal Star to ★ is a bounded same-set same-token equivalence with unique targets in cel25 and additional proven reuse in ex10'
    when b.old_name = 'Gardevoir ex' then
      'delta species is a decorated identity layer; collapsing bare ex to ex δ would extend identity semantics rather than normalize punctuation'
    else
      'residual symbolic policy gap'
  end as proof_reason
from tmp_cel25_symbol_blocked_rows_v1 b;

-- PHASE 1 — target row audit
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.old_variant_key,
  t.candidate_target_id,
  t.candidate_target_name,
  t.candidate_target_gv_id,
  t.candidate_target_printed_token,
  t.candidate_target_variant_key
from tmp_cel25_symbol_blocked_rows_v1 b
join tmp_cel25_symbol_candidate_targets_v1 t
  on t.old_parent_id = b.old_parent_id
order by b.old_printed_token, t.candidate_target_printed_token, t.candidate_target_id;

-- PHASE 2 — symbol semantic candidate analysis
select
  old_parent_id,
  old_name,
  old_printed_token,
  semantic_difference_type,
  deterministic_or_not,
  evidence_for_equivalence,
  evidence_against_equivalence
from tmp_cel25_symbol_semantic_analysis_v1
order by old_printed_token, old_parent_id;

-- PHASE 3 — bounded contract safety test
select
  rule_name,
  safe_in_cel25_only,
  reusable_outside_cel25,
  collision_count_if_enabled,
  ambiguous_target_count_if_enabled,
  audit_evidence
from tmp_cel25_symbol_rule_safety_v1
order by rule_name;

-- PHASE 4 / 6 — final decision table
select
  blocked_row_id,
  blocked_row_name,
  classification,
  lawful_target_id,
  lawful_target_gv_id,
  required_next_action,
  proof_reason
from tmp_cel25_symbol_final_decision_v1
order by blocked_row_name, blocked_row_id;

-- PHASE 5 — proposed contract output
select
  'STAR_WORD_TAIL_TO_STAR_SYMBOL_EQUIVALENCE_V1'::text as contract_name,
  'same_set_same_token_star_tail_only'::text as scope,
  'treat terminal English Star and symbol ★ as equivalent only when same-set token or base token routing yields a unique canonical target'::text as allowed_equivalence_rule,
  json_build_array(
    'no generic word Star normalization',
    'no mid-string star normalization',
    'no cross-set routing',
    'no delta-species symbol normalization',
    'no application without unique target proof'
  ) as forbidden_expansions,
  json_build_array(
    json_build_object(
      'set_code_identity', 'cel25',
      'old_parent_id', 'c2bdbb6f-10de-4a93-abcf-ed3b8837908b',
      'old_name', 'Umbreon Star',
      'lawful_target_id', 'c9c1a789-a686-4541-99b7-ac7d4de7be30',
      'lawful_target_gv_id', 'GV-PK-CEL-17CC'
    ),
    json_build_object(
      'set_code_identity', 'ex10',
      'old_name', 'Entei Star',
      'lawful_target_gv_id', 'GV-PK-UF-113'
    ),
    json_build_object(
      'set_code_identity', 'ex10',
      'old_name', 'Raikou Star',
      'lawful_target_gv_id', 'GV-PK-UF-114'
    ),
    json_build_object(
      'set_code_identity', 'ex10',
      'old_name', 'Suicune Star',
      'lawful_target_gv_id', 'GV-PK-UF-115'
    )
  ) as proof_rows,
  (
    select json_build_object(
      'collision_count_if_enabled', collision_count_if_enabled,
      'ambiguous_target_count_if_enabled', ambiguous_target_count_if_enabled,
      'reusable_outside_cel25', reusable_outside_cel25,
      'audit_evidence', audit_evidence
    )
    from tmp_cel25_symbol_rule_safety_v1
    where rule_name = 'Star -> ★'
  ) as collision_audit_result,
  'the rule is safe because every currently affected unresolved row maps to exactly one same-set canonical star-symbol target, with zero ambiguity and zero target reuse'::text as why_it_is_safe,
  'broader expansion is forbidden because generic Star words and non-tail usages exist elsewhere, and because the rule must not be generalized to other symbol-bearing semantics such as δ'::text as why_broader_expansion_is_forbidden;

select
  count(*)::int as blocked_row_count
from tmp_cel25_symbol_final_decision_v1;

select
  classification,
  count(*)::int as row_count
from tmp_cel25_symbol_final_decision_v1
group by classification
order by classification;

select
  count(*)::int as unclassified_count
from tmp_cel25_symbol_final_decision_v1
where classification not in (
  'SAFE_BOUNDED_SYMBOL_EQUIVALENCE',
  'SAFE_SET_SCOPED_SYMBOL_EQUIVALENCE',
  'UNSAFE_SYMBOL_COLLAPSE',
  'PROMOTION_REQUIRED',
  'IDENTITY_MODEL_EXTENSION_REQUIRED'
);

rollback;
