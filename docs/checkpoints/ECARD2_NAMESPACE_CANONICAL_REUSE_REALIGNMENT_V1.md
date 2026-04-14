# ECARD2_NAMESPACE_CANONICAL_REUSE_REALIGNMENT_V1

Status: COMPLETE
Type: Apply Artifact
Scope: Reuse the 13 pre-existing `GV-PK-AQ-*` canonical targets for `ecard2` and realign dependent rows without creating new canonical rows
Date: 2026-04-11

## Context
`ECARD2_NAMESPACE_COLLISION_CONTRACT_AUDIT_V1` proved that the remaining numeric `AQ` namespace rows are not new identities.

Locked audit result:
- `namespace_collision_row_count = 13`
- `classification = IDENTITY_EQUIVALENT_NAMESPACE_COLLISION`
- `safe_resolution_type = REUSE_CANONICAL`

This artifact resolves that surface by reusing the already-existing canonical rows and deleting only the duplicate unresolved parents after all dependent data is realigned.

## Reuse Proof
Bounded live scope:
- `set_code_identity = 'ecard2'`
- `source_count = 13`
- source tokens:
  - `11`
  - `12`
  - `13`
  - `15`
  - `16`
  - `17`
  - `18`
  - `19`
  - `20`
  - `25`
  - `28`
  - `30`
  - `32`

Each source row maps to exactly one existing canonical target:
- same `set_id`
- same printed name
- same `number_plain`
- same `variant_key`
- same occupied `GV-PK-AQ-*` namespace

No new canonical row is lawful or required.

## Apply Results
Observed apply-scope movement:
- `card_print_identity`: repointed `13`
- `card_print_traits`: inserted `13`, deleted old `13`
- `card_printings`: merged metadata on `26` finish collisions, moved unique `0`, deleted redundant `26`
- `external_mappings`: repointed `13`
- `vault_items`: repointed `0`
- old unresolved parents deleted: `13`

Observed preconditions:
- `total_unresolved_count_before = 23`
- `source_count = 13`
- `out_of_scope_unresolved_count = 10`
- `canonical_target_count_before = 184`
- target-side active identities before apply: `0`

## Invariants Preserved
- canonical `card_prints` rows remain the same rows
- no new canonical rows are created
- no `gv_id` value changes
- the 11 already promoted rows remain untouched
- the 10 blocked rows remain untouched
- no cross-set mapping occurs

## Risks
- mapping drift if a row outside the 13-row numeric surface enters scope
- unexpected FK usage outside the supported five-table inventory
- unexpected target-side identity rows appearing before apply
- non-deterministic dependent-row merge if target-side overlaps are no longer metadata-only

## Verification Targets
The apply proved:
- `reuse_count = 13`
- `remaining_namespace_collision_rows = 0`
- `remaining_unresolved_rows = 10`
- canonical count unchanged: `184 -> 184`
- no new canonical rows created
- no `gv_id` changes
- FK integrity preserved

## Sample Rows
- `Espeon / 11 -> GV-PK-AQ-11`
- `Exeggutor / 12 -> GV-PK-AQ-12`
- `Exeggutor / 13 -> GV-PK-AQ-13`

Each sampled target ended with:
- `1` active identity row
- `1` trait row
- `2` printing rows
- `3` external mapping rows
