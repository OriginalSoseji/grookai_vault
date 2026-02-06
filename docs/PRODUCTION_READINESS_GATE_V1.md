# PRODUCTION READINESS GATE V1 (LOCKED)

## 1) Purpose
- Everything built moving forward must be built at the highest production-ready level: observable, diagnosable, safe, and verifiable.

## 2) Applicability
- Applies to: workers, edge functions, DB changes/migrations/views/RPCs, background jobs, client features that affect data, pricing pipelines, ingestion/mapping, condition/fingerprint analysis.
- Exception policy: none by default. If exceptions are needed, they must be explicitly documented as “Temporary Exception” with expiry date and owner.

## 3) Definition of DONE — Production-Ready Minimum Bar (non-negotiable)
- **A) Determinism**
  - Same inputs must yield the same analysis_key (or equivalent deterministic key) and same outputs.
  - Versioning must be explicit (analysis_version / contract version).
- **B) No Silent Failure**
  - Every run must end in exactly one of:
    - Success persisted (results row written), OR
    - Failure persisted (failure row written) with error_code + error_detail.
  - Console-only errors are not acceptable as the only record.
- **C) Observability**
  - Each run must be traceable via:
    - run identifiers (analysis_key, snapshot_id/job_id, version)
    - timestamps
    - stage reached (or comparable breadcrumbs)
  - Logs must be actionable, but DB persistence is the source of truth.
- **D) Safe Writes + Trust Boundaries**
  - Authoritative state writes must be deterministic and audited.
  - Evidence writes must be append-only, non-authoritative.
  - No worker may silently mutate identity-critical fields without a contract and verification queries.
- **E) Replayable Verification**
  - A minimal verification procedure must exist (SQL / script / runbook) to prove:
    - success path
    - failure path
    - idempotency (safe re-run behavior)
  - Verification artifacts must be stored in-repo (docs/playbooks/ or docs/audits/).
- **F) Checkpoint Discipline**
  - Scoped commit message.
  - Tag checkpoints for major behavior additions.
  - Dirty working tree must be quarantined/ignored before commit.

## 4) Required Evidence Artifacts (per change)
- Checklist for PR/commit:
  - Links to verification SQL.
  - Sample DB rows/screenshots (optional).
  - Proof commands executed (git status/diff, node -c if JS).

## 5) Stop Rules (Hard gates)
- If any gate is unmet, stop and implement missing observability/failure persistence before feature work.
- If dry-run indicates potential corruption, stop and run audits per Grookai Method.

## 6) Integration with Existing Method
- This gate is part of Grookai Method and is mandatory across all domains.
