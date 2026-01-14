# NO-DRIFT SCANNER + CONDITION — PHASE 0 PLAN

Status: Planned (contract-first path); Branch `web/mvp`, commit `cfd87c5`

## Audit Findings — Legacy Scans Table
- `public.scans` columns: `id`, `vault_item_id`, `images`, `device_meta`, `score`, `label`, `confidence`, `defects`, `created_at`, `user_id`.
- Trigger: `trg_scans_set_auth_uid` BEFORE INSERT.
- RLS: enabled with user-bound SELECT/INSERT/UPDATE/DELETE (not immutable).
- Violations: UPDATE/DELETE allowed; `label`/`score` persist grades/bands.
- Status: **QUARANTINED (legacy; do not use).**

## Phase 0 Storage Plan — Immutable Snapshots Table (Planned)
- Placeholder table: `condition_snapshots` (or `vault_condition_snapshots` per naming conventions).
- Invariants: append-only INSERT, no UPDATE/DELETE; no stored grade/band columns; store confidence, scan_quality, defects, measurements as raw observations; optional `fingerprint_id` in Phase 0 (required in Phase 2); link to `vault_item_id` and `user_id`; store image pointers/metadata only.
- Governance: schema/policies will be introduced later via migration under Baseline V1 + contract view/shape controls; policies will enforce immutability.

## Next Single-Step Start Point
1) **Design Snapshot Schema (contract-level only):** define JSON shapes and invariants for `condition_snapshots` (append-only, no grade/band storage, raw observation fields). This precedes UI to prevent storage drift.
2) **Design Scan Flow screens:** route/screen design follows after the storage contract is locked.

## Legacy Cleanup Note
- `condition_label` / `condition_score` in legacy UI are non-compliant; deprecate/remove when Phase 0 ships (no code changes here).
