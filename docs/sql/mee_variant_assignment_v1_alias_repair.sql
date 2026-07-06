-- MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1 alias repair.
-- Maps seller/provider "cosmos" finish text to cracked_ice only when the parent has
-- a cracked_ice child and no true cosmos child.

begin;

with alias_targets as (
  select
    assignment.id as variant_assignment_id,
    cracked.id as card_printing_id,
    cracked.printing_gv_id,
    cracked.finish_key as assigned_finish_key
  from public.market_evidence_variant_assignments assignment
  join public.card_printings cracked
    on cracked.card_print_id = assignment.card_print_id
   and cracked.finish_key = 'cracked_ice'
  where assignment.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
    and assignment.normalized_finish_key = 'cosmos'
    and assignment.variant_assignment_status = 'no_matching_child_finish'
    and not exists (
      select 1
      from public.card_printings cosmos
      where cosmos.card_print_id = assignment.card_print_id
        and cosmos.finish_key = 'cosmos'
    )
)
update public.market_evidence_variant_assignments assignment
set
  card_printing_id = alias_targets.card_printing_id,
  printing_gv_id = alias_targets.printing_gv_id,
  assigned_finish_key = alias_targets.assigned_finish_key,
  variant_assignment_status = 'exact_child_finish',
  variant_assignment_confidence = 0.8800,
  variant_assignment_reason = 'cosmos finish text matched cracked_ice child because parent has no cosmos child',
  variant_assignment_flags = case
    when 'finish_alias_cosmos_to_cracked_ice' = any(assignment.variant_assignment_flags)
      then assignment.variant_assignment_flags
    else array_append(assignment.variant_assignment_flags, 'finish_alias_cosmos_to_cracked_ice')
  end,
  assignment_payload = assignment.assignment_payload || jsonb_build_object(
    'finish_alias_applied', 'cosmos_to_cracked_ice',
    'finish_alias_policy', 'only_when_no_cosmos_child_exists'
  )
from alias_targets
where assignment.id = alias_targets.variant_assignment_id;

commit;
