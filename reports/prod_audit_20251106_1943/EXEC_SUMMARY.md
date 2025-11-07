# Production-First Audit - 2025-11-06 19:43:57Z

## TODAY change summary
# What Changed Today

Generated: 2025-11-06 19:43:56Z

No commits since today 00:00.

## STAGING results
RPC: HTTP N/A
VIEW: HTTP N/A
ERROR: The property 'Matches' cannot be found on this object. Verify that the property exists.

## PROD results
RPC: HTTP 404
VIEW: HTTP 404

## Verdict
Insufficient data; re-run probes.

## Next steps
- Re-run probes: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_first_audit.ps1
- Apply _hold/20251106_wall_feed_expose.sql to PROD: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_apply_expose.ps1
- Open WHAT_CHANGED_TODAY.md for exact diffs: reports\\prod_audit_*\\WHAT_CHANGED_TODAY.md
