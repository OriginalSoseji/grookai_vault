# XY3_COMPLETE_VERIFICATION_V1

Status: FAILED
Type: Final Verification Checkpoint
Scope: `xy3`
Date: 2026-04-11

## Context
All `xy3` execution phases are complete:
- base-variant collapse
- exact-token precedence collapse

This checkpoint is the read-only closure audit for the set after the final blocked-row resolution attempt.

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
  - `5862d23e-8526-4055-baf2-cc478ce02ea9 / M Lucario EX / 55a / GV-PK-FFI-55A`
- `token_consistency_violations = 0`
- `canonical_count = 114`

## Exact-Token Precedence Validation
- `GV-PK-FFI-55` exists:
  - `2bc6a250-d786-4719-8a7f-9063489e5d73 / M Lucario-EX / 55`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- `GV-PK-FFI-55A` exists:
  - `5862d23e-8526-4055-baf2-cc478ce02ea9 / M Lucario EX / 55a`
  - `identity_rows = 1`
  - `active_identity_rows = 1`
- Both rows remain distinct canonical entries.
- The exact-token precedence collapse itself is intact.

## Invariants Confirmed
- no unresolved `xy3` parents remain
- no duplicate canonical rows exist under `(number_plain, variant_key)`
- every canonical `xy3` parent has at most one active identity row
- no FK orphans exist on any checked dependent table
- token consistency holds across the set
- exact-token versus suffix precedence remains preserved without collapsing the `55a` canonical row

## Stop Condition Triggered
Verification cannot declare closure because canonical normalization drift still exists:
- `GV-PK-FFI-55A / M Lucario EX / 55a`

This violates the required closure condition:
- `normalization_drift_count = 0`

## Final State
`xy3` is not formally closed under the current verification contract.

Identity resolution is complete, referential integrity is clean, and exact-token precedence is preserved, but residual canonical name drift remains on the suffix row. A targeted post-normalization repair is required before the set can be declared canonical and closed.
