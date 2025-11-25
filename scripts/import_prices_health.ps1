Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location 'C:\grookai_vault'

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co'
}

if (-not $env:SUPABASE_SECRET_KEY) {
  throw 'Missing SUPABASE_SECRET_KEY environment variable.'
}

node .\scripts\backend\import_prices_health.mjs

