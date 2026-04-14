-- CONTROLLED_GROWTH_INGESTION_RULE_HARDENING_AUDIT_V1
-- Read-only audit of the 31 staged false-promotion rows emitted by
-- CONTROLLED_GROWTH_INGESTION_PIPELINE_V1.
--
-- Purpose:
-- 1. explain why each staged row surfaced as a false promotion candidate
-- 2. reconstruct all relevant canonical comparison paths
-- 3. classify each row into a deterministic rule-hardening bucket
-- 4. define the highest-leverage next classifier hardening unit

begin;

create temp view controlled_growth_ingestion_rule_hardening_audit_v1 as
with target_candidates as (
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
    edc.payload->'_grookai_ingestion_v1'->>'classification' as classification,
    (edc.payload->'_grookai_ingestion_v1'->>'confidence_score')::numeric as confidence_score,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'inferred_variant_key', '') as inferred_variant_key
  from public.external_discovery_candidates edc
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
    tc.*,
    lower(
      trim(
        regexp_replace(
          replace(replace(replace(replace(tc.normalized_name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
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
      where c.set_code = tc.candidate_set_mapping
        and c.canon_number_plain_trim = coalesce(nullif(tc.normalized_number_plain, ''), '0')
    ) as has_same_set_token_match,
    (
      select count(*)::int
      from target_candidates tc2
      where tc2.raw_id <> tc.raw_id
        and tc2.candidate_set_mapping = tc.candidate_set_mapping
        and tc2.normalized_number_plain = tc.normalized_number_plain
    ) as duplicate_candidate_same_number_count,
    position('(#' in tc.raw_name) > 0 as has_deck_slot_marker,
    position('[Staff]' in tc.raw_name) > 0 as has_staff_marker,
    (
      position('Japanese Exclusive' in tc.raw_name) > 0
      or position('Dream League' in tc.raw_name) > 0
    ) as has_locale_special_marker,
    (
      position('Prerelease' in tc.raw_name) > 0
      or position('City Championships' in tc.raw_name) > 0
      or position('Origins Game Fair' in tc.raw_name) > 0
    ) as has_event_marker,
    tc.raw_name in ('Ghastly', 'Nidoran F', 'Nidoran M') as is_known_alias_gap
  from target_candidates tc
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = tc.candidate_set_mapping
      and c.number = tc.normalized_number
      and c.name = tc.normalized_name
    order by c.card_print_id
    limit 1
  ) exact_match on true
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = tc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(tc.normalized_number_plain, ''), '0')
      and c.canon_name_key = lower(
        trim(
          regexp_replace(
            replace(replace(replace(replace(tc.normalized_name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
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
    where c.set_code = tc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(tc.normalized_number_plain, ''), '0')
    order by c.card_print_id
    limit 1
  ) token_match on true
  left join lateral (
    select c.card_print_id, c.gv_id
    from canon c
    where c.set_code = tc.candidate_set_mapping
      and c.canon_number_plain_trim = coalesce(nullif(tc.normalized_number_plain, ''), '0')
      and c.variant_key = coalesce(tc.inferred_variant_key, '')
    order by c.card_print_id
    limit 1
  ) variant_match on true
),
reconstructed as (
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
      when cf.exact_match_card_print_id is not null then 'exact_printed_surface'
      when cf.normalized_match_card_print_id is not null then 'normalized_name'
      when cf.token_match_card_print_id is not null then 'number_plain'
      when cf.variant_match_card_print_id is not null then 'variant_key'
      else 'none'
    end as match_type,
    coalesce(
      cf.exact_match_card_print_id,
      cf.normalized_match_card_print_id,
      cf.token_match_card_print_id,
      cf.variant_match_card_print_id
    ) as candidate_card_print_id,
    coalesce(
      cf.exact_match_gv_id,
      cf.normalized_match_gv_id,
      cf.token_match_gv_id,
      cf.variant_match_gv_id
    ) as candidate_gv_id,
    case
      when cf.has_deck_slot_marker then 'deck_slot_disambiguator_is_not_printed_identity'
      when cf.is_known_alias_gap and cf.has_same_set_token_match then 'same_set_token_exists_but_alias_normalization_is_missing'
      when cf.has_staff_marker or cf.has_event_marker or cf.has_locale_special_marker then 'promo_event_or_locale_surface_needs_review_routing'
      when cf.has_same_set_token_match then 'same_set_number_is_already_owned_by_existing_canonical_identity'
      when cf.duplicate_candidate_same_number_count > 0 then 'multiple_staged_rows_share_same_future_number_namespace'
      else 'no_same_set_match_or_collision_under_current_classifier'
    end as comparison_failure_reason
  from candidate_features cf
),
prior_audit_classified as (
  select
    r.*,
    case
      when r.has_deck_slot_marker then 'NON_CANONICAL'
      when r.has_staff_marker or r.has_event_marker or r.has_locale_special_marker then 'PARTIAL_MATCH_REQUIRING_RULE'
      when r.is_known_alias_gap and r.has_same_set_token_match then 'MISSED_NORMALIZATION'
      when r.has_same_set_token_match or r.duplicate_candidate_same_number_count > 0 then 'NAMESPACE_COLLISION'
      else 'TRUE_NEW_CANONICAL'
    end as prior_audit_class
  from reconstructed r
),
hardening_classified as (
  select
    pac.*,
    case
      when pac.has_deck_slot_marker then 'NON_CANONICAL_FILTER_RULE_GAP'
      when pac.is_known_alias_gap and pac.has_same_set_token_match then 'NORMALIZATION_RULE_GAP'
      when pac.has_staff_marker or pac.has_event_marker or pac.has_locale_special_marker then 'MATCH_HEURISTIC_RULE_GAP'
      when pac.has_same_set_token_match or pac.duplicate_candidate_same_number_count > 0 then 'NAMESPACE_RULE_GAP'
      else 'REVIEW_SURFACE_CORRECT_AS_IS'
    end as hardening_bucket,
    case
      when pac.has_deck_slot_marker then 'trainer_kit_deck_slot_marker_should_be_filtered_before_promotion_staging'
      when pac.raw_name = 'Ghastly' then 'gastly_spelling_alias_missing_from_normalized_match_surface'
      when pac.raw_name in ('Nidoran F', 'Nidoran M') then 'gender_symbol_alias_missing_from_normalized_match_surface'
      when pac.has_staff_marker or pac.has_event_marker then 'staff_or_event_promo_markers_should_route_to_review_not_promotion'
      when pac.has_locale_special_marker then 'locale_specific_or_special_promo_markers_should_route_to_review_not_promotion'
      when pac.has_same_set_token_match then 'same_set_number_ownership_guard_should_block_false_promotion'
      when pac.duplicate_candidate_same_number_count > 0 then 'duplicate_staged_number_namespace_should_route_to_review'
      else 'current_review_surface_is_already_correct'
    end as hardening_reason,
    case
      when pac.has_deck_slot_marker then 'TRAINER_KIT_DECK_SLOT_NON_CANONICAL_FILTER'
      when pac.raw_name = 'Ghastly' then 'SPELLING_ALIAS_NORMALIZATION_MATCH'
      when pac.raw_name in ('Nidoran F', 'Nidoran M') then 'SYMBOL_ALIAS_NORMALIZATION_MATCH'
      when pac.has_staff_marker or pac.has_event_marker then 'PROMO_EVENT_REVIEW_ROUTING'
      when pac.has_locale_special_marker then 'LOCALE_SPECIAL_PROMO_REVIEW_ROUTING'
      when pac.has_same_set_token_match then 'SAME_SET_TOKEN_NAMESPACE_GUARD'
      when pac.duplicate_candidate_same_number_count > 0 then 'DUPLICATE_FUTURE_NUMBER_REVIEW_ROUTING'
      else 'LEAVE_REVIEW_AS_IS'
    end as grouped_root_cause
  from prior_audit_classified pac
)
select *
from hardening_classified;

-- Phase 1: target candidate extraction.
select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number,
  candidate_set_mapping,
  classification,
  confidence_score
from controlled_growth_ingestion_rule_hardening_audit_v1
order by raw_set, raw_number, raw_name;

-- Phase 2: canonical comparison reconstruction.
select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  match_found,
  match_type,
  candidate_card_print_id,
  candidate_gv_id,
  comparison_failure_reason
from controlled_growth_ingestion_rule_hardening_audit_v1
order by raw_set, raw_number, raw_name;

-- Phase 3 and 4: rule-hardening reclassification and crosswalk.
select
  prior_audit_class,
  hardening_bucket,
  count(*)::int as row_count
from controlled_growth_ingestion_rule_hardening_audit_v1
group by prior_audit_class, hardening_bucket
order by prior_audit_class, hardening_bucket;

-- Phase 5: grouped rule-gap summary.
select
  hardening_bucket as rule_gap_bucket,
  count(*)::int as row_count
from controlled_growth_ingestion_rule_hardening_audit_v1
group by hardening_bucket
order by hardening_bucket;

select
  grouped_root_cause,
  count(*)::int as row_count
from controlled_growth_ingestion_rule_hardening_audit_v1
group by grouped_root_cause
order by row_count desc, grouped_root_cause;

-- Phase 6: hardening priority order.
select
  priority,
  rule_name,
  target_surface_count,
  risk_level,
  expected_effect
from (
  values
    (
      1,
      'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1',
      19,
      'low',
      'moves trainer-kit deck-slot artifacts from false promotion into early non-canonical filtering'
    ),
    (
      2,
      'CONTROLLED_GROWTH_INGESTION_NORMALIZATION_RULES_V1',
      3,
      'low',
      'converts Ghastly and Nidoran F/M false promotions into deterministic canonical matches'
    ),
    (
      3,
      'CONTROLLED_GROWTH_INGESTION_MATCH_HEURISTIC_RULES_V1',
      8,
      'medium',
      'routes staff, event, and locale promo surfaces into review instead of promotion'
    ),
    (
      4,
      'CONTROLLED_GROWTH_INGESTION_NAMESPACE_RULES_V1',
      1,
      'medium',
      'blocks false promotion when same-set printed number ownership is already occupied'
    )
) as priority_plan(priority, rule_name, target_surface_count, risk_level, expected_effect)
order by priority;

-- Phase 7 and 8: gate decision and next unit.
select
  count(*)::int as candidate_count,
  count(*) filter (where hardening_bucket = 'NORMALIZATION_RULE_GAP')::int as normalization_rule_gap_count,
  count(*) filter (where hardening_bucket = 'NAMESPACE_RULE_GAP')::int as namespace_rule_gap_count,
  count(*) filter (where hardening_bucket = 'MATCH_HEURISTIC_RULE_GAP')::int as match_heuristic_rule_gap_count,
  count(*) filter (where hardening_bucket = 'NON_CANONICAL_FILTER_RULE_GAP')::int as non_canonical_filter_rule_gap_count,
  count(*) filter (where hardening_bucket = 'REVIEW_SURFACE_CORRECT_AS_IS')::int as review_surface_correct_as_is_count,
  0::int as unclassified_count,
  'no'::text as promotion_allowed_after_rule_hardening,
  'rule_hardening_only_reclassifies_false_promotions_into_match_review_or_non_canonical_lanes'::text as why,
  'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1'::text as next_lawful_execution_unit
from controlled_growth_ingestion_rule_hardening_audit_v1;

rollback;
