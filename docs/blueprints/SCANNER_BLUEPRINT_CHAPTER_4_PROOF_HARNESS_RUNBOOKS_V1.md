# Chapter 4 — Proof Harness & Runbooks (link: [Index](SCANNER_BLUEPRINT_BOOK_INDEX_V1.md))

## SCAN_REPLAY_HARNESS_CONTRACT_V1
- Deterministic replay of capture → upload → snapshot insert → analysis read.
- Must log auth target, header presence, slot manifests, and resulting snapshot_id.
- Fixtures stored with hashes; no secrets in logs.

## MEASUREMENT_TUNING_RUNBOOK_V1
- Procedure to tune measurement parameters (e.g., centering thresholds) using fixed fixtures.
- Steps: normalize → measure → compare vs baseline → record deltas → publish tuning note.
- All changes gated by Measurement Expansion Gate (Chapter 5).

## EDGE_FUNCTION_CONFIG_PRECEDENCE_RUNBOOK_V1
- Clarifies precedence: function-level `config.toml` overrides global `supabase/config.toml`; environment must match target project.
- Checklist: verify env vars, verify deploy target, confirm `verify_jwt` and headers behavior.

## SCAN_FAILURE_CLASSIFICATION_CONTRACT_V1
- Standard failure codes and descriptions; aligns with `analysis_status/failure_reason`.
- Requires tagging failures with reproducible evidence (logs, inputs).

## DEBUG_MODE_CONTRACT_V1
- Debug flags must be explicit (`debug: true`), never default.
- Debug payloads must not leak tokens; use prefixes only.
- Debug paths must not write to DB.

## DETERMINISM_VALIDATION_RUNBOOK_V1
- Run measurement/analysis twice with same inputs → identical outputs and `analysis_key`.
- Store proof artifacts in runbook notes; flag any nondeterminism for remediation.

## References
- See `docs/playbooks/JWT_INVALID_EDGE_FUNCTIONS_PLAYBOOK_V1.md` for JWT troubleshooting steps.
# Chapter 4 — Proof Harness & Runbooks (V1)

**Status:** LOCKED (inherits Blueprint V1 lock)  
**Backlink:** [Book Index](./SCANNER_BLUEPRINT_BOOK_INDEX_V1.md)

This chapter defines the proof harnesses and operational runbooks required before any scanner change ships.

---

## 4.1 SCAN_REPLAY_HARNESS_CONTRACT_V1
- Deterministic replay of capture → upload-plan → PUT → snapshot insert → analysis read.
- Logs must include: env target, auth header presence (no secrets), slot manifest, snapshot_id.
- Fixtures: store bytes + hash; replay must match hashes.
- Hard stop: any mismatch between replay runs or missing auth header aborts.

## 4.2 MEASUREMENT_TUNING_RUNBOOK_V1
- Steps: normalize fixtures → run measurement → compare to baseline → record deltas → publish tuning note.
- Gate: Measurement Expansion Gate (Chapter 5) must be satisfied before merging.
- Evidence: before/after metrics, determinism check, rollback note.

## 4.3 EDGE_FUNCTION_CONFIG_PRECEDENCE_RUNBOOK_V1
- Precedence: function-level `config.toml` > global `supabase/config.toml`.
- Checks: env vars present (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), `verify_jwt` expected value, headers include bearer + apikey.
- Reference: `docs/playbooks/JWT_INVALID_EDGE_FUNCTIONS_PLAYBOOK_V1.md` for JWT troubleshooting.

## 4.4 SCAN_FAILURE_CLASSIFICATION_CONTRACT_V1
- Standard failure codes aligned to `analysis_status` / `failure_reason`.
- Each failure must include reproducible evidence (inputs, logs, code version).
- No silent degradation; failures are valid outcomes.

## 4.5 DEBUG_MODE_CONTRACT_V1
- Debug must be explicit (`debug: true`), never default.
- Debug payloads cannot leak secrets; only prefixes/hints allowed.
- Debug paths must not write to DB/storage.

## 4.6 DETERMINISM_VALIDATION_RUNBOOK_V1
- Run measurement/analysis twice with identical inputs → identical outputs and `analysis_key`.
- Store proof artifacts (hashes, outputs, env targets).
- Any nondeterminism triggers bug fork; no release until resolved.
