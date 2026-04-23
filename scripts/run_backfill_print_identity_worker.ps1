Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

cd C:\grookai_vault

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
}

if (-not $env:SUPABASE_SECRET_KEY) {
  throw "[identity-backfill] SUPABASE_SECRET_KEY is not set."
}

$env:ENABLE_CANON_MAINTENANCE_MODE = 'true'
$env:CANON_MAINTENANCE_MODE = 'EXPLICIT'
$env:CANON_MAINTENANCE_TASK = 'backend/infra/backfill_print_identity_worker.mjs'

node .\backend\maintenance\run_canon_maintenance_v1.mjs

