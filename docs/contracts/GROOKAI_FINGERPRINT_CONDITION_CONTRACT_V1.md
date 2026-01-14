# GROOKAI_FINGERPRINT_CONDITION_CONTRACT_V1

Status: Active (Option B — new immutable snapshot table; legacy `public.scans` quarantined)
Scope: Branch `web/mvp`, commit `cfd87c5`

## Audit Findings — Legacy Scans Table
- Table `public.scans` columns: `id uuid NOT NULL`, `vault_item_id uuid NOT NULL`, `images jsonb NOT NULL`, `device_meta jsonb NULL`, `score integer NULL`, `label text NULL`, `confidence numeric NULL`, `defects jsonb NULL`, `created_at timestamptz NULL`, `user_id uuid NULL`.
- Trigger: `trg_scans_set_auth_uid` BEFORE INSERT sets auth uid.
- RLS: enabled; policies allow authenticated users to SELECT/INSERT/UPDATE/DELETE their own rows (`gv_scans_select`, `gv_scans_insert`, `gv_scans_update`, `gv_scans_delete`).
- Drift violations: UPDATE/DELETE permitted ⇒ not immutable; `label`/`score` stored ⇒ violates “no stored grades/bands”.
- Status: **QUARANTINED (legacy; do not use for Phase 0 forward progress).**

## Phase 0 Storage Plan — Immutable Snapshots Table (Planned)
- New table placeholder: `condition_snapshots` (or `vault_condition_snapshots` if naming alignment is required).
- Invariants:
  - Append-only: client-facing role supports INSERT only; no UPDATE/DELETE.
  - No stored grade/band columns; store raw observations only.
  - Capture confidence, scan_quality, defects, and measurements as raw fields (no derived grade/band).
  - Optional `fingerprint_id` (nullable) in Phase 0; becomes required in Phase 2.
- Relationships: ties to `vault_item_id` and `user_id`; stores image pointers/metadata (not binaries).
- Governance: schema and policies to be added via migration after Baseline V1; immutability enforced at the policy layer.

## Legacy Cleanup Note
- `condition_label` / `condition_score` remain in legacy UI surfaces; they must be removed or deprecated when Phase 0 ships (no code changes in this doc).
