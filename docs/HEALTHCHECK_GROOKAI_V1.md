# Grookai Healthcheck V1

This healthcheck verifies the canonical Supabase project and hard database invariants before any implementation or audit work.

## Environment variables
- `SUPABASE_URL=https://ycdxbpibncqcchqiihfz.supabase.co`
- `SUPABASE_SECRET_KEY=<service-role-key>` (required for PostgREST counts)

## How to run
```powershell
cd C:\grookai_vault
$env:SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
$env:SUPABASE_SECRET_KEY = "<service-role-key>"
pwsh scripts/check_grookai_health.ps1
```

Add `-Json` to get machine-readable output.

## What the script checks
- Extracts `project_ref` from `SUPABASE_URL`.
- Counts via Supabase REST:
  - `card_prints`
  - `sets`
  - `card_print_traits`
  - `price_observations`
  - `card_print_price_curves`
- Compares against canonical invariants:
  - `card_prints >= 40,000`
  - `sets >= 150`
  - `card_print_traits >= 5,000`
  - Pricing tables may be 0 if pricing has not run.

## Interpreting results
- `OK` rows meet the invariant.
- `FAIL` rows block further work. Likely causes:
  - Wrong project_ref (not `ycdxbpibncqcchqiihfz`).
  - Environment not initialized or data missing.
- The script warns when invariants fail.

## If invariants fail
1. Confirm `SUPABASE_URL` matches the canonical project_ref.
2. Verify credentials (service-role key) are for the same project.
3. If you expect a full dataset but counts are low, pause work and fix the environment before continuing.
