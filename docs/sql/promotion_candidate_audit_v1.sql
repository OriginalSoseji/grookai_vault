-- PROMOTION_CANDIDATE_AUDIT_V1
-- Read-only audit of the 31 staged promotion candidates emitted by
-- CONTROLLED_GROWTH_INGESTION_PIPELINE_V1.
--
-- This artifact does not mutate canonical tables. It inspects staged rows,
-- raw imports, and current canonical identity to determine whether each
-- candidate is a true expansion candidate, a normalization miss, a namespace
-- collision, a rule-gap surface, or non-canonical noise.

begin;

create temp view promotion_candidate_audit_v1 as
with promotion_candidates as (
  select
    edc.id as staging_id,
    edc.raw_import_id::text as raw_id,
    edc.name_raw as raw_name,
    edc.number_raw as raw_number,
    edc.set_id as raw_set,
    edc.normalized_name,
    edc.normalized_number_left as normalized_number,
    edc.normalized_number_plain,
    coalesce((edc.payload->'_grookai_ingestion_v1'->'candidate_set_mapping'->>0), null) as candidate_set_mapping,
    (edc.payload->'_grookai_ingestion_v1'->>'confidence_score')::numeric as confidence_score,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'inferred_variant_key', '') as inferred_variant_key,
    ri.ingested_at as ingestion_timestamp
  from public.external_discovery_candidates edc
  join public.raw_imports ri
    on ri.id = edc.raw_import_id
  where edc.source = 'justtcg'
    and edc.classifier_version = 'CONTROLLED_GROWTH_INGESTION_PIPELINE_V1'
    and edc.candidate_bucket = 'CLEAN_CANON_CANDIDATE'
    and edc.match_status = 'UNMATCHED'
),
canon as (
  select
    cp.id::text as card_print_id,
    s.code as set_code,
    cp.name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    cp.gv_id,
    lower(
      trim(
        regexp_replace(
          replace(replace(replace(replace(cp.name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as canon_name_key,
    coalesce(nullif(ltrim(cp.number_plain, '0'), ''), '0') as canon_number_plain_trim
  from public.card_prints cp
  join public.sets s
    on s.id = cp.set_id
  where cp.gv_id is not null
),
candidate_features as (
  select
    pc.*,
    lower(
      trim(
        regexp_replace(
          replace(replace(replace(replace(pc.normalized_name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as candidate_name_key,
    exact_match.card_print_id as exact_match_card_print_id,
    exact_match.gv_id as exact_match_gv_id,
    normalized_match.card_print_id as normalized_match_card_print_id,
    normalized_match.gv_id as normalized_match_gv_id,
    token_match.card_print_id as token_match_card_print_id,
    token_match.gv_id as token_match_gv_id,
    variant_match.card_print_id as variant_match_card_print_id,
    variant_match.gv_id as variant_match_gv_id,
    exists (
      select 1
      from canon c
      where c.set_code = pc.candidate_set_mapping
        and c.canon_number_plain_trim = coalesce(nullif(pc.normalized_number_plain, ''), '0')
    ) as has_same_set_token_match,
    (
      select count(*)::int
      from promotion_candidates pc2
      where pc2.raw_id <> pc.raw_id
        and pc2.candidate_set_mapping = pc.candidate_set_mapping
        and pc2.normalized_number_plain = pc.normalized_number_plain
    ) as duplicate_candidate_same_number_count,
    position('(#' in pc.raw_name) > 0 as has_deck_slot_marker,
    position('[Staff]' in pc.raw_name) > 0 as has_staff_marker,
    (
      position('Japanese Exclusive' in pc.raw_name) > 0
      or position('Dream League' in pc.raw_name) > 0
    ) as has_locale_or_special_marker,
    pc.raw_name in ('Ghastly', 'Nidoran F', 'Nidoran M') as is_known_normalization_gap
  from promotion_candidates pc
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = pc.candidate_set_mapping
      and c.number = pc.normalized_number
      and c.name = pc.normalized_name
    order by c.card_print_id
    limit 1
  ) exact_match on true
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = pc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(pc.normalized_number_plain, ''), '0')
      and c.canon_name_key = lower(
        trim(
          regexp_replace(
            replace(replace(replace(replace(pc.normalized_name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
            '\s+',
            ' ',
            'g'
          )
        )
      )
    order by c.card_print_id
    limit 1
  ) normalized_match on true
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = pc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(pc.normalized_number_plain, ''), '0')
    order by c.card_print_id
    limit 1
  ) token_match on true
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = pc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(pc.normalized_number_plain, ''), '0')
      and c.variant_key = coalesce(pc.inferred_variant_key, '')
    order by c.card_print_id
    limit 1
  ) variant_match on true
),
classified as (
  select
    cf.*,
    case
      when cf.exact_match_card_print_id is not null then 'yes'
      when cf.normalized_match_card_print_id is not null then 'yes'
      when cf.token_match_card_print_id is not null then 'yes'
      when cf.variant_match_card_print_id is not null then 'yes'
      else 'no'
    end as match_found,
    case
      when cf.exact_match_card_print_id is not null then 'exact'
      when cf.normalized_match_card_print_id is not null then 'normalized'
      when cf.token_match_card_print_id is not null then 'token'
      when cf.variant_match_card_print_id is not null then 'variant_key'
      else 'none'
    end as match_type,
    coalesce(
      cf.exact_match_card_print_id,
      cf.normalized_match_card_print_id,
      cf.token_match_card_print_id,
      cf.variant_match_card_print_id
    ) as candidate_card_print_id,
    case
      when cf.has_deck_slot_marker then 'NON_CANONICAL'
      when cf.has_staff_marker or cf.has_locale_or_special_marker then 'PARTIAL_MATCH_REQUIRING_RULE'
      when cf.is_known_normalization_gap and cf.has_same_set_token_match then 'MISSED_NORMALIZATION'
      when cf.has_same_set_token_match or cf.duplicate_candidate_same_number_count > 0 then 'NAMESPACE_COLLISION'
      else 'TRUE_NEW_CANONICAL'
    end as audit_classification,
    case
      when cf.has_deck_slot_marker then 'deck_slot_marker_is_source_disambiguation_not_printed_identity'
      when cf.has_staff_marker then 'staff_or_event_modifier_requires_separate_promo_contract'
      when cf.has_locale_or_special_marker then 'locale_or_special_edition_surface_falls_outside_current_english_promo_contract'
      when cf.is_known_normalization_gap and cf.has_same_set_token_match then 'same_set_token_exists_but_current_normalization_missed_alias_or_symbol'
      when cf.has_same_set_token_match then 'same_set_number_already_owned_by_distinct_canonical_identity'
      when cf.duplicate_candidate_same_number_count > 0 then 'multiple_candidates_share_same_future_namespace_without_rule'
      else 'no_canonical_or_namespace_collision_detected'
    end as proof_reason
  from candidate_features cf
)
select *
from classified;

-- Candidate extraction with comparison result.
select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number,
  candidate_set_mapping,
  confidence_score,
  match_found,
  match_type,
  candidate_card_print_id,
  audit_classification,
  proof_reason
from promotion_candidate_audit_v1
order by raw_set, raw_number, raw_name;

-- Grouped classification summary.
select
  audit_classification as classification,
  count(*)::int as row_count
from promotion_candidate_audit_v1
group by audit_classification
order by audit_classification;

-- Pattern grouping for checkpoint examples.
select
  raw_set,
  audit_classification as classification,
  count(*)::int as row_count
from promotion_candidate_audit_v1
group by raw_set, audit_classification
order by raw_set, audit_classification;

-- Gate decision summary.
select
  count(*)::int as candidate_count,
  count(*) filter (where audit_classification = 'TRUE_NEW_CANONICAL')::int as true_new_canonical_count,
  count(*) filter (where audit_classification = 'MISSED_NORMALIZATION')::int as normalization_miss_count,
  count(*) filter (where audit_classification = 'NAMESPACE_COLLISION')::int as namespace_collision_count,
  count(*) filter (where audit_classification = 'PARTIAL_MATCH_REQUIRING_RULE')::int as partial_match_requiring_rule_count,
  count(*) filter (where audit_classification = 'NON_CANONICAL')::int as non_canonical_count,
  'no'::text as promotion_allowed,
  'CONTROLLED_GROWTH_INGESTION_RULE_HARDENING_AUDIT_V1'::text as next_execution_unit
from promotion_candidate_audit_v1;

rollback;
