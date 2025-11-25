# Option C — Readiness Check

## CI repository
- **Name:** OriginalSoseji/grookai-ci
- **Exists:** No ❌
- **Private:** No ❌
- **gh installed:** Yes (`$gh --version` ok) ✅
- **gh authed:** Yes ✅

## Actions configuration (CI repo)
- **Expected:** Read & write (so artifact/status steps work)

## Required secrets (CI repo)
- **SUPABASE_ACCESS_TOKEN:** Unknown ⚠️ (cannot list)
- **PROD_SUPABASE_URL:** Unknown ⚠️ (cannot list)
- **PROD_PUBLISHABLE_KEY:** Unknown ⚠️ (cannot list)
- **BRIDGE_IMPORT_TOKEN:** Unknown ⚠️ (cannot list)

## Legacy workflows (app repo) — expected disabled
- .github/workflows/auto-align-import-prices-bridge.yml → Not found
- .github/workflows/kick-auto-align-bridge.yml → Not found
- .github/workflows/prod-import-prices-validate.yml → Not found
- .github/workflows/prod-import-prices-validate-pub.yml → Not found
- Flutter Build APK → Not found
- Flutter CI → Not found

## Optional to disable (recommended)
- Prod Import-Prices Validate (EDGE - bridge-only) → Not found
- Release (Android APK) → Not found

## Kept active (read-only/hygiene)
- CI → Not found
- .github/workflows/quality.yml → Not found
- .github/workflows/ci-guard-keys.yml → Not found
- Edge Functions Audit → Not found
- Prod Probe (read-only) → Not found
- Staging Probe (read-only) → Not found
- .github/workflows/prod-edge-probe.yml → Not found

## First function target
- **Function slug:** import-prices
- **FN URL:** https://ycdxbpibncqcchqiihfz.functions.supabase.co/import-prices
- **PRJ URL:** <set PROD_SUPABASE_URL>/functions/v1/import-prices

## Verification plan (artifacts-only)
- The CI workflow will **upload an artifact** named `import-prices-auto-validate` containing:
  - `reports/ci_logs/latest/sixline.txt`
  - `reports/ci_logs/latest/attempts.txt`
- We will **not** push proofs to the app repo.

