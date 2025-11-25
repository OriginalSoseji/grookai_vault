Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

cd C:\grookai_vault

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
}

if (-not $env:SUPABASE_SECRET_KEY) {
  throw "[pricing-worker] SUPABASE_SECRET_KEY is not set."
}

node .\backend\pricing\import_prices_worker.mjs

