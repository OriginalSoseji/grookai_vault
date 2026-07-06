-- MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1 deterministic backfill.
-- Scope: market_reference_candidates and market_listing_card_candidates only.
-- Boundary: internal sidecar inserts only; no pricing publication or evidence mutation.

begin;

with child_counts as (
  select
    card_print_id,
    count(*)::integer as child_count,
    array_agg(distinct finish_key order by finish_key) as child_finish_keys
  from public.card_printings
  group by card_print_id
),
source_rows as (
  select
    'market_reference'::text as source_family,
    'market_reference_candidates'::text as source_table,
    candidate.id as source_row_id,
    null::uuid as observation_id,
    candidate.raw_snapshot_id,
    candidate.card_print_id,
    candidate.gv_id,
    candidate.source,
    null::text as source_listing_id,
    candidate.raw_title,
    candidate.finish_hint as source_finish_hint,
    public.normalize_market_evidence_finish_key_v1(candidate.finish_hint) as normalized_finish_key,
    child_counts.child_count,
    child_counts.child_finish_keys
  from public.market_reference_candidates candidate
  left join child_counts
    on child_counts.card_print_id = candidate.card_print_id
),
matched_child as (
  select
    source_rows.source_row_id,
    count(child.id)::integer as match_count,
    (array_agg(child.id order by child.id))[1] as card_printing_id,
    (array_agg(child.printing_gv_id order by child.id))[1] as printing_gv_id,
    (array_agg(child.finish_key order by child.id))[1] as assigned_finish_key
  from source_rows
  left join public.card_printings child
    on child.card_print_id = source_rows.card_print_id
   and (
     child.finish_key = source_rows.normalized_finish_key
     or (
       source_rows.normalized_finish_key = 'cosmos'
       and child.finish_key = 'cracked_ice'
       and not exists (
         select 1
         from public.card_printings exact_cosmos
         where exact_cosmos.card_print_id = source_rows.card_print_id
           and exact_cosmos.finish_key = 'cosmos'
       )
     )
   )
  group by source_rows.source_row_id
),
single_child as (
  select
    child.card_print_id,
    child.id as card_printing_id,
    child.printing_gv_id,
    child.finish_key as assigned_finish_key
  from public.card_printings child
  join child_counts
    on child_counts.card_print_id = child.card_print_id
   and child_counts.child_count = 1
),
projected as (
  select
    source_rows.*,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::uuid
      when matched_child.match_count = 1 then matched_child.card_printing_id
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.card_printing_id
      else null::uuid
    end as card_printing_id,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::text
      when matched_child.match_count = 1 then matched_child.printing_gv_id
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.printing_gv_id
      else null::text
    end as printing_gv_id,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::text
      when matched_child.match_count = 1 then matched_child.assigned_finish_key
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.assigned_finish_key
      else null::text
    end as assigned_finish_key,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 'parent_has_no_child'
      when matched_child.match_count = 1 then 'exact_child_finish'
      when matched_child.match_count > 1 then 'ambiguous_finish_conflict'
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 'single_child_inferred'
      when source_rows.normalized_finish_key is null then 'unknown_finish_needs_review'
      else 'no_matching_child_finish'
    end as variant_assignment_status,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 0.9900
      when matched_child.match_count = 1 then 0.9600
      when matched_child.match_count > 1 then 0.2000
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 0.7600
      when source_rows.normalized_finish_key is null then 0.1000
      else 0.2000
    end::numeric(5,4) as variant_assignment_confidence,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 'parent identity has no child finish rows'
      when matched_child.match_count = 1 then 'source finish hint matched one child finish row'
      when matched_child.match_count > 1 then 'source finish hint matched multiple child finish rows'
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 'single child finish inferred because parent has exactly one child row'
      when source_rows.normalized_finish_key is null then 'source finish hint was blank or not recognized for multi-finish parent'
      else 'source finish hint did not match any child finish row'
    end as variant_assignment_reason,
    array_remove(array[
      case when source_rows.child_count > 1 then 'multi_finish_parent' end,
      case when source_rows.normalized_finish_key is null then 'finish_hint_unrecognized' end,
      case when matched_child.match_count > 1 then 'duplicate_child_finish_match' end,
      case when source_rows.normalized_finish_key is not null and coalesce(matched_child.match_count, 0) = 0 and coalesce(source_rows.child_count, 0) > 0 then 'finish_hint_without_child_lane' end
    ]::text[], null) as variant_assignment_flags
  from source_rows
  left join matched_child
    on matched_child.source_row_id = source_rows.source_row_id
  left join single_child
    on single_child.card_print_id = source_rows.card_print_id
)
insert into public.market_evidence_variant_assignments (
  source_family,
  source_table,
  source_row_id,
  observation_id,
  raw_snapshot_id,
  card_print_id,
  gv_id,
  card_printing_id,
  printing_gv_id,
  source_finish_hint,
  normalized_finish_key,
  assigned_finish_key,
  variant_assignment_status,
  variant_assignment_confidence,
  variant_assignment_version,
  variant_assignment_reason,
  variant_assignment_flags,
  assignment_payload,
  needs_review,
  publishable,
  app_visible,
  market_truth
)
select
  projected.source_family,
  projected.source_table,
  projected.source_row_id,
  projected.observation_id,
  projected.raw_snapshot_id,
  projected.card_print_id,
  projected.gv_id,
  projected.card_printing_id,
  projected.printing_gv_id,
  projected.source_finish_hint,
  projected.normalized_finish_key,
  projected.assigned_finish_key,
  projected.variant_assignment_status,
  projected.variant_assignment_confidence,
  'MEE_VARIANT_ASSIGNMENT_RULES_V1',
  projected.variant_assignment_reason,
  projected.variant_assignment_flags,
  jsonb_build_object(
    'source', projected.source,
    'raw_title', projected.raw_title,
    'child_count', coalesce(projected.child_count, 0),
    'child_finish_keys', coalesce(to_jsonb(projected.child_finish_keys), '[]'::jsonb),
    'backfill_package', 'MEE_VARIANT_ASSIGNMENT_V1'
  ),
  true,
  false,
  false,
  false
from projected
where not exists (
  select 1
  from public.market_evidence_variant_assignments existing
  where existing.source_family = projected.source_family
    and existing.source_row_id = projected.source_row_id
    and existing.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
);

with child_counts as (
  select
    card_print_id,
    count(*)::integer as child_count,
    array_agg(distinct finish_key order by finish_key) as child_finish_keys
  from public.card_printings
  group by card_print_id
),
source_rows as (
  select
    'market_listing'::text as source_family,
    'market_listing_card_candidates'::text as source_table,
    candidate.id as source_row_id,
    candidate.observation_id,
    candidate.raw_snapshot_id,
    candidate.card_print_id,
    candidate.gv_id,
    candidate.source,
    candidate.source_listing_id,
    coalesce(
      observation.listing_title,
      candidate.title_features ->> 'listing_title',
      candidate.title_features ->> 'query_text'
    ) as raw_title,
    coalesce(
      candidate.finish_features ->> 'finish_key',
      candidate.finish_features ->> 'finish',
      candidate.finish_features ->> 'finish_hint',
      observation.listing_title,
      candidate.title_features ->> 'listing_title',
      candidate.title_features ->> 'query_text'
    ) as source_finish_hint,
    public.normalize_market_evidence_finish_key_v1(coalesce(
      candidate.finish_features ->> 'finish_key',
      candidate.finish_features ->> 'finish',
      candidate.finish_features ->> 'finish_hint',
      observation.listing_title,
      candidate.title_features ->> 'listing_title',
      candidate.title_features ->> 'query_text'
    )) as normalized_finish_key,
    child_counts.child_count,
    child_counts.child_finish_keys,
    candidate.title_features,
    candidate.condition_features,
    candidate.exclusion_flags
  from public.market_listing_card_candidates candidate
  left join public.market_listing_observations observation
    on observation.id = candidate.observation_id
  left join child_counts
    on child_counts.card_print_id = candidate.card_print_id
),
matched_child as (
  select
    source_rows.source_row_id,
    count(child.id)::integer as match_count,
    (array_agg(child.id order by child.id))[1] as card_printing_id,
    (array_agg(child.printing_gv_id order by child.id))[1] as printing_gv_id,
    (array_agg(child.finish_key order by child.id))[1] as assigned_finish_key
  from source_rows
  left join public.card_printings child
    on child.card_print_id = source_rows.card_print_id
   and (
     child.finish_key = source_rows.normalized_finish_key
     or (
       source_rows.normalized_finish_key = 'cosmos'
       and child.finish_key = 'cracked_ice'
       and not exists (
         select 1
         from public.card_printings exact_cosmos
         where exact_cosmos.card_print_id = source_rows.card_print_id
           and exact_cosmos.finish_key = 'cosmos'
       )
     )
   )
  group by source_rows.source_row_id
),
single_child as (
  select
    child.card_print_id,
    child.id as card_printing_id,
    child.printing_gv_id,
    child.finish_key as assigned_finish_key
  from public.card_printings child
  join child_counts
    on child_counts.card_print_id = child.card_print_id
   and child_counts.child_count = 1
),
projected as (
  select
    source_rows.*,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::uuid
      when matched_child.match_count = 1 then matched_child.card_printing_id
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.card_printing_id
      else null::uuid
    end as card_printing_id,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::text
      when matched_child.match_count = 1 then matched_child.printing_gv_id
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.printing_gv_id
      else null::text
    end as printing_gv_id,
    case
      when coalesce(source_rows.child_count, 0) = 0 then null::text
      when matched_child.match_count = 1 then matched_child.assigned_finish_key
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then single_child.assigned_finish_key
      else null::text
    end as assigned_finish_key,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 'parent_has_no_child'
      when matched_child.match_count = 1 then 'exact_child_finish'
      when matched_child.match_count > 1 then 'ambiguous_finish_conflict'
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 'single_child_inferred'
      when source_rows.normalized_finish_key is null then 'unknown_finish_needs_review'
      else 'no_matching_child_finish'
    end as variant_assignment_status,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 0.9900
      when matched_child.match_count = 1 then 0.9000
      when matched_child.match_count > 1 then 0.2000
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 0.7000
      when source_rows.normalized_finish_key is null then 0.1000
      else 0.2000
    end::numeric(5,4) as variant_assignment_confidence,
    case
      when coalesce(source_rows.child_count, 0) = 0 then 'parent identity has no child finish rows'
      when matched_child.match_count = 1 then 'listing finish text matched one child finish row'
      when matched_child.match_count > 1 then 'listing finish text matched multiple child finish rows'
      when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 'single child finish inferred because parent has exactly one child row'
      when source_rows.normalized_finish_key is null then 'listing title or finish features did not identify a finish for multi-finish parent'
      else 'listing finish text did not match any child finish row'
    end as variant_assignment_reason,
    array_remove(array[
      case when source_rows.child_count > 1 then 'multi_finish_parent' end,
      case when source_rows.normalized_finish_key is null then 'finish_text_unrecognized' end,
      case when matched_child.match_count > 1 then 'duplicate_child_finish_match' end,
      case when source_rows.normalized_finish_key is not null and coalesce(matched_child.match_count, 0) = 0 and coalesce(source_rows.child_count, 0) > 0 then 'finish_text_without_child_lane' end,
      case when coalesce(array_length(source_rows.exclusion_flags, 1), 0) > 0 then 'candidate_has_exclusion_flags' end
    ]::text[], null) as variant_assignment_flags
  from source_rows
  left join matched_child
    on matched_child.source_row_id = source_rows.source_row_id
  left join single_child
    on single_child.card_print_id = source_rows.card_print_id
)
insert into public.market_evidence_variant_assignments (
  source_family,
  source_table,
  source_row_id,
  observation_id,
  raw_snapshot_id,
  card_print_id,
  gv_id,
  card_printing_id,
  printing_gv_id,
  source_finish_hint,
  normalized_finish_key,
  assigned_finish_key,
  variant_assignment_status,
  variant_assignment_confidence,
  variant_assignment_version,
  variant_assignment_reason,
  variant_assignment_flags,
  assignment_payload,
  needs_review,
  publishable,
  app_visible,
  market_truth
)
select
  projected.source_family,
  projected.source_table,
  projected.source_row_id,
  projected.observation_id,
  projected.raw_snapshot_id,
  projected.card_print_id,
  projected.gv_id,
  projected.card_printing_id,
  projected.printing_gv_id,
  projected.source_finish_hint,
  projected.normalized_finish_key,
  projected.assigned_finish_key,
  projected.variant_assignment_status,
  projected.variant_assignment_confidence,
  'MEE_VARIANT_ASSIGNMENT_RULES_V1',
  projected.variant_assignment_reason,
  projected.variant_assignment_flags,
  jsonb_build_object(
    'source', projected.source,
    'source_listing_id', projected.source_listing_id,
    'raw_title', projected.raw_title,
    'child_count', coalesce(projected.child_count, 0),
    'child_finish_keys', coalesce(to_jsonb(projected.child_finish_keys), '[]'::jsonb),
    'title_features', coalesce(projected.title_features, '{}'::jsonb),
    'condition_features', coalesce(projected.condition_features, '{}'::jsonb),
    'exclusion_flags', coalesce(to_jsonb(projected.exclusion_flags), '[]'::jsonb),
    'backfill_package', 'MEE_VARIANT_ASSIGNMENT_V1'
  ),
  true,
  false,
  false,
  false
from projected
where not exists (
  select 1
  from public.market_evidence_variant_assignments existing
  where existing.source_family = projected.source_family
    and existing.source_row_id = projected.source_row_id
    and existing.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
);

commit;
