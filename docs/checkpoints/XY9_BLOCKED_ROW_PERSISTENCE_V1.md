# XY9_BLOCKED_ROW_PERSISTENCE_V1

Status: Applied
Set: `xy9`
Target row: `a6d34131-d056-49ae-a8b7-21d808e351f6`

## Context
- The previous persistence attempt was restarted from clean state.
- Scoped file existence was rechecked before work began.
- Result: no prior partial persistence artifacts existed in the three scoped paths.
- Final row classification was already locked as `UNSAFE_SUFFIX_COLLAPSE`.

## Target Row Details
- `row_id = a6d34131-d056-49ae-a8b7-21d808e351f6`
- `name = Delinquent`
- `set_code_identity = xy9`
- `printed_number = 98`
- `gv_id = null`

## Classification
- `UNSAFE_SUFFIX_COLLAPSE`
- Collapse remains unlawful because base token `98` has two suffix-owned canonical targets and no deterministic ownership evidence.

## File Existence Findings
- `backend/identity/xy9_blocked_row_persistence_apply_v1.mjs` did not exist
- `docs/sql/xy9_blocked_row_persistence_dry_run_v1.sql` did not exist
- `docs/checkpoints/XY9_BLOCKED_ROW_PERSISTENCE_V1.md` did not exist

## Schema Field Findings
- Allowed schema check was limited to `public.card_prints` and `public.card_print_identity`
- Checked field names:
  - `identity_status`
  - `status`
  - `resolution_status`
  - `match_status`
  - `blocked_reason`
  - `blocked_at`
  - `is_blocked`
  - `unresolved_reason`
- Result: no lawful existing blocked-status-capable field was present

## Chosen Path
- `PATH_B_NO_STATUS_FIELD`

## Final Persistence Semantics
- no DB mutation is performed
- the row persists as first-class unresolved state through:
  - continued row existence
  - continued `gv_id IS NULL`
  - continued exclusion from known apply-safe execution lanes
- no suffix is assigned
- no canonical mapping is assigned
- no archival occurs

## Invariants Preserved
- target row remains present
- target row remains unresolved
- no `gv_id` assignment
- no other rows modified
- canonical rows untouched
- identity model unchanged
