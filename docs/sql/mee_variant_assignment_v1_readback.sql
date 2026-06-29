-- MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1 readback.

select
  count(*)::bigint as assignment_rows,
  count(*) filter (where source_family = 'market_reference')::bigint as reference_assignment_rows,
  count(*) filter (where source_family = 'market_listing')::bigint as listing_assignment_rows,
  count(*) filter (where variant_assignment_status = 'exact_child_finish')::bigint as exact_child_finish_rows,
  count(*) filter (where variant_assignment_status = 'single_child_inferred')::bigint as single_child_inferred_rows,
  count(*) filter (where variant_assignment_status = 'parent_has_no_child')::bigint as parent_has_no_child_rows,
  count(*) filter (where variant_assignment_status = 'unknown_finish_needs_review')::bigint as unknown_finish_needs_review_rows,
  count(*) filter (where variant_assignment_status = 'ambiguous_finish_conflict')::bigint as ambiguous_finish_conflict_rows,
  count(*) filter (where variant_assignment_status = 'no_matching_child_finish')::bigint as no_matching_child_finish_rows,
  count(*) filter (where publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.market_evidence_variant_assignments
where variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1';

select
  source_family,
  variant_assignment_status,
  count(*)::bigint as rows
from public.market_evidence_variant_assignments
where variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
group by source_family, variant_assignment_status
order by source_family, rows desc;

select
  assigned_finish_key,
  source_family,
  count(*)::bigint as rows
from public.market_evidence_variant_assignments
where variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
  and assigned_finish_key is not null
group by assigned_finish_key, source_family
order by assigned_finish_key, source_family;

select
  source_family,
  source_finish_hint,
  normalized_finish_key,
  assigned_finish_key,
  variant_assignment_status,
  count(*)::bigint as rows
from public.market_evidence_variant_assignments
where card_print_id = 'a02f871c-fe3e-432b-944d-6decea0eecdf'
group by source_family, source_finish_hint, normalized_finish_key, assigned_finish_key, variant_assignment_status
order by source_family, source_finish_hint nulls last, assigned_finish_key nulls last;

select
  lane.card_print_id,
  lane.gv_id,
  lane.card_name,
  lane.set_code,
  lane.card_number,
  lane.printing_gv_id,
  lane.assigned_finish_key,
  lane.source_family,
  lane.assignment_rows,
  lane.exact_child_finish_rows,
  lane.single_child_inferred_rows,
  lane.unresolved_or_blocked_rows,
  lane.public_boundary_leak_rows
from public.v_market_evidence_variant_assignment_lane_summary_v1 lane
where lane.card_print_id = 'a02f871c-fe3e-432b-944d-6decea0eecdf'
order by lane.source_family, lane.assigned_finish_key nulls last;

select
  count(*)::bigint as duplicate_source_assignment_rows
from (
  select source_family, source_row_id, variant_assignment_version, count(*) as rows
  from public.market_evidence_variant_assignments
  group by source_family, source_row_id, variant_assignment_version
  having count(*) > 1
) duplicates;
