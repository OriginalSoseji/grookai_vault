-- CEL25_IDENTITY_MODEL_GAP_AUDIT_V1
-- Read-only audit for the final unresolved cel25 row after duplicate/base-variant/star resolution.

begin;

drop table if exists tmp_cel25_identity_gap_target_v1;
drop table if exists tmp_cel25_identity_gap_candidates_v1;
drop table if exists tmp_cel25_identity_gap_semantics_v1;
drop table if exists tmp_cel25_identity_gap_model_limits_v1;
drop table if exists tmp_cel25_identity_gap_extension_v1;
drop table if exists tmp_cel25_identity_gap_final_v1;

create temp table tmp_cel25_identity_gap_target_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cpi.printed_number as printed_token,
  cp.variant_key,
  lower(
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(coalesce(cp.name, cpi.normalized_printed_name), chr(8217), ''''),
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
    )
  ) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null
order by cpi.printed_number, cp.id;

create temp table tmp_cel25_identity_gap_candidates_v1 on commit drop as
select
  t.old_parent_id,
  t.old_name,
  t.printed_token as old_printed_token,
  t.variant_key as old_variant_key,
  t.normalized_name,
  t.normalized_token,
  cp.id as candidate_id,
  cp.gv_id,
  cp.name as candidate_name,
  cp.number as candidate_printed_token,
  cp.variant_key as candidate_variant_key,
  case
    when cp.number = t.printed_token and lower(cp.name) = t.normalized_name
      then 'exact'
    when cp.number_plain = t.normalized_token
      and lower(
        btrim(
          regexp_replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(cp.name, chr(8217), ''''),
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
        )
      ) = t.normalized_name
      then 'normalized'
    when cp.number_plain = t.normalized_token and cp.number <> t.printed_token
      then 'suffix'
    when cp.number_plain = t.normalized_token
      then 'partial'
    else 'other'
  end as match_type
from tmp_cel25_identity_gap_target_v1 t
join public.card_prints cp
  on cp.set_code = 'cel25'
 and cp.gv_id is not null
 and cp.number_plain = t.normalized_token;

create temp table tmp_cel25_identity_gap_semantics_v1 on commit drop as
select
  t.old_parent_id,
  t.old_name,
  t.printed_token as old_printed_token,
  c.candidate_id,
  c.candidate_name,
  c.gv_id as candidate_gv_id,
  'decorated_form_delta_species_modifier'::text as semantic_difference_type,
  'identity_bearing_modifier'::text as delta_role,
  false as delta_is_punctuation,
  false as delta_is_pure_decoration,
  true as delta_is_subtype_or_species_modifier,
  true as delta_is_identity_bearing_modifier,
  'source omits the delta-species marker entirely; candidate target carries δ in the printed name'::text as semantic_summary
from tmp_cel25_identity_gap_target_v1 t
join tmp_cel25_identity_gap_candidates_v1 c
  on c.old_parent_id = t.old_parent_id;

create temp table tmp_cel25_identity_gap_model_limits_v1 on commit drop as
with delta_rows as (
  select id, set_code, name, number, variant_key, gv_id
  from public.card_prints
  where gv_id is not null
    and name like '%δ%'
),
delta_trait_hits as (
  select distinct cpt.card_print_id
  from public.card_print_traits cpt
  where cpt.trait_type ilike '%delta%'
     or cpt.trait_value ilike '%delta%'
     or cpt.trait_value like '%δ%'
     or cpt.supertype ilike '%delta%'
     or cpt.card_category ilike '%delta%'
),
distinct_name_surfaces as (
  select
    name,
    count(*)::int as canonical_row_count,
    array_agg(distinct set_code order by set_code) as set_codes
  from public.card_prints
  where gv_id is not null
    and name in ('Gardevoir ex', 'Gardevoir ex δ')
  group by name
)
select
  'MULTI_DIMENSIONAL_IDENTITY_REQUIRED'::text as model_limitation,
  1::int as logical_target_count,
  (select count(*)::int from delta_rows) as canonical_delta_rows,
  (select count(distinct set_code)::int from delta_rows) as canonical_delta_sets,
  (select count(*)::int from delta_rows where coalesce(variant_key, '') = '') as delta_variant_key_blank_rows,
  (select count(*)::int from delta_rows where coalesce(variant_key, '') <> '') as delta_variant_key_nonblank_rows,
  (
    select count(*)::int
    from delta_rows d
    where exists (
      select 1
      from delta_trait_hits h
      where h.card_print_id = d.id
    )
  ) as delta_rows_with_explicit_delta_trait_hits,
  (
    select canonical_row_count
    from distinct_name_surfaces
    where name = 'Gardevoir ex'
  ) as canonical_gardevoir_ex_rows,
  (
    select canonical_row_count
    from distinct_name_surfaces
    where name = 'Gardevoir ex δ'
  ) as canonical_gardevoir_ex_delta_rows,
  'classic collection already consumes the current structured variant lane via variant_key=cc, while the identity-bearing δ modifier survives only inside name text and is absent from structured traits'::text as proof_reason;

create temp table tmp_cel25_identity_gap_extension_v1 on commit drop as
select
  'delta_species_printed_identity_dimension'::text as required_extension_type,
  'card_prints'::text as target_layer,
  'add a bounded printed-identity modifier dimension that can coexist with the existing classic-collection variant surface instead of forcing δ to live only inside name text'::text as extension_summary,
  'card_printings is unlawful because δ is not a finish, and card_print_traits is insufficient as the canonical authority because the modifier changes printed identity and must participate in canonical identity planning'::text as target_layer_reason;

create temp table tmp_cel25_identity_gap_final_v1 on commit drop as
select
  t.old_parent_id as row_id,
  'IDENTITY_MODEL_EXTENSION_REQUIRED'::text as classification,
  s.semantic_difference_type,
  m.model_limitation,
  'unsafe'::text as collapse_safety,
  e.required_extension_type,
  e.target_layer,
  'DELTA_SPECIES_PRINTED_IDENTITY_MODEL_CONTRACT_V1'::text as next_lawful_execution_unit,
  'collapsing bare Gardevoir ex into Gardevoir ex δ would erase an identity-bearing printed modifier; the current model cannot represent both the classic-collection variant and the delta-species modifier as structured canonical identity dimensions'::text as proof_reason
from tmp_cel25_identity_gap_target_v1 t
join tmp_cel25_identity_gap_semantics_v1 s
  on s.old_parent_id = t.old_parent_id
cross join tmp_cel25_identity_gap_model_limits_v1 m
cross join tmp_cel25_identity_gap_extension_v1 e;

-- PHASE 1 — target row extraction
select
  old_parent_id,
  old_name,
  printed_token,
  variant_key,
  normalized_name,
  normalized_token
from tmp_cel25_identity_gap_target_v1;

-- PHASE 2 — canonical target analysis
select
  old_parent_id,
  old_name,
  old_printed_token,
  candidate_id,
  gv_id,
  candidate_name,
  candidate_printed_token,
  candidate_variant_key,
  match_type
from tmp_cel25_identity_gap_candidates_v1
order by candidate_printed_token, candidate_id;

-- PHASE 3 — semantic difference analysis
select
  old_parent_id as row_id,
  old_name,
  candidate_name,
  semantic_difference_type,
  delta_role,
  delta_is_punctuation,
  delta_is_pure_decoration,
  delta_is_subtype_or_species_modifier,
  delta_is_identity_bearing_modifier,
  semantic_summary
from tmp_cel25_identity_gap_semantics_v1;

-- PHASE 4 — model limitation identification
select
  model_limitation,
  logical_target_count,
  canonical_delta_rows,
  canonical_delta_sets,
  delta_variant_key_blank_rows,
  delta_variant_key_nonblank_rows,
  delta_rows_with_explicit_delta_trait_hits,
  canonical_gardevoir_ex_rows,
  canonical_gardevoir_ex_delta_rows,
  proof_reason
from tmp_cel25_identity_gap_model_limits_v1;

-- PHASE 5 — collapse safety test
select
  f.row_id,
  t.old_name,
  c.candidate_name,
  f.collapse_safety,
  'identity would be lost because the source lacks δ, the candidate target carries δ, and both Gardevoir ex and Gardevoir ex δ already exist as distinct canonical name surfaces in live canon'::text as why_collapse_is_unsafe
from tmp_cel25_identity_gap_final_v1 f
join tmp_cel25_identity_gap_target_v1 t
  on t.old_parent_id = f.row_id
join tmp_cel25_identity_gap_candidates_v1 c
  on c.old_parent_id = f.row_id;

-- PHASE 6 / 7 — required extension and final classification
select
  f.row_id,
  f.semantic_difference_type,
  f.model_limitation,
  f.collapse_safety,
  f.required_extension_type,
  f.target_layer,
  f.next_lawful_execution_unit,
  f.classification,
  f.proof_reason
from tmp_cel25_identity_gap_final_v1 f;

rollback;
