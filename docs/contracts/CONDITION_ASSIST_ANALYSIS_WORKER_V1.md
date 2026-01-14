# CONDITION_ASSIST_ANALYSIS_WORKER_V1 — Contract

Status: ACTIVE (LOCKED DRAFT v1) • Lane: Backend Highway

Governing contracts: GROOKAI_GUARDRAILS, NO_ASSUMPTION_RULE, GROOKAI_FINGERPRINT_CONDITION_CONTRACT_V1, NO_DRIFT_SCANNER_CONDITION_PHASE0_PLAN, GV_SCHEMA_CONTRACT_V1

## 1 Purpose
Define the deterministic rules for the Condition Assist Analysis Worker that reads snapshot metadata and writes analysis results without mutating source snapshots or storing grades/bands.

## 2 Inputs
- Required: `condition_snapshot_id` (UUID) belonging to the authenticated/user scope enforced by RLS.
- Optional: analysis payload (e.g., defects, measurements, quality metrics) supplied via job payload or task runner; must be raw observations only.
- Storage context: image paths already resident in bucket `condition-scans` under prefix `{user_id}/{vault_item_id}/{snapshot_id}/{slot}.jpg`.

## 3 Storage Path Rules (Hard)
- Read-only from bucket `condition-scans`.
- Prefix must match `{auth.uid()}/{vault_item_id}/{snapshot_id}/{slot}.jpg`.
- Slots allowed: `front`, `back`, `corner_tl`, `corner_tr`, `corner_bl`, `corner_br`.
- Worker must never list the bucket; only access paths explicitly provided by the snapshot record.

## 4 Outputs (Raw-only; No grades)
- Writes to append-only table: `condition_snapshot_analyses`.
- Fields must capture raw measurements/observations only (e.g., quality scores, defect JSON, confidence values, timing/engine metadata).
- Prohibited: any grade/band labels or derived condition tiers.

## 5 Write Rules (Append-only compliance)
- Only INSERT into `condition_snapshot_analyses`.
- Never UPDATE or DELETE rows in `condition_snapshot_analyses`.
- Never UPDATE or DELETE rows in `condition_snapshots`.
- Foreign keys: reference `condition_snapshots.id` (and `user_id` where applicable) without mutating the parent row.

## 6 Idempotency & Re-run Policy
- Idempotency key: `condition_snapshot_id` + `analysis_run_id` (or equivalent job/run discriminator) to prevent duplicate logical work.
- Re-runs must create a new row (new run id) without altering or deleting prior analysis rows.
- If the same snapshot is processed twice with the same run id, the second attempt must be rejected or no-op to preserve append-only semantics.

## 7 Failure Policy (Deterministic)
- On input validation failure: return/record a deterministic error code and do not write any analysis row.
- On storage fetch failure (missing/forbidden): return/record `storage_unavailable` without partial writes.
- On downstream model/service failure: return/record `analysis_failed` with engine metadata; do not mutate prior rows.
- Partial writes are forbidden; use atomic INSERT or fail the run.

## 8 Security Rules
- Enforce user scoping via RLS: worker must operate under a role constrained to `user_id = auth.uid()` for reads.
- No bypass of storage RLS; use signed URLs scoped to the caller’s prefix only.
- Never expose public URLs; only signed URLs with bounded expiry.

## 9 Observability
- Structured logs must include: `condition_snapshot_id`, `user_id`, `vault_item_id` (if available), `analysis_run_id`, outcome code, and duration.
- Metrics: count successes/failures per run id; surface rate of storage_denied / not_found / analysis_failed.

## 10 Versioning & Forward Compatibility
- Contract version: V1 (locked). Changes require a version bump and index update.
- Future fields must be additive only; existing columns must remain immutable.
- Any new analysis engines must adhere to append-only and no-grade rules.

## 11 Non-goals
- No grade/band assignment.
- No price estimation.
- No mutation of `condition_snapshots` or storage objects.
- No bucket listings or cross-user access.

## 12 Acceptance Criteria
- Given a valid snapshot owned by the user, the worker writes exactly one new row to `condition_snapshot_analyses` per unique run id, containing raw observation data and metadata, without modifying existing rows or snapshots.
- Given invalid or unauthorized inputs, the worker writes nothing and emits a deterministic error outcome.

Lock Statement: This contract is LOCKED DRAFT v1. Any change requires an explicit audit, version bump, and CONTRACT_INDEX.md update.
