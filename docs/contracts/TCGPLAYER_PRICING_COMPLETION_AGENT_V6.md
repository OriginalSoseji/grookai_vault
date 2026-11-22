# TCGPlayer pricing completion agent V6

Status: Active. This contract supersedes V5 only for multi-finish Pokemon
mapping-review routing. Every other V4 and V5 boundary remains binding.

## Bounded base-finish projection

The completion agent may project a multi-subtype Pokemon TCGPlayer product into
the exact-mapping authority lane only when all of these conditions hold:

- the unchanged V1.3 exact planner identifies one source product, one unique
  active standard parent, and one collision-free target;
- the source subtypes contain exactly one verified base finish, Normal or
  Holofoil, plus Reverse Holofoil and no other finish;
- the frozen gap rows identify at least one observation for the base finish and
  at least one Reverse Holofoil observation from the same product and completed
  source sync;
- the checked-in English Master Index evidence and live canonical readback prove
  exactly one non-provisional child for the selected base finish.

The agent must project both the founder-review candidate and its exact planner
record to the base subtype and only its matching observation IDs. It must record
the original subtype set, original observation IDs, selected base subtype, held
Reverse Holo observation IDs, and policy version in the projected exact record,
then recompute the complete candidate fingerprint. Missing observations,
foreign product IDs, multiple base finishes, unsupported finishes, or any
review/exact-plan drift fail closed.

## Reverse Holo hold

Every excluded Reverse Holofoil observation remains measured with reason
`reverse_holo_printing_authority_not_proven`. This projection is not evidence
that a Reverse Holo printing exists. It may not create a parent, child printing,
identity, finish assignment, price, publication row, Vault record, image, or
customer state. A later publication may qualify only observations whose finish
resolves to an independently verified child. Reverse Holo observations remain
quarantined until a separate contract-backed printing-truth release proves
them.

## Review and execution boundary

The existing maximum of 50 products per founder-review batch remains binding.
The scheduled agent publishes review evidence only. Founder review does not
write mappings. The separate mapping-outcome preflight, second founder approval,
insert-only executor, transactional revalidation, and durable reconciliation
remain mandatory. The projection never grants pricing-publication authority and
never weakens the exact source, canonical target, Master Index, or current-state
guards.
