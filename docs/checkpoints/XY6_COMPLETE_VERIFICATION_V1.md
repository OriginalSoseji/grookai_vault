# XY6_COMPLETE_VERIFICATION_V1

Status: Failed
Type: Final Verification Checkpoint
Scope: `xy6`
Date: 2026-04-10

## Context
All `xy6` execution phases are complete:
- base-variant collapse
- exact-token precedence collapse

This checkpoint is the read-only closure proof for the set.

## Verification Results
- `unresolved_count = 0`
- `duplicate_parent_count = 0`
- `active_identity_violations = 0`
- `card_print_identity_orphans = 0`
- `card_print_traits_orphans = 0`
- `card_printings_orphans = 0`
- `external_mappings_orphans = 0`
- `vault_items_orphans = 0`
- `normalization_drift_count = 1`
- drift row:
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin EX / 77a / GV-PK-ROS-77A`
- `token_consistency_violations = 0`
- `canonical_count = 112`

## Exact-Token Precedence Validation
- `GV-PK-ROS-77` exists:
  - `8ad97482-9c74-4ae2-b08f-ea15fa92077e / Shaymin-EX / 77`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- `GV-PK-ROS-77A` exists:
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin EX / 77a`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- Both rows remain distinct canonical entries.
- The exact-token precedence collapse resolved the blocked source to `GV-PK-ROS-77` without mutating `GV-PK-ROS-77A`.

## Invariants Confirmed
- no unresolved `xy6` parents remain
- no duplicate canonical rows exist under `(number_plain, variant_key)`
- every canonical `xy6` parent has at most one active identity row
- no FK orphans exist on any checked dependent table
- token consistency holds across the set
- exact-token versus suffix precedence was applied without collapsing the `77a` canonical row

## Failure Condition
Closure failed because one canonical row still matches the punctuation-drift audit:
- `Shaymin EX / 77a / GV-PK-ROS-77A`

Under the current verification contract, canonical rows containing `% EX%` are treated as residual normalization drift.

## Risks Checked
- unintended suffix override during the final single-row collapse
- incorrect canonical selection between `77` and `77a`
- hidden duplicate identity keys
- orphaned dependencies after the final collapse
- residual punctuation drift on canonical rows

## Final State
`xy6` is not yet formally closed under the current verification contract.

The set is operationally resolved on unresolved rows, but closure is blocked by one remaining canonical punctuation-drift surface:
- `GV-PK-ROS-77A / Shaymin EX / 77a`
