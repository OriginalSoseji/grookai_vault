# XY6_COMPLETE_VERIFICATION_V2

Status: Passed
Type: Final Verification Checkpoint
Scope: `xy6`
Date: 2026-04-11

## Context
All `xy6` execution phases are complete:
- base-variant collapse
- exact-token precedence collapse
- post-normalization drift repair v2

This checkpoint is the read-only closure proof for the set after the canonical name repair.

## Verification Results
- `unresolved_count = 0`
- `duplicate_parent_count = 0`
- `active_identity_violations = 0`
- `card_print_identity_orphans = 0`
- `card_print_traits_orphans = 0`
- `card_printings_orphans = 0`
- `external_mappings_orphans = 0`
- `vault_items_orphans = 0`
- `normalization_drift_count = 0`
- `token_consistency_violations = 0`
- `canonical_count = 112`

## Exact-Token Precedence Validation
- `GV-PK-ROS-77` exists:
  - `8ad97482-9c74-4ae2-b08f-ea15fa92077e / Shaymin-EX / 77`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- `GV-PK-ROS-77A` exists:
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin-EX / 77a`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- Both rows remain distinct canonical entries.
- The exact-token precedence collapse remains intact after repair, and the V2 normalization pass corrected the residual canonical drift on `GV-PK-ROS-77A` without mutating identity ownership.

## Invariants Confirmed
- no unresolved `xy6` parents remain
- no duplicate canonical rows exist under `(number_plain, variant_key)`
- every canonical `xy6` parent has at most one active identity row
- no FK orphans exist on any checked dependent table
- token consistency holds across the set
- canonical name normalization is fully applied
- exact-token versus suffix precedence remains preserved without collapsing the `77a` canonical row

## Final State
`xy6` is fully canonical and formally closed.

The residual punctuation-drift surface identified in V1 has been repaired:
- `GV-PK-ROS-77A / Shaymin-EX / 77a`

No unresolved rows remain, no integrity violations were introduced, and the set now satisfies the full closure contract.
