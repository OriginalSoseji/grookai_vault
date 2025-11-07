# Production-First Audit - 2025-11-06 21:55:55Z

## TODAY change summary
# What Changed Today

Generated: 2025-11-06 21:55:54Z

No commits since today 00:00.

## STAGING results
SKIPPED: staging-probe.yml not found
RPC: HTTP N/A
VIEW: HTTP N/A

## PROD results
RPC: HTTP 200
VIEW: HTTP 200

## Verdict
Insufficient data; re-run probes.

## Next steps
- Re-run probes: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_first_audit.ps1
- Apply _hold/20251106_wall_feed_expose.sql to PROD: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_apply_expose.ps1
- Open WHAT_CHANGED_TODAY.md for exact diffs: reports\\prod_audit_*\\WHAT_CHANGED_TODAY.md
