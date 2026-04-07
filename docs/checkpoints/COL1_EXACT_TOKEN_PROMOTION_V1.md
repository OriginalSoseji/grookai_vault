# COL1_EXACT_TOKEN_PROMOTION_V1

## Context

`col1` is a mixed-lane identity family under `COL1_IDENTITY_CONTRACT_V1`. Exact printed token is canonical, so both numeric tokens and shiny-legend `SL#` tokens must be promoted without coercion.

This phase promotes unresolved `col1` parents in place by assigning `GV-PK-COL-*` on the existing `card_prints.id` rows after the canonical `GV-PK-COL-*` namespace migration completed.

## Proof Of Promotion Safety

Locked audit proof before apply:

- `candidate_count = 11`
- `valid_token_count = 11`
- `numeric_token_count = 5`
- `sl_token_count = 6`
- `collapse_candidate_count = 0`
- `same_token_different_name_count = 0`
- `multiple_match_old_count = 0`
- `promotion_live_collision_count = 0`

This proves the remaining `col1` surface is a pure exact-token promotion subset.

## Token Preservation Rule

`buildCardPrintGvIdV1` is the source of truth for this phase and emits:

- `GV-PK-COL-1`
- `GV-PK-COL-10`
- `GV-PK-COL-SL2`
- `GV-PK-COL-SL11`

The runner preserves the full printed token exactly. No numeric coercion, no `SL` stripping, no suffix generation, and no descriptor logic enters scope.

## Namespace Validation

Promotion hard gates require:

- zero invalid tokens
- zero duplicate printed tokens inside the candidate pool
- zero exact-token canonical overlaps
- zero same-token different-name conflicts
- zero internal proposed `gv_id` collisions
- zero live `card_prints.gv_id` collisions

## Apply Method

The runner updates only `card_prints.gv_id` on the existing unresolved `col1` parents:

```sql
update card_prints
set gv_id = <derived_gv_id>
where id = <card_print_id>
  and gv_id is null;
```

No inserts, deletes, or identity reassignments occur in this phase.

## Risks And Mitigation

- Candidate drift: hard gate on `candidate_count = 11`.
- Token drift: hard gate on exact token validation.
- Namespace collision: dry-run derives every proposed `GV-PK-COL-*` and checks live collisions before apply.
- Partial apply risk: one transaction with rollback on any mismatch.

## Verification Plan

Post-apply checks:

- `promoted_count = 11`
- `remaining_unresolved_col1 = 0`
- `live_gvid_collision_count = 0`
- active identity total unchanged
- candidate identity rows preserved
- promoted rows match expected `GV-PK-COL-*`
- route lookup by `gv_id` resolves for all promoted rows

## Post-Apply State

Live apply results:

- `promoted_count = 11`
- `remaining_unresolved_col1 = 0`
- `live_gvid_collision_count = 0`
- `route_resolvable_candidate_count = 11`
- `active_identity_total = 10613 -> 10613`
- `identity_backed_non_null_gvid_count = 95 -> 106`
- `canonical_set_code_count = 95 -> 95`

Sample promoted rows:

- numeric first: `Clefable / 1 -> GV-PK-COL-1`
- numeric mid: `Groudon / 6 -> GV-PK-COL-6`
- numeric last: `Houndoom / 10 -> GV-PK-COL-10`
- `SL` low: `Dialga / SL2 -> GV-PK-COL-SL2`
- `SL` high: `Suicune / SL11 -> GV-PK-COL-SL11`
