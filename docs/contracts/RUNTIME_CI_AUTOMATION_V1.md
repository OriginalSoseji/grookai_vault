# RUNTIME_CI_AUTOMATION_V1

Status: Active runtime support document

## Current CI Gates

### Drift Gate

- Workflow: `.github/workflows/contracts-drift-gate.yml`
- Runs automatically on push / pull request for contracts/runtime-related paths
- Requires `SUPABASE_DB_URL`
- Executes: `npm run contracts:drift-audit`

### Focused Runtime Protection

- Workflow: `.github/workflows/contracts-runtime-protection.yml`
- Runs automatically on push / pull request for contracts/runtime-related paths
- Executes:
  - `npm run contracts:runtime-health`
  - `npm run contracts:test`

## Local Fallback

If CI is unavailable, the minimum local gate is:

1. `npm run grookai:preflight`
2. `npm run contracts:test`

## Rule

Critical drift must be checked automatically before deploy.
Focused runtime health and tests should also run automatically in CI because they do not require canon-mutating execution.
