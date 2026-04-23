# DRIFT_AUDIT_GATE_V1

Status: Active runtime support document

## Goal

Critical drift must block progression before deploy or preflight.

## Gate Definition

- Runner: `scripts/contracts/run_drift_audit_v1.mjs`
- Query source: `scripts/contracts/drift_audit_v1.sql`
- Local preflight command: `node scripts/contracts/run_drift_audit_v1.mjs`
- CI gate: `.github/workflows/contracts-drift-gate.yml`

## Severity Mapping

The runner emits these normalized categories:

- `critical_fail`
  - blocks local preflight
  - blocks CI
  - returns non-zero exit code
- `known_deferred_debt`
  - does not block by itself
  - remains visible in output
- `informational`
  - does not block
  - remains visible in output

Underlying SQL buckets are normalized like this:

| SQL bucket | Runner category | Gate behavior |
| --- | --- | --- |
| `critical_enforce_now` | `critical_fail` | block |
| `unexpected_regression` | `critical_fail` | block |
| `deferred_known_debt` | `known_deferred_debt` | warn only |
| anything else | `informational` | warn only |

## Required Environment

- `SUPABASE_DB_URL` must be present.
- The contract runtime migration must already be applied in the target database, otherwise the audit will correctly fail on missing runtime tables/triggers.

## Operational Rule

No production-safe runtime pass exists if critical drift can be ignored.

That means:

- local preflight must fail on `critical_fail`
- CI must fail on `critical_fail`
- deferred debt stays visible but does not impersonate an unexpected regression

## Current Scope

The gate currently checks:

- runtime evidence tables exist
- append-only triggers exist
- active identity uniqueness
- missing identity debt
- missing `gv_id` debt
- external mapping duplicate/orphan drift
- warehouse staging founder-approval drift
- wall membership owner drift
- quarantine/view leakage
- stabilization-critical compatibility view existence

## Limit

The gate detects drift; it does not repair it. Repair remains an explicit governed flow.
