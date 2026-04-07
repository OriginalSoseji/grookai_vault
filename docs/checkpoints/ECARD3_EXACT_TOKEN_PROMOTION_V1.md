# ECARD3_EXACT_TOKEN_PROMOTION_V1

## Context

`ecard3` is a mixed-lane identity family under `ECARD3_IDENTITY_CONTRACT_V1`. Exact printed token is canonical, so both numeric tokens and holo `H#` tokens must be promoted without coercion.

This phase promotes unresolved `ecard3` parents in place by assigning `GV-PK-SK-*` to the existing `card_prints.id` rows.

## Proof Of Promotion Safety

Locked audit proof before apply:

- `candidate_count = 15`
- `valid_token_count = 15`
- `numeric_token_count = 4`
- `holo_token_count = 11`
- `collapse_candidate_count = 0`
- `same_token_different_name_count = 0`
- `multiple_match_old_count = 0`
- `promotion_live_collision_count = 0`

This proves the remaining `ecard3` surface is a pure exact-token promotion subset.

## Token Preservation Rule

`buildCardPrintGvIdV1` is the source of truth for this phase and emits:

- `GV-PK-SK-4`
- `GV-PK-SK-9`
- `GV-PK-SK-H13`
- `GV-PK-SK-H31`

The runner preserves the full printed token exactly. No numeric coercion, no `H` stripping, no suffix generation, and no descriptor logic enters scope.

## Namespace Validation

Promotion hard gates require:

- zero invalid tokens
- zero duplicate printed tokens inside the candidate pool
- zero exact-token canonical overlaps
- zero same-token different-name conflicts
- zero internal proposed `gv_id` collisions
- zero live `card_prints.gv_id` collisions

## Apply Method

The runner updates only `card_prints.gv_id` on the existing unresolved `ecard3` parents:

```sql
update card_prints
set gv_id = <derived_gv_id>
where id = <card_print_id>
  and gv_id is null;
```

No inserts, deletes, or identity reassignments occur in this phase.

## Risks And Mitigation

- Candidate drift: hard gate on `candidate_count = 15`.
- Token drift: hard gate on exact token validation.
- Namespace collision: dry-run derives every proposed `GV-PK-SK-*` and checks live collisions before apply.
- Partial apply risk: one transaction with rollback on any mismatch.

## Verification Plan

Post-apply checks:

- `promoted_count = 15`
- `remaining_unresolved_ecard3 = 0`
- `live_gvid_collision_count = 0`
- active identity total unchanged
- candidate identity rows preserved
- promoted rows match expected `GV-PK-SK-*`
- route lookup by `gv_id` resolves for all promoted rows

## Post-Apply State

Live apply results:

- `promoted_count = 15`
- `remaining_unresolved_ecard3 = 0`
- `live_gvid_collision_count = 0`
- `route_resolvable_candidate_count = 15`
- `active_identity_total = 10613 -> 10613`
- `identity_backed_non_null_gvid_count = 12 -> 27`
- `canonical_set_code_count = 171 -> 171`

Sample promoted rows:

- numeric: `Articuno / 4 -> GV-PK-SK-4`
- holo low: `Kabutops / H13 -> GV-PK-SK-H13`
- holo high: `Vaporeon / H31 -> GV-PK-SK-H31`
