# ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1

Status: BLOCKED
Type: Promotion Apply Attempt
Scope: Requested 24-row `ecard2` exact-token promotion surface
Date: 2026-04-11

## Context
The prior `ecard2` lane audit proved:
- `PROMOTION_REQUIRED = 24`
- `BASE_VARIANT_COLLAPSE = 0`
- `BLOCKED_CONFLICT = 10`
- `UNCLASSIFIED = 0`

This codex requested one collision-free apply artifact across all `24` promotion rows.

## Dry-Run Proof
Live proof under this codex:
- `promotion_source_count = 24`
- `collision_count = 13`
- `duplicate_proposed_key_count = 0`
- `blocked_overlap_count = 0`

The requested surface therefore fails its own hard gate:
- every promotion row must be collision-free

Only `11` rows are actually collision-free.

## Why The Codex Is Blocked
The 24 promotion rows split into:
- `PROMOTION_READY = 11`
- `PROMOTION_NAMESPACE_COLLISION = 13`

The collided rows already have live `GV-PK-AQ-*` occupants.

Representative collided rows:
- `Espeon / 11 -> GV-PK-AQ-11`
- `Exeggutor / 12 -> GV-PK-AQ-12`
- `Kingdra / 19 -> GV-PK-AQ-19`
- `Scizor / 32 -> GV-PK-AQ-32`

Audit proof on the occupancies:
- `set_code = null`
- `set_id` matches the `ecard2` family
- `active_identity_count = 0`

This is a namespace-stranding surface, not a collision-free promotion surface.

## What Still Passed
The requested promotion subset is otherwise clean:
- `promotion_source_count = 24`
- `duplicate_proposed_key_count = 0`
- `blocked_overlap_count = 0`
- `blocked_scope_count = 10`

FK readiness snapshot for the 24 promotion rows:
- `card_print_identity = 24`
- `card_print_traits = 24`
- `card_printings = 41`
- `external_mappings = 24`
- `vault_items = 0`

The 10 blocked rows remained out of scope.

## Invariants Preserved
- no blocked row was mutated
- no `gv_id` was assigned
- no existing canonical row was rewritten
- no schema change occurred
- no cross-set mutation occurred

## Runner Behavior
The created runner is fail-closed:
- `--dry-run` audits the exact 24-row requested scope
- `--dry-run` emits the proposed promotion map and the 13 live collisions
- `--dry-run` stops on the hard gate
- `--apply` rechecks the same gates and will not mutate while they fail

No apply was performed under this codex.

## Risks
- treating the 13 occupied `GV-PK-AQ-*` rows as collision-free would corrupt canonical ownership
- silently converting this artifact into namespace realignment would violate the codex boundary
- broadening the scope beyond the audited subset would mix promotion with stranded-canonical repair

## Corrected Next Lawful Unit
This codex is blocked as written.

The corrected next lawful execution unit is:

`ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2`

with corrected scope:
- only the `11` rows in `PROMOTION_READY`
- exclude the `13` `PROMOTION_NAMESPACE_COLLISION` rows
- keep the `10` `BLOCKED_CONFLICT` rows untouched

Separate follow-up after that:
- `ECARD2_NAMESPACE_COLLISION_REALIGNMENT_AUDIT_V1`

## Result
The requested 24-row apply artifact was not lawful on live data.

Formal live outcome:
- `promotion_source_count = 24`
- `collision_count = 13`
- `duplicate_proposed_key_count = 0`
- `blocked_overlap_count = 0`
- mutation performed = `0`
