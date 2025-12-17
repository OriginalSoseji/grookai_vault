# ✅ PREFLIGHT GATE V1 (MECHANICAL ENFORCEMENT)

This document defines a mechanical gate that must be satisfied before running any **destructive** Grookai Vault worker locally.

Destructive means:
- Writes to canonical tables
- Modifies identity fields
- Alters mappings
- Moves or promotes images
- Writes pricing aggregates / active prices
- Performs backfills or normalizations

This gate exists to prevent assumption-driven runs and irreversible damage.

---

## 1) REQUIRED PREFLIGHT CHECKS

Before any destructive worker run:

1. Identify worker + scope (set_code / set_id / job_id)
2. Freeze current state (snapshot, query, or view output)
3. Verify schema + constraints involved
4. Prove data presence (sample rows)
5. Confirm contract alignment (must reference CONTRACT_INDEX)

If any check cannot be proven:
STOP and audit.

---

## 2) MECHANICAL ACKNOWLEDGEMENT

To run a destructive worker locally, the user MUST set an explicit acknowledgement flag:

Environment variable:

GROOKAI_PREFLIGHT_ACK=1

If the variable is not set, the run must be blocked.

---

## 3) HOW TO USE

PowerShell examples:

# Blocked (default)
node backend/<path-to-worker>.mjs --dry-run

# Allowed (explicit)
$env:GROOKAI_PREFLIGHT_ACK="1"
node backend/<path-to-worker>.mjs --dry-run
Remove-Item Env:\GROOKAI_PREFLIGHT_ACK

---

## 4) WORKER ADOPTION (PATTERN)

Workers should adopt a shared helper check at process start:

- If destructive AND not dry-run:
  - require GROOKAI_PREFLIGHT_ACK=1
- For dry-run:
  - allowed without ACK (unless the worker performs writes even in dry-run)

This is an incremental adoption pattern. Not all workers must be updated in this step.

---

## 5) GOVERNANCE

This gate is part of the Guardrails and is enforceable.

Any bypass is treated as a defect.

---
