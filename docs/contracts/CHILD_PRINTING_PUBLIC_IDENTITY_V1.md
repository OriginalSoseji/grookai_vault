# Child Printing Public Identity V1

Status: Draft contract for governed rollout.

## Purpose

`CHILD_PRINTING_PUBLIC_IDENTITY_V1` defines a stable public identity layer for independently ownable child printings such as Reverse Holo, Holo, Poké Ball, and Master Ball. It does not replace parent card identity and does not change Species Dex denominators.

## Identity Layers

Parent print identity:

- source column: `public.card_prints.gv_id`
- meaning: canonical parent print identity
- route status: remains the default public card route identity
- mutation rule: this contract must not change existing parent `gv_id` values or format

Child printing identity:

- proposed source column: `public.card_printings.printing_gv_id`
- meaning: finish-specific public identity for a child printing under a parent print
- route status: no public child printing routes in V1
- rollout rule: nullable during rollout and assigned only after audit approval

## Proposed ID Shape

Format:

```text
<parent_gv_id>-<finish_suffix>
```

Examples:

```text
GV-PK-SV035-025-RH
GV-PK-SV035-025-HOLO
GV-PK-SV035-025-PB
GV-PK-SV035-025-MB
```

The dry-run must prove that generated child IDs do not collide with each other and do not collide with existing parent `card_prints.gv_id` values.

## Finish Suffix Mapping

| finish_key | suffix | display label |
| --- | --- | --- |
| `normal` | `STD` | Normal |
| `holo` | `HOLO` | Holo |
| `reverse` | `RH` | Reverse Holo |
| `pokeball` | `PB` | Poké Ball |
| `masterball` | `MB` | Master Ball |

IDs must not use spaces, punctuation from labels, or localized display text.

## Eligibility Rules

A child printing public ID is required when the child printing can be:

- owned independently
- counted for master-set progress
- traded or sold independently
- priced independently
- linked directly in a later approved route contract

A child printing public ID is not required in V1 for a child row that is provisional, lacks parent identity, uses an unsupported finish key, collides with another proposed ID, or crosses a parent variant boundary needing manual review.

## Boundary Rules

- Parent `card_prints.gv_id` remains the card-level public identity.
- `printing_gv_id` is a subordinate child identity and must always derive from the parent `gv_id`.
- Species Dex completion stays parent-print based.
- Master-set option identity may use child `printing_gv_id` only after assignment is audited and applied.
- Parent-level variants must not be collapsed into child printings.
- Scanner logic is out of scope.
- Public child printing routes are out of scope for V1.

## Candidate Classifications

Dry-run candidates must be classified as one of:

- `APPROVED_CANDIDATE`
- `BLOCKED_PARENT_MISSING_GV_ID`
- `BLOCKED_UNKNOWN_FINISH_KEY`
- `BLOCKED_PROPOSED_ID_COLLISION`
- `BLOCKED_PARENT_VARIANT_BOUNDARY`
- `BLOCKED_REFERENCED_ROW_REQUIRES_MANUAL_REVIEW`

Rows with active ownership or pricing references are blocked for manual review in this phase so user-facing references receive explicit priority before IDs are assigned.

## Schema Direction

Preferred nullable schema:

```sql
alter table public.card_printings
add column printing_gv_id text;

create unique index card_printings_printing_gv_id_key
on public.card_printings(printing_gv_id)
where printing_gv_id is not null;
```

Column comment:

```text
Finish-specific public Grookai identity for child printings.
Parent card_prints.gv_id remains the parent print identity.
Nullable during governed rollout.
```

V1 must not make `printing_gv_id` required.

## App Read Model

App/server helpers may read `printing_gv_id` when the column exists. Until the schema is applied, they must degrade safely and continue using internal `card_printing_id` for non-public actions.

UI rules:

- never show raw UUIDs as public identity
- use parent card routes as the default route
- include `printing_gv_id` in selector data only when present
- do not enable child public routes in V1

## Verification Requirements

Before any write:

- dry-run candidate generation completes
- collision count is zero
- parent `gv_id` collision count is zero
- blocked candidates are documented
- write plan is reviewed

After any future write:

- assigned `printing_gv_id` values are unique
- assigned IDs derive from parent `gv_id`
- parent `gv_id` values are unchanged
- Species Dex denominator remains parent-print based
- no public child route is enabled without a separate route contract
